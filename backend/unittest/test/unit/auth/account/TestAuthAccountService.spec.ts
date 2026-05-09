import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

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

describe('TestAuthAccountService - AuthService account management', () => {
  let authService: AuthService;
  let userModel: any;
  let jwtService: any;
  let configService: any;
  let passwordResetTokenModel: any;

  const createMockUser = (overrides: Partial<any> = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    username: 'student01',
    email: 'student01@test.com',
    passwordHash: 'argon2-hashed-password',
    fullName: 'Student One',
    role: 'student',
    dateOfBirth: new Date('2000-01-01'),
    imageUrl: 'https://example.com/avatar.jpg',
    citizenId: '123456789',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });

  beforeAll(async () => {
    const mockUserModel: any = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(PasswordResetToken.name), useValue: { findOne: jest.fn(), create: jest.fn(), countDocuments: jest.fn(), updateOne: jest.fn(), updateMany: jest.fn() } },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('mock-token'), verifyAsync: jest.fn() } },
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        { provide: MailService, useValue: { sendPasswordResetEmail: jest.fn() } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    passwordResetTokenModel = module.get(getModelToken(PasswordResetToken.name));
  });

  beforeEach(() => jest.clearAllMocks());

  // ==================== GET PROFILE ====================

  it('UA-077 — should_return_user_profile_with_all_fields', async () => {
    // UA-077: Lấy profile user thành công (MA-01-008).
    // Mô tả: Kiểm tra getProfile trả đúng cấu trúc dữ liệu user.
    // Expected: Trả user object có id, username, email, role, fullName, dateOfBirth, imageUrl, citizenId.
    const mockUser = createMockUser();
    userModel.findById.mockResolvedValue(mockUser);

    const result = await authService.getProfile('507f1f77bcf86cd799439011');

    expect(result.user).toBeDefined();
    expect(result.user.id).toBe('507f1f77bcf86cd799439011');
    expect(result.user.username).toBe('student01');
    expect(result.user.email).toBe('student01@test.com');
    expect(result.user.role).toBe('student');
    expect(result.user.fullName).toBe('Student One');
    expect(result.user.dateOfBirth).toEqual(new Date('2000-01-01'));
    expect(result.user.imageUrl).toBe('https://example.com/avatar.jpg');
    expect(result.user.citizenId).toBe('123456789');
  });

  it('UA-078 — should_throw_unauthorized_when_user_not_found_in_getProfile', async () => {
    // UA-078: User không tồn tại khi lấy profile.
    // Mô tả: Kiểm tra nhánh user == null → throw UnauthorizedException.
    // Expected: UnauthorizedException('User not found').
    userModel.findById.mockResolvedValue(null);

    await expect(authService.getProfile('nonexistent-id')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('UA-079 — should_return_null_for_optional_fields_when_not_set', async () => {
    // UA-079: Profile trả null cho các trường optional chưa set (MA-01-008 hiển thị --).
    // Mô tả: Kiểm tra dateOfBirth, imageUrl, citizenId trả null khi undefined.
    // Expected: fullName null, dateOfBirth null, imageUrl null, citizenId null.
    const mockUser = createMockUser({
      fullName: undefined,
      dateOfBirth: undefined,
      imageUrl: undefined,
      citizenId: undefined,
    });
    userModel.findById.mockResolvedValue(mockUser);

    const result = await authService.getProfile('507f1f77bcf86cd799439011');

    expect(result.user.fullName).toBeNull();
    expect(result.user.dateOfBirth).toBeNull();
    expect(result.user.imageUrl).toBeNull();
    expect(result.user.citizenId).toBeNull();
  });

  // ==================== UPDATE PROFILE ====================

  it('UA-080 — should_update_profile_with_all_fields_successfully', async () => {
    // UA-080: Cập nhật profile thành công với đủ trường (MA-01-032).
    // Mô tả: Kiểm tra updateProfile gọi findByIdAndUpdate với data đúng.
    // Expected: Trả user mới và message 'Profile updated successfully'.
    const updatedUser = createMockUser({ fullName: 'Updated Name' });
    userModel.findOne.mockResolvedValue(null);
    userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

    const result = await authService.updateProfile('507f1f77bcf86cd799439011', {
      fullName: 'Updated Name',
      email: 'new@test.com',
      dateOfBirth: '1995-06-15',
      citizenId: '987654321',
    });

    expect(result.message).toBe('Profile updated successfully');
    expect(result.user).toBeDefined();
    // CHECKDB: verify findByIdAndUpdate gọi đúng
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({
        fullName: 'Updated Name',
        email: 'new@test.com',
        citizenId: '987654321',
      }),
      { new: true, runValidators: true },
    );
  });

  it('UA-081 — should_throw_conflict_when_email_already_exists', async () => {
    // UA-081: Email trùng user khác khi cập nhật (MA-01-031 Fail).
    // Mô tả: Kiểm tra nhánh existingUser != null → throw ConflictException.
    // Expected: ConflictException('Email already exists').
    userModel.findOne.mockResolvedValue({ _id: 'other-user-id', email: 'taken@test.com' });

    await expect(
      authService.updateProfile('507f1f77bcf86cd799439011', { email: 'taken@test.com' }),
    ).rejects.toThrow('Email already exists');
  });

  it('UA-082 — should_not_check_email_when_not_provided', async () => {
    // UA-082: Khi không gửi email, skip email check.
    // Mô tả: Kiểm tra nhánh email falsy → không gọi findOne.
    // Expected: userModel.findOne không được gọi cho email check.
    const updatedUser = createMockUser({ fullName: 'Only Name' });
    userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

    await authService.updateProfile('507f1f77bcf86cd799439011', { fullName: 'Only Name' });

    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it('UA-083 — should_throw_unauthorized_when_user_not_found_after_update', async () => {
    // UA-083: User bị xóa giữa chừng khi update.
    // Mô tả: Kiểm tra nhánh updatedUser == null → throw UnauthorizedException.
    // Expected: UnauthorizedException('User not found').
    userModel.findByIdAndUpdate.mockResolvedValue(null);

    await expect(
      authService.updateProfile('deleted-user-id', { fullName: 'Name' }),
    ).rejects.toThrow('User not found');
  });

  it('UA-084 — should_only_update_provided_fields_partial_update', async () => {
    // UA-084: Chỉ gửi 1 trường, các trường khác không bị ghi đè.
    // Mô tả: Kiểm tra partial update chỉ set fullName, không set email/dateOfBirth.
    // Expected: updateData chỉ có fullName, không có email, dateOfBirth.
    const updatedUser = createMockUser();
    userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

    await authService.updateProfile('507f1f77bcf86cd799439011', { fullName: 'New Name' });

    const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
    expect(updateCall).toHaveProperty('fullName', 'New Name');
    expect(updateCall).not.toHaveProperty('email');
    expect(updateCall).not.toHaveProperty('dateOfBirth');
    expect(updateCall).not.toHaveProperty('imageUrl');
    expect(updateCall).not.toHaveProperty('citizenId');
  });

  it('UA-085 — should_update_imageUrl_for_avatar_upload', async () => {
    // UA-085: Cập nhật imageUrl khi upload ảnh đại diện (MA-01-063).
    // Mô tả: FE upload ảnh lên Cloudinary → gọi updateProfile({imageUrl}).
    // Expected: imageUrl lưu vào DB qua findByIdAndUpdate.
    const cloudinaryUrl = 'https://res.cloudinary.com/dl9mhhoqs/image/upload/v123/avatar.jpg';
    const updatedUser = createMockUser({ imageUrl: cloudinaryUrl });
    userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

    const result = await authService.updateProfile('507f1f77bcf86cd799439011', {
      imageUrl: cloudinaryUrl,
    });

    // CHECKDB: verify imageUrl lưu đúng
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({ imageUrl: cloudinaryUrl }),
      { new: true, runValidators: true },
    );
    expect(result.user).toBeDefined();
  });

  it('UA-115 — should_store_xss_payload_safely_in_fullName', async () => {
    // UA-115: XSS trong fullName được lưu an toàn (không execute).
    // Mô tả: Kiểm tra fullName chứa script tag được lưu as-is (output encoding ở FE).
    // Expected: fullName lưu nguyên chuỗi, không crash service.
    const xssPayload = '<script>alert("XSS")</script>';
    const updatedUser = createMockUser({ fullName: xssPayload });
    userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

    const result = await authService.updateProfile('507f1f77bcf86cd799439011', {
      fullName: xssPayload,
    });

    expect(result.user.fullName).toBe(xssPayload);
  });

  it('UA-087 — should_convert_dateOfBirth_string_to_date_object', async () => {
    // UA-087: dateOfBirth string được convert sang Date trước khi lưu.
    // Mô tả: Kiểm tra new Date(dateOfBirth) gọi đúng trong updateData.
    // Expected: updateData.dateOfBirth là Date object.
    const updatedUser = createMockUser();
    userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

    await authService.updateProfile('507f1f77bcf86cd799439011', {
      dateOfBirth: '1995-06-15',
    });

    const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
    expect(updateCall.dateOfBirth).toBeInstanceOf(Date);
    expect(updateCall.dateOfBirth.toISOString()).toContain('1995-06-15');
  });

  // ==================== CHANGE PASSWORD ====================

  it('UA-088 — should_change_password_successfully', async () => {
    // UA-088: Đổi mật khẩu thành công (MA-01-046).
    // Mô tả: Kiểm tra full flow: verify current → check not same → hash new → update DB.
    // Expected: message 'Password changed successfully', refreshTokenHash bị xóa.
    const mockUser = createMockUser();
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.verify
      .mockResolvedValueOnce(true)   // currentPassword đúng
      .mockResolvedValueOnce(false); // newPassword khác current
    mockedArgon2.hash.mockResolvedValue('new-argon2-hash');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await authService.changePassword('507f1f77bcf86cd799439011', {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass456',
    });

    expect(result.message).toBe('Password changed successfully');
    // CHECKDB: verify DB update + refreshTokenHash bị xóa
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      passwordHash: 'new-argon2-hash',
      $unset: { refreshTokenHash: 1 },
    });
  });

  it('UA-089 — should_throw_unauthorized_when_current_password_wrong', async () => {
    // UA-089: Nhập sai current password → throw 401 (MA-01-045 Fail, MA-01-078 root cause).
    // Mô tả: Backend dùng UnauthorizedException cho sai password → FE interceptor auto-logout.
    // Expected: UnauthorizedException('Current password is incorrect').
    const mockUser = createMockUser();
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.verify.mockResolvedValue(false);

    await expect(
      authService.changePassword('507f1f77bcf86cd799439011', {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPass456',
      }),
    ).rejects.toThrow('Current password is incorrect');
  });

  it('UA-090 — should_throw_conflict_when_new_password_same_as_current', async () => {
    // UA-090: Password mới trùng cũ → throw 409 (MA-01-047 Fail).
    // Mô tả: Backend trả ConflictException nhưng FE chỉ hiện "Failed to change password".
    // Expected: ConflictException('New password must be different from current password').
    const mockUser = createMockUser();
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.verify
      .mockResolvedValueOnce(true)  // currentPassword đúng
      .mockResolvedValueOnce(true); // newPassword TRÙNG current

    await expect(
      authService.changePassword('507f1f77bcf86cd799439011', {
        currentPassword: 'OldPass123',
        newPassword: 'OldPass123',
      }),
    ).rejects.toThrow('New password must be different from current password');
  });

  it('UA-091 — should_throw_unauthorized_when_user_not_found_in_changePassword', async () => {
    // UA-091: User không tồn tại khi đổi mật khẩu.
    // Mô tả: Kiểm tra nhánh user == null → throw UnauthorizedException.
    // Expected: UnauthorizedException('User not found').
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(
      authService.changePassword('nonexistent-id', {
        currentPassword: 'any',
        newPassword: 'any123',
      }),
    ).rejects.toThrow('User not found');
  });

  it('UA-092 — should_clear_refreshTokenHash_after_password_change', async () => {
    // UA-092: Sau đổi mật khẩu, refreshTokenHash bị xóa (force re-login).
    // Mô tả: Kiểm tra $unset refreshTokenHash trong update → tất cả session cũ bị invalidate.
    // Expected: $unset: { refreshTokenHash: 1 } trong DB update call.
    const mockUser = createMockUser();
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockedArgon2.hash.mockResolvedValue('new-hash');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    await authService.changePassword('507f1f77bcf86cd799439011', {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass456',
    });

    // CHECKDB: verify refreshTokenHash bị xóa
    const updateArg = userModel.findByIdAndUpdate.mock.calls[0][1];
    expect(updateArg.$unset).toEqual({ refreshTokenHash: 1 });
  });

  it('UA-093 — should_hash_new_password_with_argon2_before_saving', async () => {
    // UA-093: Password mới được hash bằng argon2 trước khi lưu.
    // Mô tả: Kiểm tra argon2.hash gọi với newPassword, lưu hash vào DB.
    // Expected: argon2.hash gọi 1 lần, kết quả lưu vào passwordHash.
    const mockUser = createMockUser();
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockedArgon2.hash.mockResolvedValue('argon2-new-hash-xyz');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    await authService.changePassword('507f1f77bcf86cd799439011', {
      currentPassword: 'OldPass123',
      newPassword: 'BrandNewPass789',
    });

    expect(mockedArgon2.hash).toHaveBeenCalledWith('BrandNewPass789');
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({ passwordHash: 'argon2-new-hash-xyz' }),
    );
  });

  // ==================== REFRESH TOKENS ====================

  it('UA-094 — should_refresh_tokens_successfully_with_valid_refresh_token', async () => {
    // UA-094: Refresh token thành công.
    // Mô tả: verifyAsync OK → findById có refreshTokenHash → argon2 verify match → trả tokens mới.
    // Expected: Trả accessToken + refreshToken mới, DB cập nhật refreshTokenHash.
    jwtService.verifyAsync.mockResolvedValue({ sub: '507f1f77bcf86cd799439011', email: 'test@test.com', role: 'student' });
    const mockUser = createMockUser({ refreshTokenHash: 'stored-hash' });
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.verify.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('new-mock-token');
    mockedArgon2.hash.mockResolvedValue('new-refresh-hash');
    userModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await authService.refreshTokens({ refreshToken: 'valid-refresh-token' });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    // UA-095: verify updateRefreshToken được gọi
    expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('UA-095 — should_throw_unauthorized_when_refresh_token_expired_or_invalid', async () => {
    // UA-095: Refresh token hết hạn hoặc sai.
    // Mô tả: jwtService.verifyAsync reject → catch throw UnauthorizedException.
    // Expected: UnauthorizedException('Invalid or expired refresh token').
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(
      authService.refreshTokens({ refreshToken: 'expired-token' }),
    ).rejects.toThrow('Invalid or expired refresh token');
  });

  it('UA-096 — should_throw_unauthorized_when_user_not_found_for_refresh', async () => {
    // UA-096: User không tồn tại khi refresh token.
    // Mô tả: verifyAsync OK nhưng findById trả null.
    // Expected: UnauthorizedException('Invalid refresh token').
    jwtService.verifyAsync.mockResolvedValue({ sub: 'deleted-user-id' });
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(
      authService.refreshTokens({ refreshToken: 'token-of-deleted-user' }),
    ).rejects.toThrow('Invalid refresh token');
  });

  it('UA-097 — should_throw_unauthorized_when_refreshTokenHash_is_null', async () => {
    // UA-097: User tồn tại nhưng refreshTokenHash đã bị xóa (sau changePassword).
    // Mô tả: user.refreshTokenHash falsy → throw.
    // Expected: UnauthorizedException('Invalid refresh token').
    jwtService.verifyAsync.mockResolvedValue({ sub: '507f1f77bcf86cd799439011' });
    const mockUser = createMockUser({ refreshTokenHash: null });
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

    await expect(
      authService.refreshTokens({ refreshToken: 'token-after-password-change' }),
    ).rejects.toThrow('Invalid refresh token');
  });

  it('UA-098 — should_throw_unauthorized_when_refresh_token_hash_mismatch', async () => {
    // UA-098: Hash không khớp (dùng token cũ sau khi đã refresh).
    // Mô tả: argon2.verify trả false → throw.
    // Expected: UnauthorizedException('Invalid refresh token').
    jwtService.verifyAsync.mockResolvedValue({ sub: '507f1f77bcf86cd799439011' });
    const mockUser = createMockUser({ refreshTokenHash: 'stored-hash' });
    userModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
    mockedArgon2.verify.mockResolvedValue(false);

    await expect(
      authService.refreshTokens({ refreshToken: 'old-refresh-token' }),
    ).rejects.toThrow('Invalid refresh token');
  });

  // ==================== VALIDATE USER ====================

  it('UA-099 — should_throw_unauthorized_in_validateUser_when_user_deleted', async () => {
    // UA-099: validateUser khi user bị xóa sau khi JWT cấp.
    // Mô tả: JwtStrategy gọi validateUser → findById trả null → throw.
    // Expected: UnauthorizedException('User not found').
    userModel.findById.mockResolvedValue(null);

    await expect(
      authService.validateUser({ sub: 'deleted-id', email: 'x@test.com', role: 'student' }),
    ).rejects.toThrow('User not found');
  });

  it('UA-100 — should_return_sanitized_user_in_validateUser_when_user_exists', async () => {
    // UA-100: validateUser thành công trả user đã sanitize.
    // Mô tả: findById trả user → sanitizeUser → trả IUserProfile không có passwordHash.
    // Expected: Trả user object không có passwordHash/refreshTokenHash.
    const mockUser = createMockUser();
    userModel.findById.mockResolvedValue(mockUser);

    const result = await authService.validateUser({ sub: '507f1f77bcf86cd799439011', email: 'test@test.com', role: 'student' });

    expect(result.id).toBe('507f1f77bcf86cd799439011');
    expect(result.username).toBe('student01');
    expect((result as any).passwordHash).toBeUndefined();
    expect((result as any).refreshTokenHash).toBeUndefined();
  });

  it('UA-125 — should_map_optional_profile_fields_in_sanitizeUser_when_missing', async () => {
    // UA-125: validateUser với optional fields thiếu -> sanitizeUser map đúng null/undefined.
    const mockUser = createMockUser({
      fullName: undefined,
      dateOfBirth: undefined,
      imageUrl: undefined,
      citizenId: undefined,
    });
    userModel.findById.mockResolvedValue(mockUser);

    const result = await authService.validateUser({
      sub: '507f1f77bcf86cd799439011',
      email: 'test@test.com',
      role: 'student',
    });

    expect(result.fullName).toBeNull();
    expect(result.dateOfBirth).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
    expect(result.citizenId).toBeUndefined();
  });
});
