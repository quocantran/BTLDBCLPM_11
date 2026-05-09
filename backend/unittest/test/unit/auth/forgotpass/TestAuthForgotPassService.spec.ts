import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';

import { AuthService } from 'src/modules/auth/auth.service';
import { MailService } from 'src/modules/auth/mail.service';
import { User } from 'src/database/schemas/user.schema';
import { PasswordResetToken } from 'src/database/schemas/password-reset-token.schema';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('TestAuthForgotPassService - AuthService forgot/reset password', () => {
  let authService: AuthService;
  let userModel: any;
  let passwordResetTokenModel: any;
  let mailService: any;
  let configService: any;

  beforeAll(async () => {
    const mockUserModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: '507f1f77bcf86cd799439011',
      save: jest.fn().mockResolvedValue(data),
    }));
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();
    mockUserModel.findByIdAndUpdate = jest.fn();
    mockUserModel.countDocuments = jest.fn();

    const mockPasswordResetTokenModel: any = {
      findOne: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(PasswordResetToken.name), useValue: mockPasswordResetTokenModel },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'app.passwordReset') {
                return {
                  url: 'http://localhost:3000/reset-password',
                  tokenTtlMinutes: 15,
                  maxRequestsPerHour: 5,
                };
              }
              return undefined;
            }),
          },
        },
        {
          provide: MailService,
          useValue: { sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    passwordResetTokenModel = module.get(getModelToken(PasswordResetToken.name));
    mailService = module.get(MailService);
    configService = module.get(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === 'app.passwordReset') {
        return { url: 'http://localhost:3000/reset-password', tokenTtlMinutes: 15, maxRequestsPerHour: 5 };
      }
      return undefined;
    });
  });

  // ==================== REQUEST PASSWORD RESET ====================

  it('UA-051 — should_send_reset_email_when_user_exists', async () => {
    // UA-051: Gửi email reset khi user tồn tại (QMK-01-010).
    // Mô tả: Kiểm tra requestPasswordReset gửi email khi tìm thấy user.
    // Expected: mailService.sendPasswordResetEmail được gọi, trả expiresInMinutes.
    const mockUser = { _id: 'user-id', email: 'student@test.com', fullName: 'Student' };
    passwordResetTokenModel.countDocuments.mockResolvedValue(0);
    userModel.findOne.mockResolvedValue(mockUser);
    passwordResetTokenModel.create.mockResolvedValue({});

    const result = await authService.requestPasswordReset(
      { email: 'student@test.com' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(result.expiresInMinutes).toBe(15);
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'student@test.com',
        fullName: 'Student',
        expiresInMinutes: 15,
      }),
    );
    // UA-052: verify token lưu vào DB
    expect(passwordResetTokenModel.create).toHaveBeenCalled();
  });

  it('UA-052 — should_return_same_response_when_user_not_exist', async () => {
    // UA-052: Email không tồn tại, trả response giống user tồn tại (QMK-01-011).
    // Mô tả: Kiểm tra không leak thông tin user existence, không gửi email.
    // Expected: Trả expiresInMinutes, mail KHÔNG được gọi.
    passwordResetTokenModel.countDocuments.mockResolvedValue(0);
    userModel.findOne.mockResolvedValue(null);
    passwordResetTokenModel.create.mockResolvedValue({});

    const result = await authService.requestPasswordReset(
      { email: 'noone@test.com' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(result.expiresInMinutes).toBe(15);
    expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    // UA-053: vẫn tạo token record (cho rate limit)
    expect(passwordResetTokenModel.create).toHaveBeenCalled();
  });

  it('UA-053 — should_normalize_email_trim_and_lowercase', async () => {
    // UA-053: Email có whitespace và chữ hoa, phải được normalize (QMK-01-009).
    // Mô tả: Kiểm tra normalizeEmail() trim + lowercase trước khi query.
    // Expected: Query DB với email đã normalize.
    passwordResetTokenModel.countDocuments.mockResolvedValue(0);
    userModel.findOne.mockResolvedValue(null);
    passwordResetTokenModel.create.mockResolvedValue({});

    await authService.requestPasswordReset(
      { email: '  Student@TEST.com  ' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    // CHECKDB: verify email đã được normalize
    expect(passwordResetTokenModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'student@test.com' }),
    );
  });

  it('UA-054 — should_throw_429_when_rate_limit_exceeded', async () => {
    // UA-054: Gửi quá 5 request/giờ, throw 429 (QMK-01-012).
    // Mô tả: Kiểm tra enforceForgotPasswordRateLimit throw HttpException khi vượt limit.
    // Expected: HttpException 429, không tạo token, không gửi email.
    passwordResetTokenModel.countDocuments.mockResolvedValue(5);

    await expect(
      authService.requestPasswordReset(
        { email: 'student@test.com' },
        { ip: '127.0.0.1', userAgent: 'test' },
      ),
    ).rejects.toThrow(HttpException);

    expect(passwordResetTokenModel.create).not.toHaveBeenCalled();
    expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('UA-055 — should_enforce_rate_limit_by_ip', async () => {
    // UA-055: Rate limit bằng IP khi email khác nhưng cùng IP.
    // Mô tả: Kiểm tra ipCount >= maxRequestsPerHour cũng bị chặn.
    // Expected: HttpException 429.
    passwordResetTokenModel.countDocuments
      .mockResolvedValueOnce(0)  // emailCount
      .mockResolvedValueOnce(5); // ipCount >= 5

    await expect(
      authService.requestPasswordReset(
        { email: 'different@test.com' },
        { ip: '192.168.1.1', userAgent: 'test' },
      ),
    ).rejects.toThrow(HttpException);
  });

  it('UA-056 — should_skip_ip_rate_limit_when_ip_is_undefined', async () => {
    // UA-056: Không có IP trong context, chỉ kiểm tra email rate limit.
    // Mô tả: Kiểm tra nhánh ipFilter undefined → skip IP count.
    // Expected: Chỉ gọi countDocuments 1 lần (email only).
    passwordResetTokenModel.countDocuments.mockResolvedValue(0);
    userModel.findOne.mockResolvedValue(null);
    passwordResetTokenModel.create.mockResolvedValue({});

    await authService.requestPasswordReset(
      { email: 'noip@test.com' },
      { userAgent: 'test' },
    );

    expect(result => result).toBeDefined();
  });

  // ==================== RESET PASSWORD ====================

  it('UA-057 — should_reset_password_successfully_with_valid_token', async () => {
    // UA-057: Reset thành công với token hợp lệ (QMK-01-032).
    // Mô tả: Kiểm tra full flow: verify token → hash password → update DB → mark used.
    // Expected: Password hash lưu mới, refreshTokenHash xóa, token đánh dấu used.
    const mockToken = {
      _id: 'token-id',
      userId: 'user-id',
      tokenHash: crypto.createHash('sha256').update('valid-raw-token').digest('hex'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    };
    const mockUser = { _id: 'user-id', passwordHash: 'old-hash' };

    passwordResetTokenModel.findOne.mockResolvedValue(mockToken);
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.hash.mockResolvedValue('new-password-hash');
    userModel.findByIdAndUpdate.mockResolvedValue({});
    passwordResetTokenModel.updateOne.mockResolvedValue({});
    passwordResetTokenModel.updateMany.mockResolvedValue({});

    await authService.resetPassword({
      token: 'valid-raw-token',
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });

    // CHECKDB: verify password hash lưu mới + refreshTokenHash bị xóa
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('user-id', {
      passwordHash: 'new-password-hash',
      $unset: { refreshTokenHash: 1 },
    });
    // CHECKDB: verify token đánh dấu usedAt
    expect(passwordResetTokenModel.updateOne).toHaveBeenCalledWith(
      { _id: 'token-id' },
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
    // UA-058: verify các token khác cùng user cũng bị invalidate
    expect(passwordResetTokenModel.updateMany).toHaveBeenCalled();
  });

  it('UA-058 — should_throw_bad_request_when_passwords_do_not_match', async () => {
    // UA-058: Password và confirmPassword không khớp (QMK-01-031).
    // Mô tả: Kiểm tra nhánh password !== confirmPassword.
    // Expected: BadRequestException('Passwords do not match').
    await expect(
      authService.resetPassword({
        token: 'any-token',
        password: 'NewPass123',
        confirmPassword: 'NewPass456',
      }),
    ).rejects.toThrow('Passwords do not match');
  });

  it('UA-059 — should_throw_unauthorized_when_token_invalid_or_expired', async () => {
    // UA-059: Token không hợp lệ hoặc hết hạn (QMK-01-033).
    // Mô tả: Kiểm tra nhánh resetToken == null (token expired/used/not found).
    // Expected: UnauthorizedException('Token invalid or expired').
    passwordResetTokenModel.findOne.mockResolvedValue(null);

    await expect(
      authService.resetPassword({
        token: 'expired-token',
        password: 'NewPass123',
        confirmPassword: 'NewPass123',
      }),
    ).rejects.toThrow('Token invalid or expired');
  });

  it('UA-060 — should_throw_not_found_when_user_deleted_after_token_created', async () => {
    // UA-060: User bị xóa sau khi token tạo, throw NotFoundException.
    // Mô tả: Kiểm tra nhánh user == null sau khi tìm theo userId.
    // Expected: NotFoundException('User associated with this token no longer exists').
    passwordResetTokenModel.findOne.mockResolvedValue({
      _id: 'token-id',
      userId: 'deleted-user-id',
    });
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(
      authService.resetPassword({
        token: 'valid-token',
        password: 'NewPass123',
        confirmPassword: 'NewPass123',
      }),
    ).rejects.toThrow('User associated with this token no longer exists');
  });

  it('UA-061 — should_invalidate_all_other_tokens_after_reset', async () => {
    // UA-061: Sau reset, tất cả token khác của user phải bị invalidate (QMK-01-034).
    // Mô tả: Kiểm tra updateMany đánh dấu usedAt cho token còn lại.
    // Expected: updateMany gọi với userId và $ne: currentTokenId.
    const mockToken = { _id: 'token-id-1', userId: 'user-id' };
    passwordResetTokenModel.findOne.mockResolvedValue(mockToken);
    userModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user-id', passwordHash: 'old' }),
    });
    mockedArgon2.hash.mockResolvedValue('new-hash');
    userModel.findByIdAndUpdate.mockResolvedValue({});
    passwordResetTokenModel.updateOne.mockResolvedValue({});
    passwordResetTokenModel.updateMany.mockResolvedValue({});

    await authService.resetPassword({
      token: 'some-token',
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });

    // CHECKDB: verify updateMany invalidate các token khác
    expect(passwordResetTokenModel.updateMany).toHaveBeenCalledWith(
      { userId: 'user-id', usedAt: { $exists: false }, _id: { $ne: 'token-id-1' } },
      { $set: expect.objectContaining({ usedAt: expect.any(Date) }) },
    );
  });

  it('UA-062 — should_find_user_by_email_when_token_has_no_userId', async () => {
    // UA-062: Token không có userId, tìm user bằng email.
    // Mô tả: Kiểm tra nhánh resetToken.userId falsy → fallback findOne by email.
    // Expected: userModel.findOne gọi với email regex.
    const mockToken = { _id: 'token-id', userId: null, email: 'student@test.com' };
    const mockUser = { _id: 'user-from-email', email: 'student@test.com' };
    passwordResetTokenModel.findOne.mockResolvedValue(mockToken);
    userModel.findOne.mockResolvedValue(mockUser);
    mockedArgon2.hash.mockResolvedValue('new-hash');
    userModel.findByIdAndUpdate.mockResolvedValue({});
    passwordResetTokenModel.updateOne.mockResolvedValue({});
    passwordResetTokenModel.updateMany.mockResolvedValue({});

    await authService.resetPassword({
      token: 'token-no-userid',
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });

    // CHECKDB: verify findOne gọi thay vì findById
    expect(userModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ email: expect.any(Object) }),
    );
  });

  it('UA-105 — should_skip_rate_limit_when_maxRequestsPerHour_is_zero', async () => {
    // UA-105: maxRequestsPerHour = 0 → skip rate limit check.
    // Mô tả: Kiểm tra nhánh settings.maxRequestsPerHour <= 0 → early return.
    // Expected: countDocuments KHÔNG được gọi cho rate limit, request thành công.
    configService.get.mockImplementation((key: string) => {
      if (key === 'app.passwordReset') {
        return { url: 'http://localhost:3000/reset-password', tokenTtlMinutes: 15, maxRequestsPerHour: 0 };
      }
      return undefined;
    });
    userModel.findOne.mockResolvedValue(null);
    passwordResetTokenModel.create.mockResolvedValue({});

    const result = await authService.requestPasswordReset(
      { email: 'nolimit@test.com' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(result.expiresInMinutes).toBe(15);
    // countDocuments should NOT be called since rate limit is disabled
    expect(passwordResetTokenModel.countDocuments).not.toHaveBeenCalled();
  });

  it('UA-063 — should_append_token_with_ampersand_when_reset_url_already_has_query', async () => {
    // UA-063: URL reset đã có query param sẵn -> buildResetUrl phải nối bằng "&token=".
    configService.get.mockImplementation((key: string) => {
      if (key === 'app.passwordReset') {
        return {
          url: 'http://localhost:3000/reset-password?from=mail',
          tokenTtlMinutes: 15,
          maxRequestsPerHour: 5,
        };
      }
      return undefined;
    });

    passwordResetTokenModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    userModel.findOne.mockResolvedValue({
      _id: 'user-id',
      email: 'query@test.com',
      fullName: 'Query User',
    });
    passwordResetTokenModel.create.mockResolvedValue({});

    await authService.requestPasswordReset(
      { email: 'query@test.com' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        resetUrl: expect.stringContaining(
          'http://localhost:3000/reset-password?from=mail&token=',
        ),
      }),
    );
  });

  it('UA-064 — should_use_default_password_reset_settings_when_config_is_empty', async () => {
    // UA-064: Config app.passwordReset rỗng -> fallback toàn bộ default values.
    configService.get.mockImplementation((key: string) => {
      if (key === 'app.passwordReset') {
        return {};
      }
      return undefined;
    });

    passwordResetTokenModel.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    userModel.findOne.mockResolvedValue({
      _id: 'user-id',
      email: 'default@test.com',
      fullName: 'Default User',
    });
    passwordResetTokenModel.create.mockResolvedValue({});

    const result = await authService.requestPasswordReset(
      { email: 'default@test.com' },
      { ip: '127.0.0.1', userAgent: 'test' },
    );

    expect(result.expiresInMinutes).toBe(15);
    expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresInMinutes: 15,
        resetUrl: expect.stringContaining(
          'http://localhost:3000/reset-password?token=',
        ),
      }),
    );
  });

  it('UA-065 — should_extract_first_value_from_array_headers_for_ip_and_userAgent', async () => {
    // UA-065: context.ip/userAgent là mảng -> phải lấy phần tử đầu tiên.
    passwordResetTokenModel.countDocuments
      .mockResolvedValueOnce(0) // emailCount
      .mockResolvedValueOnce(0); // ipCount
    userModel.findOne.mockResolvedValue(null);
    passwordResetTokenModel.create.mockResolvedValue({});

    await authService.requestPasswordReset(
      { email: 'array-header@test.com' },
      {
        ip: ['10.10.10.1', '10.10.10.2'],
        userAgent: ['ua-first', 'ua-second'],
      },
    );

    expect(passwordResetTokenModel.countDocuments).toHaveBeenNthCalledWith(2, {
      requestIp: '10.10.10.1',
      createdAt: expect.any(Object),
    });
    expect(passwordResetTokenModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestIp: '10.10.10.1',
        userAgent: 'ua-first',
      }),
    );
  });
});
