import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../../database/schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsGateway } from './notifications.gateway';

interface ListNotificationsResult {
  items: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    payload: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const recipientObjectId = this.toObjectId(payload.recipientId);

    const doc = new this.notificationModel({
      ...payload,
      recipientId: recipientObjectId,
      examId: payload.examId ? this.toObjectId(payload.examId) : undefined,
      certificateId: payload.certificateId
        ? this.toObjectId(payload.certificateId)
        : undefined,
    });

    const created = await doc.save();
    const response = this.toResponseDto(created);

    // Push real-time updates (fire and forget)
    this.notificationsGateway.notifyUser(response.recipientId, response);
    void this.broadcastUnreadCount(response.recipientId);

    return response;
  }

  async listForUser(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResult> {
    const { page = 1, limit = 10, category, type, isRead } = query;
    const filter: Record<string, unknown> = {
      recipientId: this.toObjectId(userId),
    };

    if (category) {
      filter.category = category;
    }

    if (type) {
      filter.type = type;
    }

    const normalizedIsRead = this.normalizeBoolean(isRead);
    if (typeof normalizedIsRead === 'boolean') {
      filter.isRead = normalizedIsRead;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      total,
      page,
      limit,
    };
  }

  async countUnread(userId: string): Promise<number> {
    const recipientId = this.toObjectId(userId);
    return this.notificationModel.countDocuments({
      recipientId,
      isRead: false,
    });
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const updated = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(notificationId),
          recipientId: this.toObjectId(userId),
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
        { new: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    const response = this.toResponseDto(updated);
    void this.broadcastUnreadCount(userId);
    return response;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const recipientId = this.toObjectId(userId);
    const result = await this.notificationModel.updateMany(
      { recipientId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    if (result.modifiedCount > 0) {
      void this.broadcastUnreadCount(userId);
    }

    return result.modifiedCount;
  }

  async findOneForUser(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationModel
      .findOne({
        _id: this.toObjectId(notificationId),
        recipientId: this.toObjectId(userId),
      })
      .lean();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.toResponseDto(notification);
  }

  private async broadcastUnreadCount(userId: string): Promise<void> {
    const unread = await this.countUnread(userId);
    this.notificationsGateway.emitUnreadCount(userId, unread);
  }

  private normalizeBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no'].includes(normalized)) {
        return false;
      }
    }

    return undefined;
  }

  private toResponseDto(
    notification:
      | NotificationDocument
      | (Notification & { _id: Types.ObjectId }),
  ): NotificationResponseDto {
    type LeanNotification = Notification & { _id: Types.ObjectId };

    const plain: LeanNotification =
      typeof (notification as NotificationDocument)?.toObject === 'function'
        ? ((
            notification as NotificationDocument
          ).toObject() as LeanNotification)
        : (notification as LeanNotification);

    return {
      id: String(plain._id),
      recipientId: String(plain.recipientId),
      audience: plain.audience,
      category: plain.category,
      type: plain.type,
      title: plain.title,
      message: plain.message,
      actionUrl: plain.actionUrl,
      examId: plain.examId ? String(plain.examId) : undefined,
      certificateId: plain.certificateId
        ? String(plain.certificateId)
        : undefined,
      metadata: plain.metadata ?? {},
      isRead: plain.isRead,
      readAt: plain.readAt ?? null,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid identifier provided');
    }

    return new Types.ObjectId(id);
  }
}
