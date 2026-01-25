import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { ApiResponseDto, ResponseHelper } from '../../common/dto/response.dto';
import { Roles } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { IUser } from '../../common/interfaces';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'List notifications for the current user' })
  async listNotifications(
    @CurrentUser() user: IUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<
    ApiResponseDto<{
      notifications: NotificationResponseDto[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const { items, total, page, limit } =
      await this.notificationsService.listForUser(user.id, query);

    return ResponseHelper.success(
      {
        notifications: items,
        total,
        page,
        limit,
      },
      'Notifications retrieved successfully',
    );
  }

  @Get('unread-count')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @CurrentUser() user: IUser,
  ): Promise<ApiResponseDto<{ unread: number }>> {
    const unread = await this.notificationsService.countUnread(user.id);
    return ResponseHelper.success(
      { unread },
      'Unread notification count retrieved successfully',
    );
  }

  @Get(':id')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Get a single notification' })
  async getNotification(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ): Promise<ApiResponseDto<{ notification: NotificationResponseDto }>> {
    const notification = await this.notificationsService.findOneForUser(
      id,
      user.id,
    );

    return ResponseHelper.success(
      { notification },
      'Notification retrieved successfully',
    );
  }

  @Patch(':id/read')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markNotificationAsRead(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ): Promise<ApiResponseDto<{ notification: NotificationResponseDto }>> {
    const notification = await this.notificationsService.markAsRead(
      id,
      user.id,
    );

    return ResponseHelper.success(
      { notification },
      'Notification marked as read',
    );
  }

  @Patch('mark-all-read')
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @CurrentUser() user: IUser,
  ): Promise<ApiResponseDto<{ updated: number }>> {
    const updated = await this.notificationsService.markAllAsRead(user.id);
    return ResponseHelper.success(
      { updated },
      'All notifications marked as read',
    );
  }
}
