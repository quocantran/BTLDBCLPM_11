import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export const NOTIFICATION_AUDIENCES = ['student', 'teacher', 'admin'] as const;
export const NOTIFICATION_CATEGORIES = [
  'exam',
  'certificate',
  'system',
] as const;
export const NOTIFICATION_TYPES = [
  'exam_scheduled_to_active',
  'exam_active_to_completed',
  'certificate_issued',
  'generic',
] as const;

export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({
    type: String,
    enum: NOTIFICATION_AUDIENCES,
    required: true,
    index: true,
  })
  audience: NotificationAudience;

  @Prop({
    type: String,
    enum: NOTIFICATION_CATEGORIES,
    required: true,
    index: true,
  })
  category: NotificationCategory;

  @Prop({
    type: String,
    enum: NOTIFICATION_TYPES,
    default: 'generic',
    index: true,
  })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: String })
  actionUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'Exam' })
  examId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Certificate' })
  certificateId?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ category: 1, type: 1 });
NotificationSchema.index({ createdAt: -1 });
