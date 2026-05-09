import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { NotificationsController } from 'src/modules/notifications/notifications.controller';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

describe('TestNotificationsController — NotificationsController endpoints', () => {
  let controller: NotificationsController;
  let notificationsService: any;

  const user = {
    id: '507f1f77bcf86cd799439011',
    username: 'student01',
    fullName: 'Student 01',
    email: 'student01@example.com',
    role: 'student',
  };

  const notification = {
    id: '507f1f77bcf86cd799439044',
    recipientId: user.id,
    audience: 'student',
    category: 'system',
    type: 'generic',
    title: 'System update',
    message: 'Please read',
    metadata: {},
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-05-05T10:00:00.000Z'),
    updatedAt: new Date('2026-05-05T10:00:00.000Z'),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            listForUser: jest.fn(),
            countUnread: jest.fn(),
            findOneForUser: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('MN-023 — should_list_notifications_successfully', async () => {
    // MN-023: API list notifications trả data phân trang chuẩn.
    // Mô tả: Service trả 1 notification.
    // Expected: success=true và data.notifications có đúng phần tử.
    notificationsService.listForUser.mockResolvedValue({
      items: [notification],
      total: 1,
      page: 1,
      limit: 10,
    });

    const result = await controller.listNotifications(user as never, {});

    expect(result.success).toBe(true);
    expect(result.message).toBe('Notifications retrieved successfully');
    expect(result.data.notifications).toHaveLength(1);
    expect(result.data.total).toBe(1);
  });

  it('MN-024 — should_return_empty_notification_list', async () => {
    // MN-024: Danh sách rỗng vẫn phải trả payload ổn định cho FE.
    // Mô tả: Service trả items rỗng.
    // Expected: data.notifications=[] và total=0.
    notificationsService.listForUser.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    const result = await controller.listNotifications(user as never, {});

    expect(result.success).toBe(true);
    expect(result.data.notifications).toEqual([]);
    expect(result.data.total).toBe(0);
  });

  it('MN-025 — should_forward_query_filters_to_service', async () => {
    // MN-025: Controller phải chuyển nguyên query filter xuống service.
    // Mô tả: Query có category/type/isRead/page/limit.
    // Expected: Service nhận đúng user.id và query object.
    notificationsService.listForUser.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 5,
    });
    const query = {
      category: 'exam',
      type: 'exam_scheduled_to_active',
      isRead: 'true',
      page: 2,
      limit: 5,
    };

    await controller.listNotifications(user as never, query as never);

    expect(notificationsService.listForUser).toHaveBeenCalledWith(user.id, query);
  });

  it('MN-026 — should_propagate_list_notifications_error', async () => {
    // MN-026: Lỗi validate/query từ service phải được propagate.
    // Mô tả: Service throw BadRequestException.
    // Expected: Controller không nuốt lỗi.
    notificationsService.listForUser.mockRejectedValue(
      new BadRequestException('Invalid query'),
    );

    await expect(
      controller.listNotifications(user as never, { page: 0 } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('MN-027 — should_get_unread_count_successfully', async () => {
    // MN-027: API unread-count phải trả số lượng unread hiện tại.
    // Mô tả: Service trả unread=6.
    // Expected: data.unread=6 và message chuẩn.
    notificationsService.countUnread.mockResolvedValue(6);

    const result = await controller.getUnreadCount(user as never);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Unread notification count retrieved successfully');
    expect(result.data.unread).toBe(6);
  });

  it('MN-028 — should_propagate_unread_count_error', async () => {
    // MN-028: countUnread lỗi phải trả lỗi đúng cho caller.
    // Mô tả: Service throw BadRequestException.
    // Expected: Controller throw BadRequestException.
    notificationsService.countUnread.mockRejectedValue(
      new BadRequestException('Invalid identifier provided'),
    );

    await expect(controller.getUnreadCount(user as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('MN-029 — should_get_single_notification_successfully', async () => {
    // MN-029: API lấy chi tiết notification trả object notification.
    // Mô tả: Service trả notification hợp lệ.
    // Expected: success=true và data.notification.id đúng.
    notificationsService.findOneForUser.mockResolvedValue(notification);

    const result = await controller.getNotification(notification.id, user as never);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Notification retrieved successfully');
    expect(result.data.notification.id).toBe(notification.id);
  });

  it('MN-030 — should_mark_notification_as_read_successfully', async () => {
    // MN-030: API mark read phải trả notification đã cập nhật.
    // Mô tả: Service trả isRead=true.
    // Expected: success=true và data.notification.isRead=true.
    notificationsService.markAsRead.mockResolvedValue({
      ...notification,
      isRead: true,
      readAt: new Date('2026-05-05T10:01:00.000Z'),
    });

    const result = await controller.markNotificationAsRead(
      notification.id,
      user as never,
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Notification marked as read');
    expect(result.data.notification.isRead).toBe(true);
  });

  it('MN-031 — should_mark_all_notifications_as_read_successfully', async () => {
    // MN-031: API mark-all-read phải trả số lượng đã cập nhật.
    // Mô tả: Service trả updated=4.
    // Expected: data.updated=4 và message chuẩn.
    notificationsService.markAllAsRead.mockResolvedValue(4);

    const result = await controller.markAllAsRead(user as never);

    expect(result.success).toBe(true);
    expect(result.message).toBe('All notifications marked as read');
    expect(result.data.updated).toBe(4);
  });

  it('MN-032 — should_propagate_get_notification_not_found_error', async () => {
    // MN-032: Lấy notification không tồn tại phải báo NotFound.
    // Mô tả: Service throw NotFoundException.
    // Expected: Controller throw NotFoundException.
    notificationsService.findOneForUser.mockRejectedValue(
      new NotFoundException('Notification not found'),
    );

    await expect(
      controller.getNotification(notification.id, user as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('MN-033 — should_propagate_mark_notification_as_read_not_found_error', async () => {
    // MN-033: Mark read notification không tồn tại phải báo NotFound.
    // Mô tả: Service throw NotFoundException.
    // Expected: Controller throw NotFoundException.
    notificationsService.markAsRead.mockRejectedValue(
      new NotFoundException('Notification not found'),
    );

    await expect(
      controller.markNotificationAsRead(notification.id, user as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('MN-034 — should_propagate_mark_all_as_read_error', async () => {
    // MN-034: Mark-all-read lỗi runtime phải được propagate.
    // Mô tả: Service throw Error DB timeout.
    // Expected: Promise reject với DB timeout.
    notificationsService.markAllAsRead.mockRejectedValue(new Error('DB timeout'));

    await expect(controller.markAllAsRead(user as never)).rejects.toThrow(
      'DB timeout',
    );
  });
});

