import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException } from '@nestjs/common';

import { AuthService } from 'src/modules/auth/auth.service';
import { MailService } from 'src/modules/auth/mail.service';
import { User } from 'src/database/schemas/user.schema';
import { PasswordResetToken } from 'src/database/schemas/password-reset-token.schema';
import * as argon2 from 'argon2';

// Mock argon2 ở top-level vì native module không cho phép jest.spyOn
jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('TestAuthLoginService - AuthService.login() business logic', () => {
  let authService: AuthService;
  let userModel: any;
  let jwtService: JwtService;

  // ===== Mock data dùng chung cho các test case =====
  const MOCK_ACCESS_TOKEN = 'mock.access.token.jwt';
  const MOCK_REFRESH_TOKEN = 'mock.refresh.token.jwt';

  const createMockUser = (overrides: Partial<any> = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    username: 'student01',
    email: 'student01@test.com',
    passwordHash: 'argon2-hashed-password',
    fullName: 'Student One',
    role: 'student',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });

  beforeAll(async () => {
    // Mock userModel với các method cần thiết
    const mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(PasswordResetToken.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            countDocuments: jest.fn(),
            updateOne: jest.fn(),
            updateMany: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockImplementation((_payload, options) => {
              if (options?.expiresIn === '7d') return Promise.resolve(MOCK_REFRESH_TOKEN);
              return Promise.resolve(MOCK_ACCESS_TOKEN);
            }),
          },
        },
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MailService, useValue: { sendPasswordResetEmail: jest.fn() } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  // ROLLBACK: Reset tất cả mock trước mỗi test case để đảm bảo test độc lập
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== SUCCESS CASES ====================

  it('UA-001 — should_login_successfully_with_valid_username_and_return_tokens', async () => {
    // UA-001: Đăng nhập thành công bằng username + password đúng (ĐN-01-020).
    // Mô tả: Kiểm tra happy path login qua service, verify query DB và lưu refreshTokenHash.
    // Expected: Trả về user, accessToken, refreshToken. DB lưu refreshTokenHash.
    const mockUser = createMockUser();
    userModel.findOne.mockResolvedValue(mockUser);
    userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
    mockedArgon2.verify.mockResolvedValue(true);
    mockedArgon2.hash.mockResolvedValue('hashed-refresh-token');

    const result = await authService.login({ identifier: 'student01', password: 'Password123' });

    // Assert: response chứa đầy đủ user info + tokens
    expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
    expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);
    expect(result.user.username).toBe('student01');
    expect(result.user.email).toBe('student01@test.com');
    expect(result.user.role).toBe('student');

    // CHECKDB: Verify DB được gọi đúng query $or cho email/username
    expect(userModel.findOne).toHaveBeenCalledWith({
      $or: [{ email: 'student01' }, { username: 'student01' }],
    });

    // CHECKDB: Verify refreshTokenHash được lưu vào DB sau login
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { refreshTokenHash: 'hashed-refresh-token' },
    );
  });

  it('UA-002 — should_login_successfully_with_email_identifier_for_teacher_role', async () => {
    // UA-002: Teacher đăng nhập bằng email, trả đúng role teacher (ĐN-01-021).
    // Mô tả: Kiểm tra login bằng email identifier, verify role trả về và query DB.
    // Expected: user.role = 'teacher', có accessToken và refreshToken.
    const mockTeacher = createMockUser({
      _id: '507f1f77bcf86cd799439022',
      username: 'teacher01',
      email: 'teacher01@test.com',
      role: 'teacher',
      fullName: 'Teacher One',
    });
    userModel.findOne.mockResolvedValue(mockTeacher);
    userModel.findByIdAndUpdate.mockResolvedValue(mockTeacher);
    mockedArgon2.verify.mockResolvedValue(true);
    mockedArgon2.hash.mockResolvedValue('hashed-rt');

    const result = await authService.login({ identifier: 'teacher01@test.com', password: 'Password123' });

    expect(result.user.role).toBe('teacher');
    expect(result.user.email).toBe('teacher01@test.com');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    // CHECKDB: Verify query tìm user bằng email
    expect(userModel.findOne).toHaveBeenCalledWith({
      $or: [{ email: 'teacher01@test.com' }, { username: 'teacher01@test.com' }],
    });
  });

  // ==================== USER NOT FOUND CASES ====================

  it('UA-003 — should_throw_unauthorized_with_generic_message_when_user_not_found', async () => {
    // UA-003: User không tồn tại, trả lỗi generic không tiết lộ thông tin (ĐN-01-024, ĐN-01-025).
    // Mô tả: Kiểm tra nhánh user == null, verify message không phân biệt với sai password.
    // Expected: UnauthorizedException('Invalid credentials'), không gọi findByIdAndUpdate.
    userModel.findOne.mockResolvedValue(null);

    await expect(
      authService.login({ identifier: 'notexist@test.com', password: 'Password123' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      authService.login({ identifier: 'notexist@test.com', password: 'Password123' }),
    ).rejects.toThrow('Invalid credentials');

    // CHECKDB: Verify DB được truy vấn nhưng không tìm thấy
    expect(userModel.findOne).toHaveBeenCalled();
    // CHECKDB: Verify KHÔNG gọi findByIdAndUpdate (không update token khi user không tồn tại)
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // ==================== WRONG PASSWORD CASES ====================

  it('UA-004 — should_throw_unauthorized_when_password_is_incorrect', async () => {
    // UA-004: Password sai, trả lỗi giống hệt user not found (ĐN-01-022, ĐN-01-023).
    // Mô tả: Kiểm tra nhánh isPasswordValid == false, verify message generic và DB không bị update.
    // Expected: UnauthorizedException('Invalid credentials'), không gọi findByIdAndUpdate.
    const mockUser = createMockUser();
    userModel.findOne.mockResolvedValue(mockUser);
    mockedArgon2.verify.mockResolvedValue(false);

    await expect(
      authService.login({ identifier: 'student01', password: 'WrongPassword123' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      authService.login({ identifier: 'student01', password: 'WrongPassword123' }),
    ).rejects.toThrow('Invalid credentials');

    // CHECKDB: Verify KHÔNG update refreshToken khi password sai
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  // ==================== SENSITIVE DATA CASES ====================

  it('UA-005 — should_not_expose_passwordHash_or_refreshTokenHash_in_response', async () => {
    // UA-005: Response không chứa dữ liệu nhạy cảm sau login (ĐN-01-019).
    // Mô tả: Kiểm tra sanitizeUser() loại bỏ passwordHash, refreshTokenHash khỏi response.
    // Expected: user object chỉ chứa id, username, email, role, fullName.
    const mockUser = createMockUser({ refreshTokenHash: 'secret-hash-should-not-leak' });
    userModel.findOne.mockResolvedValue(mockUser);
    userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
    mockedArgon2.verify.mockResolvedValue(true);
    mockedArgon2.hash.mockResolvedValue('hashed-rt');

    const result = await authService.login({ identifier: 'student01', password: 'Password123' });

    // Assert: sanitizeUser() đã loại bỏ các trường nhạy cảm
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('refreshTokenHash');
    // Assert: chỉ chứa các trường được phép
    expect(Object.keys(result.user)).toEqual(
      expect.arrayContaining(['id', 'username', 'email', 'role', 'fullName']),
    );
  });

  // ==================== TOKEN GENERATION & DB UPDATE ====================

  it('UA-006 — should_generate_jwt_with_correct_payload_and_update_refreshTokenHash_in_db', async () => {
    // UA-006: JWT payload đúng sub/email/role và refreshTokenHash lưu vào DB (ĐN-01-019).
    // Mô tả: Kiểm tra generateTokens() và updateRefreshToken() được gọi đúng tham số.
    // Expected: signAsync gọi 2 lần (1d, 7d), findByIdAndUpdate lưu refreshTokenHash.
    const mockUser = createMockUser({
      _id: '60d5ec49f1b2c72b7c8e4f10',
      email: 'jwt@test.com',
      role: 'student',
    });
    userModel.findOne.mockResolvedValue(mockUser);
    userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
    mockedArgon2.verify.mockResolvedValue(true);
    mockedArgon2.hash.mockResolvedValue('hashed-refresh-for-db');

    await authService.login({ identifier: 'jwt@test.com', password: 'Password123' });

    // CHECKDB: Verify JWT payload chứa đúng thông tin user
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: '60d5ec49f1b2c72b7c8e4f10', email: 'jwt@test.com', role: 'student' },
      { expiresIn: '1d' },
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: '60d5ec49f1b2c72b7c8e4f10', email: 'jwt@test.com', role: 'student' },
      { expiresIn: '7d' },
    );

    // CHECKDB: Verify refreshTokenHash được lưu vào DB
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '60d5ec49f1b2c72b7c8e4f10',
      { refreshTokenHash: 'hashed-refresh-for-db' },
    );
  });

  // ==================== SECURITY CASES ====================

  it('UA-007 — should_reject_sql_injection_and_xss_payloads_in_identifier', async () => {
    // UA-007: Identifier chứa SQL injection, XSS, NoSQL injection (ĐN-01-016, ĐN-01-017).
    // Mô tả: Kiểm tra hệ thống không crash khi nhận payload tấn công, trả lỗi 401 bình thường.
    // Expected: UnauthorizedException cho tất cả payload độc hại.
    userModel.findOne.mockResolvedValue(null);

    // SQL Injection payload
    await expect(
      authService.login({ identifier: "' OR 1=1 --", password: 'Password123' }),
    ).rejects.toThrow(UnauthorizedException);

    // XSS payload
    await expect(
      authService.login({ identifier: '<script>alert("XSS")</script>', password: 'Password123' }),
    ).rejects.toThrow(UnauthorizedException);

    // NoSQL injection payload — đặc biệt nguy hiểm với MongoDB
    await expect(
      authService.login({ identifier: '{"$gt": ""}', password: 'Password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('UA-008 — should_be_case_sensitive_for_identifier_lookup', async () => {
    // UA-008: Identifier chữ hoa khác chữ thường, query phải giữ nguyên case.
    // Mô tả: Kiểm tra findOne query giữ exact match, không tự lowercase identifier.
    // Expected: UnauthorizedException, query $or giữ nguyên 'STUDENT01@TEST.COM'.
    userModel.findOne.mockResolvedValue(null);

    await expect(
      authService.login({ identifier: 'STUDENT01@TEST.COM', password: 'Password123' }),
    ).rejects.toThrow(UnauthorizedException);

    // CHECKDB: Verify query giữ nguyên case, không tự lowercase
    expect(userModel.findOne).toHaveBeenCalledWith({
      $or: [{ email: 'STUDENT01@TEST.COM' }, { username: 'STUDENT01@TEST.COM' }],
    });
  });

  // ==================== EDGE CASES ====================

  it('UA-009 — should_login_correct_user_when_multiple_accounts_exist_in_db', async () => {
    // UA-009: DB có nhiều user, login trả về đúng user được chỉ định (ĐN-01-020).
    // Mô tả: Kiểm tra query $or trả đúng user theo identifier, không nhầm tài khoản khác.
    // Expected: Response chứa đúng username, email, role, id của user target.
    const targetUser = createMockUser({
      _id: '60d5ec49f1b2c72b7c8e4f99',
      username: 'targetuser',
      email: 'target@test.com',
      role: 'teacher',
    });
    userModel.findOne.mockResolvedValue(targetUser);
    userModel.findByIdAndUpdate.mockResolvedValue(targetUser);
    mockedArgon2.verify.mockResolvedValue(true);
    mockedArgon2.hash.mockResolvedValue('hashed-rt');

    const result = await authService.login({ identifier: 'targetuser', password: 'Password123' });

    expect(result.user.username).toBe('targetuser');
    expect(result.user.email).toBe('target@test.com');
    expect(result.user.role).toBe('teacher');
    expect(result.user.id).toBe('60d5ec49f1b2c72b7c8e4f99');
  });

  it('UA-010 — should_propagate_error_when_database_connection_fails', async () => {
    // UA-010: DB lỗi kết nối, error phải được propagate nguyên bản.
    // Mô tả: Kiểm tra exception propagation khi DB throw error, không bị nuốt thành 401.
    // Expected: Throw MongoNetworkError, KHÔNG phải UnauthorizedException.
    const dbError = new Error('MongoNetworkError: connection refused');
    userModel.findOne.mockRejectedValue(dbError);

    await expect(
      authService.login({ identifier: 'anyone', password: 'Password123' }),
    ).rejects.toThrow('MongoNetworkError: connection refused');

    // Assert: Error KHÔNG bị chuyển thành UnauthorizedException
    await expect(
      authService.login({ identifier: 'anyone', password: 'Password123' }),
    ).rejects.not.toThrow(UnauthorizedException);
  });
});
