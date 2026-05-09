import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ConflictException } from '@nestjs/common';

import { AuthService } from 'src/modules/auth/auth.service';
import { MailService } from 'src/modules/auth/mail.service';
import { User } from 'src/database/schemas/user.schema';
import { PasswordResetToken } from 'src/database/schemas/password-reset-token.schema';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('TestAuthRegisterService - AuthService.register() business logic', () => {
  let authService: AuthService;
  let userModel: any;
  let jwtService: JwtService;

  const MOCK_ACCESS_TOKEN = 'mock.access.token.jwt';
  const MOCK_REFRESH_TOKEN = 'mock.refresh.token.jwt';

  const validRegisterDto = {
    username: 'newuser01',
    fullName: 'New User',
    email: 'newuser01@test.com',
    password: 'Password123',
    role: 'student' as const,
  };

  const createMockSavedUser = (overrides: Partial<any> = {}) => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      username: 'newuser01',
      fullName: 'New User',
      email: 'newuser01@test.com',
      passwordHash: 'argon2-hashed',
      role: 'student',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      save: jest.fn(),
      ...overrides,
    };
    user.save.mockResolvedValue(user);
    return user;
  };

  beforeAll(async () => {
    const mockUserModel: any = jest.fn().mockImplementation((data) => {
      const instance = { ...data, _id: '507f1f77bcf86cd799439011', save: jest.fn() };
      instance.save.mockResolvedValue(instance);
      return instance;
    });
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.findByIdAndUpdate = jest.fn();
    mockUserModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(PasswordResetToken.name),
          useValue: { findOne: jest.fn(), create: jest.fn(), countDocuments: jest.fn(), updateOne: jest.fn(), updateMany: jest.fn() },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== SUCCESS CASES ====================

  it('UA-021 — should_register_student_successfully_and_return_tokens', async () => {
    // UA-021: Đăng ký student thành công, trả tokens và user đã sanitize (ĐK-01-029).
    // Mô tả: Kiểm tra happy path register qua service, verify password hash và DB save.
    // Expected: Trả về user (không có passwordHash), accessToken, refreshToken.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash.mockResolvedValue('argon2-hashed-password');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await authService.register(validRegisterDto);

    expect(result.user.username).toBe('newuser01');
    expect(result.user.email).toBe('newuser01@test.com');
    expect(result.user.role).toBe('student');
    expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
    expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);
    expect(result.user).not.toHaveProperty('passwordHash');

    // CHECKDB: verify argon2.hash được gọi với password gốc
    expect(mockedArgon2.hash).toHaveBeenCalledWith('Password123');
    // UA-022: verify findOne kiểm tra username trước
    expect(userModel.findOne).toHaveBeenCalledWith({ username: 'newuser01' });
  });

  it('UA-022 — should_register_teacher_successfully_with_correct_role', async () => {
    // UA-022: Đăng ký teacher thành công, role đúng (ĐK-01-030).
    // Mô tả: Kiểm tra register với role teacher, verify role trả về đúng.
    // Expected: user.role = 'teacher', có tokens.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash.mockResolvedValue('argon2-hashed');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await authService.register({ ...validRegisterDto, username: 'teacher01', email: 'teacher01@test.com', role: 'teacher' });

    expect(result.user.role).toBe('teacher');
    expect(result.accessToken).toBeDefined();
  });

  // ==================== DUPLICATE CASES ====================

  it('UA-023 — should_throw_conflict_when_username_already_exists', async () => {
    // UA-023: Username đã tồn tại, throw ConflictException chỉ rõ username (ĐK-01-031).
    // Mô tả: Kiểm tra nhánh existingUsername != null, verify message cụ thể.
    // Expected: ConflictException('Username already exists'), không tạo user mới.
    userModel.findOne.mockResolvedValueOnce({ _id: 'existing-id', username: 'newuser01' });

    await expect(
      authService.register(validRegisterDto),
    ).rejects.toThrow('Username already exists');

    // UA-081: verify KHÔNG gọi hash (không tiến hành tạo user)
    expect(mockedArgon2.hash).not.toHaveBeenCalled();
  });

  it('UA-081 — should_throw_conflict_when_email_already_exists', async () => {
    // UA-081: Email đã tồn tại, throw ConflictException chỉ rõ email (ĐK-01-032).
    // Mô tả: Kiểm tra nhánh existingUser (email) != null, verify message cụ thể.
    // Expected: ConflictException('User with this email already exists').
    userModel.findOne
      .mockResolvedValueOnce(null) // username check → not found
      .mockResolvedValueOnce({ _id: 'existing-id', email: 'newuser01@test.com' }); // email check → found

    await expect(
      authService.register(validRegisterDto),
    ).rejects.toThrow('User with this email already exists');
  });

  it('UA-025 — should_check_username_before_email_when_both_exist', async () => {
    // UA-025: Cả username và email đã tồn tại, ưu tiên báo lỗi username trước (ĐK-01-033).
    // Mô tả: Kiểm tra thứ tự kiểm tra: username trước, email sau.
    // Expected: ConflictException('Username already exists') — không phải email.
    userModel.findOne.mockResolvedValueOnce({ _id: 'existing-id', username: 'newuser01' });

    await expect(
      authService.register(validRegisterDto),
    ).rejects.toThrow('Username already exists');

    // CHECKDB: verify chỉ gọi findOne 1 lần (dừng ở username, không check email)
    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({ username: 'newuser01' });
  });

  // ==================== PASSWORD HASHING ====================

  it('UA-026 — should_hash_password_with_argon2_before_saving', async () => {
    // UA-026: Password được hash bằng argon2 trước khi lưu, không lưu plaintext.
    // Mô tả: Kiểm tra argon2.hash được gọi đúng và user model nhận passwordHash thay vì password.
    // Expected: argon2.hash gọi với password gốc, user.save() lưu passwordHash.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash.mockResolvedValue('$argon2id$v=19$hashed-value');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    await authService.register(validRegisterDto);

    expect(mockedArgon2.hash).toHaveBeenCalledWith('Password123');
    // CHECKDB: verify userModel constructor nhận passwordHash (not password)
    expect(userModel).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: '$argon2id$v=19$hashed-value',
        username: 'newuser01',
      }),
    );
  });

  // ==================== SENSITIVE DATA ====================

  it('UA-027 — should_not_expose_passwordHash_in_register_response', async () => {
    // UA-027: Response không chứa passwordHash sau đăng ký thành công.
    // Mô tả: Kiểm tra sanitizeUser() loại bỏ trường nhạy cảm khỏi response.
    // Expected: user object chỉ chứa id, username, email, role, fullName.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash.mockResolvedValue('hashed');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await authService.register(validRegisterDto);

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('refreshTokenHash');
    expect(result.user).toHaveProperty('username');
    expect(result.user).toHaveProperty('email');
    expect(result.user).toHaveProperty('role');
  });

  // ==================== TOKEN GENERATION ====================

  it('UA-028 — should_generate_tokens_and_save_refreshTokenHash_after_register', async () => {
    // UA-028: Sau register, tạo JWT tokens và lưu refreshTokenHash vào DB.
    // Mô tả: Kiểm tra generateTokens() và updateRefreshToken() được gọi đúng.
    // Expected: signAsync gọi 2 lần, findByIdAndUpdate lưu refreshTokenHash.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash
      .mockResolvedValueOnce('password-hash')     // hash password
      .mockResolvedValueOnce('refresh-token-hash'); // hash refresh token
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await authService.register(validRegisterDto);

    expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
    expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);
    // CHECKDB: verify signAsync gọi với đúng payload
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    // CHECKDB: verify findByIdAndUpdate lưu refreshTokenHash
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { refreshTokenHash: 'refresh-token-hash' },
    );
  });

  // ==================== SECURITY CASES ====================

  it('UA-029 — should_save_xss_payload_safely_without_execution', async () => {
    // UA-029: Fullname chứa XSS payload, hệ thống lưu an toàn (ĐK-01-025).
    // Mô tả: Kiểm tra hệ thống không crash, XSS không được thực thi, dữ liệu được lưu nguyên bản.
    // Expected: Register thành công, fullName lưu nguyên text XSS.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash.mockResolvedValue('hashed');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const xssDto = { ...validRegisterDto, fullName: '<script>alert("XSS")</script>' };
    const result = await authService.register(xssDto);

    expect(result.user).toBeDefined();
    // CHECKDB: verify constructor nhận fullName nguyên bản
    expect(userModel).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: '<script>alert("XSS")</script>' }),
    );
  });

  it('UA-030 — should_save_sql_injection_username_safely', async () => {
    // UA-030: Username chứa SQL injection, hệ thống không crash (ĐK-01-026).
    // Mô tả: Kiểm tra MongoDB không bị ảnh hưởng bởi SQL injection trong username.
    // Expected: Register thành công (nếu username chưa tồn tại), dữ liệu lưu nguyên.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash.mockResolvedValue('hashed');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const sqlDto = { ...validRegisterDto, username: "' DROP TABLE users --", email: 'sqlinject@test.com' };
    const result = await authService.register(sqlDto);

    expect(result.user).toBeDefined();
    expect(userModel).toHaveBeenCalledWith(
      expect.objectContaining({ username: "' DROP TABLE users --" }),
    );
  });

  // ==================== ERROR PROPAGATION ====================

  it('UA-031 — should_propagate_db_error_when_save_fails', async () => {
    // UA-031: DB lỗi khi save, error phải được propagate nguyên bản.
    // Mô tả: Kiểm tra exception propagation khi newUser.save() throw error.
    // Expected: Throw DB error, KHÔNG bị nuốt thành ConflictException.
    userModel.findOne.mockResolvedValue(null);
    mockedArgon2.hash.mockResolvedValue('hashed');

    const saveError = new Error('MongoServerError: E11000 duplicate key');
    userModel.mockImplementationOnce((data: any) => ({
      ...data,
      _id: '507f1f77bcf86cd799439011',
      save: jest.fn().mockRejectedValue(saveError),
    }));

    await expect(
      authService.register(validRegisterDto),
    ).rejects.toThrow('MongoServerError: E11000 duplicate key');
  });

  it('UA-032 — should_not_create_user_when_username_check_fails_with_db_error', async () => {
    // UA-032: DB lỗi khi findOne kiểm tra username, error propagate.
    // Mô tả: Kiểm tra hệ thống không tạo user khi DB lỗi ở bước kiểm tra trùng.
    // Expected: Throw DB error, argon2.hash KHÔNG được gọi.
    userModel.findOne.mockRejectedValue(new Error('Connection timeout'));

    await expect(
      authService.register(validRegisterDto),
    ).rejects.toThrow('Connection timeout');

    expect(mockedArgon2.hash).not.toHaveBeenCalled();
  });
});
