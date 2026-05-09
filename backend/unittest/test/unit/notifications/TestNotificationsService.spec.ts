import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationsGateway } from 'src/modules/notifications/notifications.gateway';
import { Notification } from 'src/database/schemas/notification.schema';

describe('TestNotificationsService — NotificationsService business logic', () => {
  let service: NotificationsService;
  let notificationModel: any;
  let notificationsGateway: any;

  const USER_ID = '507f1f77bcf86cd799439011';
  const NOTIFICATION_ID = '507f1f77bcf86cd799439044';
  const EXAM_ID = '507f1f77bcf86cd799439022';
  const CERTIFICATE_ID = '507f1f77bcf86cd799439033';
  const NOW = new Date('2026-05-05T10:00:00.000Z');

  const buildPlainNotification = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(NOTIFICATION_ID),
    recipientId: new Types.ObjectId(USER_ID),
    audience: 'student',
    category: 'system',
    type: 'generic',
    title: 'New notification',
    message: 'You have an update',
    actionUrl: '/notifications',
    examId: undefined,
    certificateId: undefined,
    metadata: { source: 'unit-test' },
    isRead: false,
    readAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

  const buildDocumentNotification = (overrides: Record<string, unknown> = {}) => {
    const plain = buildPlainNotification(overrides);
    return {
      ...plain,
      toObject: jest.fn().mockReturnValue(plain),
    };
  };

  const buildFindChain = (items: unknown[]) => {
    const exec = jest.fn().mockResolvedValue(items);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const find = jest.fn().mockReturnValue({ sort });

    return { find, sort, skip, limit, lean, exec };
  };

  const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

  beforeAll(async () => {
    const notificationModelMock: any = jest.fn();
    notificationModelMock.find = jest.fn();
    notificationModelMock.countDocuments = jest.fn();
    notificationModelMock.findOneAndUpdate = jest.fn();
    notificationModelMock.updateMany = jest.fn();
    notificationModelMock.findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: notificationModelMock,
        },
        {
          provide: NotificationsGateway,
          useValue: {
            notifyUser: jest.fn(),
            emitUnreadCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationModel = module.get(getModelToken(Notification.name));
    notificationsGateway = module.get(NotificationsGateway);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    notificationModel.mockImplementation((payload: Record<string, unknown>) => ({
      save: jest.fn().mockResolvedValue(buildDocumentNotification(payload)),
    }));
  });

  it('MN-001 — should_create_notification_with_optional_linked_ids', async () => {
    // MN-001: Tạo notification đủ examId và certificateId phải map đúng ObjectId.
    // Mô tả: Input có đầy đủ field liên kết.
    // Expected: Trả response có id, examId, certificateId dạng string chuẩn.
    notificationModel.countDocuments.mockResolvedValue(2);

    const result = await service.createNotification({
      recipientId: USER_ID,
      audience: 'student',
      category: 'certificate',
      type: 'certificate_issued',
      title: 'Certificate issued',
      message: 'Your certificate is available',
      examId: EXAM_ID,
      certificateId: CERTIFICATE_ID,
      metadata: { level: 'A' },
    });

    expect(result.id).toBe(NOTIFICATION_ID);
    expect(result.examId).toBe(EXAM_ID);
    expect(result.certificateId).toBe(CERTIFICATE_ID);
    expect(result.metadata).toEqual({ level: 'A' });
    expect(notificationsGateway.notifyUser).toHaveBeenCalledWith(USER_ID, result);
    await flushAsync();
    expect(notificationsGateway.emitUnreadCount).toHaveBeenCalledWith(USER_ID, 2);
  });

  it('MN-002 — should_create_notification_without_optional_fields', async () => {
    // MN-002: Tạo notification tối thiểu không có exam/certificate vẫn thành công.
    // Mô tả: Chỉ truyền field bắt buộc.
    // Expected: examId, certificateId là undefined và metadata luôn là object.
    notificationModel.countDocuments.mockResolvedValue(1);
    notificationModel.mockImplementation((payload: Record<string, unknown>) => ({
      save: jest
        .fn()
        .mockResolvedValue(
          buildDocumentNotification({ ...payload, metadata: undefined }),
        ),
    }));

    const result = await service.createNotification({
      recipientId: USER_ID,
      audience: 'student',
      category: 'system',
      type: 'generic',
      title: 'System notice',
      message: 'Read policy update',
    });

    expect(result.examId).toBeUndefined();
    expect(result.certificateId).toBeUndefined();
    expect(result.metadata).toEqual({});
  });

  it('MN-003 — should_throw_bad_request_when_recipient_id_invalid', async () => {
    // MN-003: recipientId sai format phải bị chặn.
    // Mô tả: Input recipientId không hợp lệ.
    // Expected: Throw BadRequestException trước khi ghi DB.
    await expect(
      service.createNotification({
        recipientId: 'invalid-id',
        audience: 'student',
        category: 'system',
        type: 'generic',
        title: 'Invalid',
        message: 'Invalid recipient',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('MN-004 — should_throw_bad_request_when_exam_id_invalid', async () => {
    // MN-004: examId sai format phải reject.
    // Mô tả: Input examId không phải ObjectId.
    // Expected: Throw BadRequestException.
    await expect(
      service.createNotification({
        recipientId: USER_ID,
        audience: 'student',
        category: 'exam',
        type: 'exam_active_to_completed',
        title: 'Exam update',
        message: 'Exam done',
        examId: 'bad-exam-id',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('MN-005 — should_throw_bad_request_when_certificate_id_invalid', async () => {
    // MN-005: certificateId sai format phải reject.
    // Mô tả: Input certificateId không phải ObjectId.
    // Expected: Throw BadRequestException.
    await expect(
      service.createNotification({
        recipientId: USER_ID,
        audience: 'student',
        category: 'certificate',
        type: 'certificate_issued',
        title: 'Certificate update',
        message: 'Invalid cert id',
        certificateId: 'bad-cert-id',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('MN-006 — should_not_break_creation_when_realtime_push_fails (BUG MN-RT-001)', async () => {
    // MN-006: Lưu notification không được phụ thuộc realtime socket.
    // Mô tả: Gateway notifyUser lỗi runtime.
    // Expected: Vẫn trả notification đã lưu thành công.
    notificationsGateway.notifyUser.mockImplementation(() => {
      throw new Error('Socket offline');
    });
    notificationModel.countDocuments.mockResolvedValue(3);

    await expect(
      service.createNotification({
        recipientId: USER_ID,
        audience: 'student',
        category: 'system',
        type: 'generic',
        title: 'Should persist',
        message: 'Realtime can fail',
      }),
    ).resolves.toMatchObject({
      id: NOTIFICATION_ID,
      recipientId: USER_ID,
    });
  });

  it('MN-007 — should_list_notifications_with_paging_and_filters', async () => {
    // MN-007: Danh sách có filter category/type/isRead phải trả đúng phân trang.
    // Mô tả: Query page=2, limit=2 và đủ filter.
    // Expected: filter truyền xuống DB chính xác và trả total đúng.
    const items = [
      buildPlainNotification({ title: 'N1', category: 'exam', type: 'exam_scheduled_to_active', isRead: true }),
      buildPlainNotification({ _id: new Types.ObjectId(), title: 'N2', category: 'exam', type: 'exam_scheduled_to_active', isRead: true }),
    ];
    const chain = buildFindChain(items);
    notificationModel.find.mockImplementation(chain.find);
    const countExec = jest.fn().mockResolvedValue(5);
    notificationModel.countDocuments.mockReturnValue({ exec: countExec });

    const result = await service.listForUser(USER_ID, {
      page: 2,
      limit: 2,
      category: 'exam',
      type: 'exam_scheduled_to_active',
      isRead: 'true',
    });

    expect(notificationModel.find).toHaveBeenCalledWith({
      recipientId: new Types.ObjectId(USER_ID),
      category: 'exam',
      type: 'exam_scheduled_to_active',
      isRead: true,
    });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(2);
  });

  it('MN-008 — should_parse_boolean_isRead_from_string_true', async () => {
    // MN-008: isRead dạng chuỗi "TRUE" phải được normalize thành true.
    // Mô tả: Query isRead uppercase.
    // Expected: DB filter có isRead=true.
    const chain = buildFindChain([]);
    notificationModel.find.mockImplementation(chain.find);
    notificationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.listForUser(USER_ID, { isRead: 'TRUE' });

    expect(notificationModel.find).toHaveBeenCalledWith({
      recipientId: new Types.ObjectId(USER_ID),
      isRead: true,
    });
  });

  it('MN-009 — should_parse_boolean_isRead_from_string_false', async () => {
    // MN-009: isRead dạng "0" phải được normalize thành false.
    // Mô tả: Query gửi giá trị numeric string.
    // Expected: DB filter có isRead=false.
    const chain = buildFindChain([]);
    notificationModel.find.mockImplementation(chain.find);
    notificationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.listForUser(USER_ID, { isRead: '0' as never });

    expect(notificationModel.find).toHaveBeenCalledWith({
      recipientId: new Types.ObjectId(USER_ID),
      isRead: false,
    });
  });

  it('MN-010 — should_ignore_invalid_isRead_value_without_crashing', async () => {
    // MN-010: isRead không hợp lệ không được làm lỗi list.
    // Mô tả: Query truyền "unexpected".
    // Expected: Service bỏ qua filter isRead và vẫn trả data.
    const chain = buildFindChain([buildPlainNotification()]);
    notificationModel.find.mockImplementation(chain.find);
    notificationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const result = await service.listForUser(USER_ID, {
      isRead: 'unexpected' as never,
    });

    expect(notificationModel.find).toHaveBeenCalledWith({
      recipientId: new Types.ObjectId(USER_ID),
    });
    expect(result.total).toBe(1);
  });

  it('MN-011 — should_accept_boolean_isRead_directly_in_service_filter', async () => {
    // MN-011: Service phải xử lý được isRead dạng boolean trực tiếp.
    // Mô tả: Query isRead = true (không qua transform DTO).
    // Expected: DB filter có isRead=true.
    const chain = buildFindChain([]);
    notificationModel.find.mockImplementation(chain.find);
    notificationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.listForUser(USER_ID, { isRead: true as never });

    expect(notificationModel.find).toHaveBeenCalledWith({
      recipientId: new Types.ObjectId(USER_ID),
      isRead: true,
    });
  });

  it('MN-012 — should_count_unread_notifications_by_user', async () => {
    // MN-012: Đếm unread phải luôn gắn điều kiện isRead=false.
    // Mô tả: User có 4 notification chưa đọc.
    // Expected: Trả 4 và query đúng filter.
    notificationModel.countDocuments.mockResolvedValue(4);

    const result = await service.countUnread(USER_ID);

    expect(result).toBe(4);
    expect(notificationModel.countDocuments).toHaveBeenCalledWith({
      recipientId: new Types.ObjectId(USER_ID),
      isRead: false,
    });
  });

  it('MN-013 — should_throw_bad_request_when_count_unread_user_id_invalid', async () => {
    // MN-013: countUnread phải reject userId sai format.
    // Mô tả: Input userId = abc.
    // Expected: Throw BadRequestException.
    await expect(service.countUnread('abc')).rejects.toThrow(BadRequestException);
  });

  it('MN-014 — should_mark_notification_as_read_and_emit_new_count', async () => {
    // MN-014: Mark read thành công phải trả notification đã cập nhật.
    // Mô tả: findOneAndUpdate trả bản ghi isRead=true.
    // Expected: response.isRead=true và emitUnreadCount được gọi.
    notificationModel.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(
        buildPlainNotification({ isRead: true, readAt: NOW }),
      ),
    });
    notificationModel.countDocuments.mockResolvedValue(0);

    const result = await service.markAsRead(NOTIFICATION_ID, USER_ID);

    expect(result.isRead).toBe(true);
    expect(result.readAt).toEqual(NOW);
    await flushAsync();
    expect(notificationsGateway.emitUnreadCount).toHaveBeenCalledWith(USER_ID, 0);
  });

  it('MN-015 — should_throw_not_found_when_marking_missing_notification', async () => {
    // MN-015: Mark read vào notification không tồn tại phải báo 404.
    // Mô tả: findOneAndUpdate trả null.
    // Expected: Throw NotFoundException.
    notificationModel.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(service.markAsRead(NOTIFICATION_ID, USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('MN-016 — should_throw_bad_request_when_markAsRead_notification_id_invalid', async () => {
    // MN-016: markAsRead phải reject notificationId sai format.
    // Mô tả: notificationId = invalid.
    // Expected: Throw BadRequestException.
    await expect(service.markAsRead('invalid', USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('MN-017 — should_keep_mark_as_read_idempotent_for_already_read_notification (BUG MN-IDEMP-001)', async () => {
    // MN-017: Mark read lặp lại không nên trả 404 gây lỗi FE.
    // Mô tả: Notification đã ở trạng thái isRead=true.
    // Expected: Vẫn trả notification hiện tại thay vì NotFound.
    notificationModel.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.markAsRead(NOTIFICATION_ID, USER_ID),
    ).resolves.toMatchObject({
      id: NOTIFICATION_ID,
      isRead: true,
    });
  });

  it('MN-018 — should_mark_all_as_read_and_emit_when_modified', async () => {
    // MN-018: Mark all read khi có cập nhật phải phát unread count mới.
    // Mô tả: updateMany modifiedCount=3.
    // Expected: Trả 3 và emitUnreadCount được gọi.
    notificationModel.updateMany.mockResolvedValue({ modifiedCount: 3 });
    notificationModel.countDocuments.mockResolvedValue(0);

    const result = await service.markAllAsRead(USER_ID);

    expect(result).toBe(3);
    await flushAsync();
    expect(notificationsGateway.emitUnreadCount).toHaveBeenCalledWith(USER_ID, 0);
  });

  it('MN-019 — should_not_emit_when_mark_all_read_updates_nothing', async () => {
    // MN-019: Không có bản ghi đổi trạng thái thì không cần broadcast.
    // Mô tả: updateMany modifiedCount=0.
    // Expected: Trả 0 và không gọi emitUnreadCount.
    notificationModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

    const result = await service.markAllAsRead(USER_ID);

    expect(result).toBe(0);
    expect(notificationsGateway.emitUnreadCount).not.toHaveBeenCalled();
  });

  it('MN-020 — should_get_single_notification_for_user_successfully', async () => {
    // MN-020: Lấy chi tiết notification theo user hợp lệ phải thành công.
    // Mô tả: findOne trả notification đúng recipient.
    // Expected: Trả payload mapped chuẩn cho API.
    notificationModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(buildPlainNotification()),
    });

    const result = await service.findOneForUser(NOTIFICATION_ID, USER_ID);

    expect(result.id).toBe(NOTIFICATION_ID);
    expect(result.recipientId).toBe(USER_ID);
  });

  it('MN-021 — should_throw_not_found_when_notification_is_not_owned_by_user', async () => {
    // MN-021: User không sở hữu notification không được truy cập.
    // Mô tả: findOne trả null với filter _id + recipientId.
    // Expected: Throw NotFoundException.
    notificationModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOneForUser(NOTIFICATION_ID, USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('MN-022 — should_throw_bad_request_when_find_one_identifier_invalid', async () => {
    // MN-022: findOneForUser phải reject notificationId sai format.
    // Mô tả: _id invalid không phải ObjectId.
    // Expected: Throw BadRequestException.
    await expect(service.findOneForUser('abc', USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });
});

