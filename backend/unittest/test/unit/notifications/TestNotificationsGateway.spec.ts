import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { NotificationsGateway } from 'src/modules/notifications/notifications.gateway';
import { AuthService } from 'src/modules/auth/auth.service';

describe('TestNotificationsGateway — NotificationsGateway socket flow', () => {
  let gateway: NotificationsGateway;
  let jwtService: any;
  let configService: any;
  let authService: any;

  const user = {
    id: '507f1f77bcf86cd799439011',
    username: 'student01',
    fullName: 'Student 01',
    email: 'student01@example.com',
    role: 'student',
  };

  const createSocket = (overrides: Record<string, unknown> = {}) =>
    ({
      handshake: {
        headers: {},
        auth: {},
        query: {},
      },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    }) as any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    authService = module.get(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('jwt-secret');
  });

  it('MN-035 — should_connect_successfully_with_bearer_header_token', async () => {
    // MN-035: Socket connect dùng Bearer token header phải thành công.
    // Mô tả: verify token + validateUser đều hợp lệ.
    // Expected: emit notifications:connected và không disconnect.
    const client = createSocket({
      handshake: {
        headers: { authorization: 'Bearer valid-token' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockResolvedValue(user);

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('notifications:connected', {
      status: 'ok',
    });
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('MN-036 — should_connect_successfully_with_auth_token_field', async () => {
    // MN-036: Socket connect phải hỗ trợ token qua handshake.auth.token.
    // Mô tả: Không có header Bearer, token nằm ở auth.
    // Expected: verifyAsync gọi với token từ auth.
    const client = createSocket({
      handshake: {
        headers: {},
        auth: { token: 'auth-token' },
        query: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockResolvedValue(user);

    await gateway.handleConnection(client);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('auth-token', {
      secret: 'jwt-secret',
    });
  });

  it('MN-037 — should_connect_successfully_with_query_token', async () => {
    // MN-037: Socket connect phải hỗ trợ token qua query param.
    // Mô tả: header/auth đều trống, query.token có giá trị.
    // Expected: verifyAsync gọi với token từ query.
    const client = createSocket({
      handshake: {
        headers: {},
        auth: {},
        query: { token: 'query-token' },
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockResolvedValue(user);

    await gateway.handleConnection(client);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('query-token', {
      secret: 'jwt-secret',
    });
  });

  it('MN-038 — should_reject_connection_when_token_missing', async () => {
    // MN-038: Thiếu token xác thực phải bị từ chối kết nối.
    // Mô tả: header/auth/query đều không có token.
    // Expected: emit notifications:error và disconnect(true).
    const client = createSocket();

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('notifications:error', {
      message: 'Missing authentication token',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('MN-039 — should_reject_connection_when_jwt_verification_fails', async () => {
    // MN-039: JWT sai chữ ký phải bị từ chối.
    // Mô tả: verifyAsync throw Unauthorized.
    // Expected: emit notifications:error và disconnect.
    const client = createSocket({
      handshake: {
        headers: { authorization: 'Bearer invalid-token' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockRejectedValue(new Error('Unauthorized'));

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('notifications:error', {
      message: 'Unauthorized',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('MN-040 — should_use_fallback_secret_when_config_missing', async () => {
    // MN-040: Thiếu jwt.secret trong config vẫn phải dùng fallback-secret.
    // Mô tả: configService.get trả undefined.
    // Expected: verifyAsync nhận secret = fallback-secret.
    const client = createSocket({
      handshake: {
        headers: { authorization: 'Bearer fallback-token' },
        auth: {},
        query: {},
      },
    });
    configService.get.mockReturnValue(undefined);
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockResolvedValue(user);

    await gateway.handleConnection(client);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('fallback-token', {
      secret: 'fallback-secret',
    });
  });

  it('MN-041 — should_reject_connection_when_user_validation_fails', async () => {
    // MN-041: Token hợp lệ nhưng user không hợp lệ phải bị từ chối.
    // Mô tả: authService.validateUser throw User disabled.
    // Expected: emit notifications:error với message tương ứng.
    const client = createSocket({
      handshake: {
        headers: { authorization: 'Bearer valid-token' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockRejectedValue(new Error('User disabled'));

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('notifications:error', {
      message: 'User disabled',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('MN-049 — should_fallback_to_unauthorized_message_when_non_error_is_thrown', async () => {
    // MN-049: Lỗi không phải Error object vẫn phải trả message an toàn.
    // Mô tả: verifyAsync reject bằng string.
    // Expected: emit notifications:error với message Unauthorized.
    const client = createSocket({
      handshake: {
        headers: { authorization: 'Bearer broken-token' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockRejectedValue('bad-token');

    await gateway.handleConnection(client);

    expect(client.emit).toHaveBeenCalledWith('notifications:error', {
      message: 'Unauthorized',
    });
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('MN-042 — should_notify_all_sockets_of_user_when_new_notification_arrives', async () => {
    // MN-042: notifyUser phải phát sự kiện cho toàn bộ socket cùng user.
    // Mô tả: 1 user có 2 kết nối active.
    // Expected: Cả 2 socket nhận notifications:new.
    const socketA = createSocket({
      handshake: {
        headers: { authorization: 'Bearer t1' },
        auth: {},
        query: {},
      },
    });
    const socketB = createSocket({
      handshake: {
        headers: { authorization: 'Bearer t2' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockResolvedValue(user);

    await gateway.handleConnection(socketA);
    await gateway.handleConnection(socketB);

    gateway.notifyUser(user.id, { id: 'n1' } as never);

    expect(socketA.emit).toHaveBeenCalledWith('notifications:new', { id: 'n1' });
    expect(socketB.emit).toHaveBeenCalledWith('notifications:new', { id: 'n1' });
  });

  it('MN-043 — should_skip_notify_when_user_has_no_active_socket', () => {
    // MN-043: notifyUser cho user offline không được throw.
    // Mô tả: User chưa có kết nối trong map.
    // Expected: Hàm return an toàn.
    expect(() =>
      gateway.notifyUser('507f1f77bcf86cd799439099', { id: 'n2' } as never),
    ).not.toThrow();
  });

  it('MN-044 — should_emit_unread_count_to_all_connected_sockets', async () => {
    // MN-044: emitUnreadCount phải phát cho mọi socket của cùng user.
    // Mô tả: User có 2 socket active.
    // Expected: Cả 2 socket nhận notifications:unread.
    const socketA = createSocket({
      handshake: {
        headers: { authorization: 'Bearer t3' },
        auth: {},
        query: {},
      },
    });
    const socketB = createSocket({
      handshake: {
        headers: { authorization: 'Bearer t4' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockResolvedValue(user);

    await gateway.handleConnection(socketA);
    await gateway.handleConnection(socketB);
    gateway.emitUnreadCount(user.id, 8);

    expect(socketA.emit).toHaveBeenCalledWith('notifications:unread', { unread: 8 });
    expect(socketB.emit).toHaveBeenCalledWith('notifications:unread', { unread: 8 });
  });

  it('MN-045 — should_skip_unread_emit_when_user_has_no_socket', () => {
    // MN-045: emitUnreadCount cho user offline không được throw.
    // Mô tả: Không có kết nối active.
    // Expected: Hàm return an toàn.
    expect(() => gateway.emitUnreadCount('offline-user', 1)).not.toThrow();
  });

  it('MN-046 — should_unregister_socket_on_disconnect', async () => {
    // MN-046: Disconnect socket phải gỡ socket khỏi kết nối user.
    // Mô tả: User có 2 socket, disconnect 1 socket.
    // Expected: Socket còn lại vẫn nhận notifications:new.
    const socketA = createSocket({
      handshake: {
        headers: { authorization: 'Bearer d1' },
        auth: {},
        query: {},
      },
    });
    const socketB = createSocket({
      handshake: {
        headers: { authorization: 'Bearer d2' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: user.id });
    authService.validateUser.mockResolvedValue(user);

    await gateway.handleConnection(socketA);
    await gateway.handleConnection(socketB);
    gateway.handleDisconnect(socketA);
    gateway.notifyUser(user.id, { id: 'after-disconnect' } as never);

    expect(socketA.emit).not.toHaveBeenCalledWith('notifications:new', {
      id: 'after-disconnect',
    });
    expect(socketB.emit).toHaveBeenCalledWith('notifications:new', {
      id: 'after-disconnect',
    });
  });

  it('MN-047 — should_handle_disconnect_without_user_data_safely', () => {
    // MN-047: Disconnect socket không có client.data.user không được throw.
    // Mô tả: Socket chưa auth xong đã disconnect.
    // Expected: Hàm return an toàn.
    const unauthenticatedSocket = createSocket({ data: {} });
    expect(() => gateway.handleDisconnect(unauthenticatedSocket)).not.toThrow();
  });

  it('MN-050 — should_handle_disconnect_with_unknown_user_connection_set', () => {
    // MN-050: Disconnect với user không có trong connection map phải an toàn.
    // Mô tả: client.data.user.id tồn tại nhưng chưa từng connect.
    // Expected: Không throw exception.
    const unknownUserSocket = createSocket({
      data: { user: { id: '507f1f77bcf86cd799439099' } },
    });
    expect(() => gateway.handleDisconnect(unknownUserSocket)).not.toThrow();
  });

  it('MN-048 — should_remove_user_entry_after_last_socket_disconnects', async () => {
    // MN-048: Khi socket cuối cùng disconnect, user phải bị xoá khỏi map.
    // Mô tả: User có 1 socket rồi disconnect toàn bộ.
    // Expected: notifyUser sau đó không emit notifications:new.
    const isolatedUser = { ...user, id: '507f1f77bcf86cd799439077' };
    const socket = createSocket({
      handshake: {
        headers: { authorization: 'Bearer last-socket' },
        auth: {},
        query: {},
      },
    });
    jwtService.verifyAsync.mockResolvedValue({ id: isolatedUser.id });
    authService.validateUser.mockResolvedValue(isolatedUser);

    await gateway.handleConnection(socket);
    gateway.handleDisconnect(socket);
    socket.emit.mockClear();
    gateway.notifyUser(isolatedUser.id, { id: 'no-target' } as never);

    expect(socket.emit).not.toHaveBeenCalledWith('notifications:new', {
      id: 'no-target',
    });
  });
});

