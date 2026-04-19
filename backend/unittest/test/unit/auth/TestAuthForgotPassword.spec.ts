import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { createHash } from 'crypto';

import jwtConfig from 'src/config/jwt.config';
import appConfig from 'src/config/app.config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MailService } from 'src/modules/auth/mail.service';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from 'src/database/schemas/password-reset-token.schema';

describe('TestAuthForgotPassword - Auth forgot/reset password API (Controller -> Service -> DB)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;

  let userModel: Model<any>;
  let passwordResetTokenModel: Model<any>;

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  async function registerUser(payload: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
  }) {
    return request(app.getHttpServer()).post('/auth/register').send(payload);
  }

  async function requestForgotPassword(email: string) {
    return request(app.getHttpServer()).post('/auth/forgot-password').send({ email });
  }

  async function requestResetPassword(payload: {
    token?: string;
    password?: string;
    confirmPassword?: string;
  }) {
    return request(app.getHttpServer()).post('/auth/reset-password').send(payload);
  }

  function hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async function createPasswordResetTokenDoc(payload: {
    rawToken: string;
    email: string;
    userId?: any;
    expiresAt?: Date;
    usedAt?: Date;
  }) {
    const tokenHash = hashResetToken(payload.rawToken);
    return passwordResetTokenModel.create({
      userId: payload.userId,
      email: payload.email.toLowerCase(),
      tokenHash,
      expiresAt: payload.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
      usedAt: payload.usedAt,
      requestIp: '127.0.0.1',
      userAgent: 'jest-test-agent',
    });
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'unit-test-secret-key';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.JWT_REFRESH_SECRET = 'unit-test-refresh-secret-key';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    mongoServer = await MongoMemoryServer.create();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [jwtConfig, appConfig],
        }),
        MongooseModule.forRoot(mongoServer.getUri()),
        AuthModule,
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
        ]),
      ],
    })
      .overrideProvider(MailService)
      .useValue(mailServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    userModel = moduleFixture.get<Model<any>>(getModelToken(User.name));
    passwordResetTokenModel = moduleFixture.get<Model<any>>(
      getModelToken(PasswordResetToken.name),
    );
  });

  beforeEach(async () => {
    await Promise.all([
      passwordResetTokenModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
    mailServiceMock.sendPasswordResetEmail.mockClear();
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  describe('forgotPasswordAndResetPassword() - 30 test case', () => {
    it('should_return_success_and_create_token_when_email_exists', async () => {
      // TC_AUTH_FP_001: return success and create token when email exists.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser01',
        fullName: 'Forgot Pass User 01',
        email: 'fpuser01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await requestForgotPassword('fpuser01@example.com');

      expect(response.status).toBe(200);
      expect(response.body?.success).toBe(true);
      const tokenInDb = await passwordResetTokenModel
        .findOne({ email: 'fpuser01@example.com' })
        .lean();
      expect(tokenInDb).toBeTruthy();
      expect(String((tokenInDb as any).tokenHash)).toHaveLength(64);
      expect((tokenInDb as any).userId).toBeDefined();
    });

    it('should_return_success_even_when_email_does_not_exist', async () => {
      // TC_AUTH_FP_002: return success even when email does not exist.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestForgotPassword('nouser_fp@example.com');

      expect(response.status).toBe(200);
      expect(String(response.body?.message ?? '')).toContain(
        'If an account exists for that email',
      );

      const tokenInDb = await passwordResetTokenModel
        .findOne({ email: 'nouser_fp@example.com' })
        .lean();
      expect(tokenInDb).toBeTruthy();
      expect((tokenInDb as any).userId).toBeFalsy();
    });

    it('should_normalize_email_to_lowercase_before_storing_token', async () => {
      // TC_AUTH_FP_003: normalize email to lowercase before storing token.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser03',
        fullName: 'Forgot Pass User 03',
        email: 'fpuser03@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await requestForgotPassword('FPUSER03@EXAMPLE.COM');

      expect(response.status).toBe(200);
      const tokenInDb = await passwordResetTokenModel
        .findOne({ email: 'fpuser03@example.com' })
        .lean();
      expect(tokenInDb).toBeTruthy();
    });

    it('should_return_bad_request_when_forgot_password_email_is_invalid', async () => {
      // TC_AUTH_FP_004: return bad request when forgot password email is invalid.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestForgotPassword('not-an-email');
      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_forgot_password_email_is_missing', async () => {
      // TC_AUTH_FP_005: return bad request when forgot password email is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({});
      expect(response.status).toBe(400);
    });

    it('should_return_configured_expires_in_minutes_in_response', async () => {
      // TC_AUTH_FP_006: return configured expires in minutes in response.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser06',
        fullName: 'Forgot Pass User 06',
        email: 'fpuser06@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await requestForgotPassword('fpuser06@example.com');

      expect(response.status).toBe(200);
      expect(response.body?.data?.expiresInMinutes).toBe(15);
    });

    it('should_create_distinct_token_hashes_for_multiple_requests', async () => {
      // TC_AUTH_FP_007: create distinct token hashes for multiple requests.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser07',
        fullName: 'Forgot Pass User 07',
        email: 'fpuser07@example.com',
        password: 'Password123',
        role: 'student',
      });

      await requestForgotPassword('fpuser07@example.com');
      await requestForgotPassword('fpuser07@example.com');

      const tokens = await passwordResetTokenModel
        .find({ email: 'fpuser07@example.com' })
        .sort({ createdAt: 1 })
        .lean();
      expect(tokens).toHaveLength(2);
      expect((tokens[0] as any).tokenHash).not.toBe((tokens[1] as any).tokenHash);
    });

    it('should_store_request_ip_and_user_agent_when_requesting_forgot_password', async () => {
      // TC_AUTH_FP_008: store request ip and user agent when requesting forgot password.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser08',
        fullName: 'Forgot Pass User 08',
        email: 'fpuser08@example.com',
        password: 'Password123',
        role: 'student',
      });

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .set('User-Agent', 'UnitTest-Agent/1.0')
        .send({ email: 'fpuser08@example.com' });

      const tokenInDb = await passwordResetTokenModel
        .findOne({ email: 'fpuser08@example.com' })
        .lean();
      expect((tokenInDb as any).requestIp).toBeDefined();
      expect(String((tokenInDb as any).userAgent ?? '')).toContain('UnitTest-Agent/1.0');
    });

    it('should_return_too_many_requests_when_exceeding_forgot_password_rate_limit', async () => {
      // TC_AUTH_FP_009: return too many requests when exceeding forgot password rate limit.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser09',
        fullName: 'Forgot Pass User 09',
        email: 'fpuser09@example.com',
        password: 'Password123',
        role: 'student',
      });

      for (let i = 0; i < 5; i += 1) {
        const res = await requestForgotPassword('fpuser09@example.com');
        expect(res.status).toBe(200);
      }

      const response = await requestForgotPassword('fpuser09@example.com');
      expect(response.status).toBe(429);
    });

    it('should_preserve_generic_message_shape_for_existing_and_unknown_emails', async () => {
      // TC_AUTH_FP_010: preserve generic message shape for existing and unknown emails.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser10',
        fullName: 'Forgot Pass User 10',
        email: 'fpuser10@example.com',
        password: 'Password123',
        role: 'student',
      });

      const resExisting = await requestForgotPassword('fpuser10@example.com');
      const resUnknown = await requestForgotPassword('unknown_fp10@example.com');

      expect(resExisting.status).toBe(200);
      expect(resUnknown.status).toBe(200);
      expect(resExisting.body?.message).toBe(resUnknown.body?.message);
    });

    it('should_call_mail_service_when_email_exists', async () => {
      // TC_AUTH_FP_011: call mail service when email exists.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser11',
        fullName: 'Forgot Pass User 11',
        email: 'fpuser11@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await requestForgotPassword('fpuser11@example.com');

      expect(response.status).toBe(200);
      expect(mailServiceMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('should_pass_fullname_to_mail_service_when_email_exists', async () => {
      // TC_AUTH_FP_012: pass fullname to mail service when email exists.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser12',
        fullName: 'Nguyen Van Test 12',
        email: 'fpuser12@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await requestForgotPassword('fpuser12@example.com');

      expect(response.status).toBe(200);
      const mailPayload = mailServiceMock.sendPasswordResetEmail.mock.calls[0]?.[0];
      expect(mailPayload?.to).toBe('fpuser12@example.com');
      expect(mailPayload?.fullName).toBe('Nguyen Van Test 12');
      expect(mailPayload?.resetUrl).toContain('token=');
    });

    it('should_not_call_mail_service_when_email_does_not_exist', async () => {
      // TC_AUTH_FP_013: not call mail service when email does not exist.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestForgotPassword('unknownmail13@example.com');

      expect(response.status).toBe(200);
      expect(mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should_apply_rate_limit_for_unknown_email_requests', async () => {
      // TC_AUTH_FP_014: apply rate limit for unknown email requests.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      for (let i = 0; i < 5; i += 1) {
        const res = await requestForgotPassword('unknown-limit@example.com');
        expect(res.status).toBe(200);
      }

      const response = await requestForgotPassword('unknown-limit@example.com');
      expect(response.status).toBe(429);
    });

    it('should_not_expose_raw_token_in_forgot_password_response', async () => {
      // TC_AUTH_FP_015: not expose raw token in forgot password response.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'fpuser15',
        fullName: 'Forgot Pass User 15',
        email: 'fpuser15@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await requestForgotPassword('fpuser15@example.com');

      expect(response.status).toBe(200);
      expect(response.body?.data?.token).toBeUndefined();
      expect(response.body?.token).toBeUndefined();
    });

    it('should_reset_password_successfully_with_valid_token_and_new_password', async () => {
      // TC_AUTH_FP_016: reset password successfully with valid token and new password.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'rpuser01',
        fullName: 'Reset Pass User 01',
        email: 'rpuser01@example.com',
        password: 'OldPassword123',
        role: 'student',
      });

      const user = await userModel.findOne({ username: 'rpuser01' }).lean();
      await createPasswordResetTokenDoc({
        rawToken: 'valid-token-rp-001',
        email: 'rpuser01@example.com',
        userId: (user as any)._id,
      });

      const resetResponse = await requestResetPassword({
        token: 'valid-token-rp-001',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(resetResponse.status).toBe(200);

      const loginOld = await request(app.getHttpServer()).post('/auth/login').send({
        identifier: 'rpuser01',
        password: 'OldPassword123',
      });
      const loginNew = await request(app.getHttpServer()).post('/auth/login').send({
        identifier: 'rpuser01',
        password: 'NewPassword123',
      });

      expect(loginOld.status).toBe(401);
      expect(loginNew.status).toBe(200);
    });

    it('should_return_bad_request_when_password_and_confirm_password_do_not_match', async () => {
      // TC_AUTH_FP_017: return bad request when password and confirm password do not match.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await createPasswordResetTokenDoc({
        rawToken: 'valid-token-rp-002',
        email: 'rpuser02@example.com',
      });

      const response = await requestResetPassword({
        token: 'valid-token-rp-002',
        password: 'NewPassword123',
        confirmPassword: 'MismatchPassword123',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_unauthorized_when_token_is_invalid', async () => {
      // TC_AUTH_FP_018: return unauthorized when token is invalid.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestResetPassword({
        token: 'non-existing-token',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_unauthorized_when_token_is_expired', async () => {
      // TC_AUTH_FP_019: return unauthorized when token is expired.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await createPasswordResetTokenDoc({
        rawToken: 'expired-token-rp-004',
        email: 'rpuser04@example.com',
        expiresAt: new Date(Date.now() - 60 * 1000),
      });

      const response = await requestResetPassword({
        token: 'expired-token-rp-004',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_unauthorized_when_token_was_already_used', async () => {
      // TC_AUTH_FP_020: return unauthorized when token was already used.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await createPasswordResetTokenDoc({
        rawToken: 'used-token-rp-005',
        email: 'rpuser05@example.com',
        usedAt: new Date(),
      });

      const response = await requestResetPassword({
        token: 'used-token-rp-005',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_not_found_when_user_linked_to_token_no_longer_exists', async () => {
      // TC_AUTH_FP_021: return not found when user linked to token no longer exists.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'rpuser06',
        fullName: 'Reset Pass User 06',
        email: 'rpuser06@example.com',
        password: 'OldPassword123',
        role: 'student',
      });

      const user = await userModel.findOne({ username: 'rpuser06' }).lean();
      await createPasswordResetTokenDoc({
        rawToken: 'valid-token-rp-006',
        email: 'rpuser06@example.com',
        userId: (user as any)._id,
      });

      await userModel.deleteOne({ _id: (user as any)._id });

      const response = await requestResetPassword({
        token: 'valid-token-rp-006',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(404);
    });

    it('should_mark_used_token_and_invalidate_other_unused_tokens_for_same_user', async () => {
      // TC_AUTH_FP_022: mark used token and invalidate other unused tokens for same user.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'rpuser07',
        fullName: 'Reset Pass User 07',
        email: 'rpuser07@example.com',
        password: 'OldPassword123',
        role: 'student',
      });

      const user = await userModel.findOne({ username: 'rpuser07' }).lean();
      const tokenA = await createPasswordResetTokenDoc({
        rawToken: 'valid-token-rp-007-a',
        email: 'rpuser07@example.com',
        userId: (user as any)._id,
      });
      const tokenB = await createPasswordResetTokenDoc({
        rawToken: 'valid-token-rp-007-b',
        email: 'rpuser07@example.com',
        userId: (user as any)._id,
      });

      const response = await requestResetPassword({
        token: 'valid-token-rp-007-a',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(200);

      const reloadedA = await passwordResetTokenModel.findById((tokenA as any)._id).lean();
      const reloadedB = await passwordResetTokenModel.findById((tokenB as any)._id).lean();
      expect((reloadedA as any).usedAt).toBeDefined();
      expect((reloadedB as any).usedAt).toBeDefined();
    });

    it('should_clear_refresh_token_hash_after_successful_password_reset', async () => {
      // TC_AUTH_FP_023: clear refresh token hash after successful password reset.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'rpuser08',
        fullName: 'Reset Pass User 08',
        email: 'rpuser08@example.com',
        password: 'OldPassword123',
        role: 'student',
      });

      await request(app.getHttpServer()).post('/auth/login').send({
        identifier: 'rpuser08',
        password: 'OldPassword123',
      });

      const user = await userModel.findOne({ username: 'rpuser08' }).lean();
      await createPasswordResetTokenDoc({
        rawToken: 'valid-token-rp-008',
        email: 'rpuser08@example.com',
        userId: (user as any)._id,
      });

      const response = await requestResetPassword({
        token: 'valid-token-rp-008',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(200);

      const userAfterReset = await userModel
        .findById((user as any)._id)
        .select('+refreshTokenHash')
        .lean();
      expect((userAfterReset as any).refreshTokenHash).toBeUndefined();
    });

    it('should_reset_password_when_token_has_leading_and_trailing_spaces', async () => {
      // TC_AUTH_FP_024: reset password when token has leading and trailing spaces.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'rpuser09',
        fullName: 'Reset Pass User 09',
        email: 'rpuser09@example.com',
        password: 'OldPassword123',
        role: 'student',
      });

      const user = await userModel.findOne({ username: 'rpuser09' }).lean();
      await createPasswordResetTokenDoc({
        rawToken: 'valid-token-rp-009',
        email: 'rpuser09@example.com',
        userId: (user as any)._id,
      });

      const response = await requestResetPassword({
        token: '  valid-token-rp-009  ',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(200);
    });

    it('should_return_bad_request_when_new_password_does_not_meet_complexity_rules', async () => {
      // TC_AUTH_FP_025: return bad request when new password does not meet complexity rules.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestResetPassword({
        token: 'any-token',
        password: 'alllowercase',
        confirmPassword: 'alllowercase',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_token_is_missing_in_reset_payload', async () => {
      // TC_AUTH_FP_026: return bad request when token is missing in reset payload.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestResetPassword({
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_password_is_missing_in_reset_payload', async () => {
      // TC_AUTH_FP_027: return bad request when password is missing in reset payload.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestResetPassword({
        token: 'valid-token-missing-password',
        confirmPassword: 'NewPassword123',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_confirm_password_is_missing_in_reset_payload', async () => {
      // TC_AUTH_FP_028: return bad request when confirm password is missing in reset payload.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await requestResetPassword({
        token: 'valid-token-missing-confirm',
        password: 'NewPassword123',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_unauthorized_when_reusing_same_token_after_successful_reset', async () => {
      // TC_AUTH_FP_029: return unauthorized when reusing same token after successful reset.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'rpuser14',
        fullName: 'Reset Pass User 14',
        email: 'rpuser14@example.com',
        password: 'OldPassword123',
        role: 'student',
      });

      const user = await userModel.findOne({ username: 'rpuser14' }).lean();
      await createPasswordResetTokenDoc({
        rawToken: 'reused-token-rp-014',
        email: 'rpuser14@example.com',
        userId: (user as any)._id,
      });

      const firstReset = await requestResetPassword({
        token: 'reused-token-rp-014',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
      const secondReset = await requestResetPassword({
        token: 'reused-token-rp-014',
        password: 'AnotherPassword123',
        confirmPassword: 'AnotherPassword123',
      });

      expect(firstReset.status).toBe(200);
      expect(secondReset.status).toBe(401);
    });

    it('should_return_unauthorized_when_using_sibling_token_after_first_token_reset', async () => {
      // TC_AUTH_FP_030: return unauthorized when using sibling token after first token reset.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'rpuser15',
        fullName: 'Reset Pass User 15',
        email: 'rpuser15@example.com',
        password: 'OldPassword123',
        role: 'student',
      });

      const user = await userModel.findOne({ username: 'rpuser15' }).lean();
      await createPasswordResetTokenDoc({
        rawToken: 'first-token-rp-015',
        email: 'rpuser15@example.com',
        userId: (user as any)._id,
      });
      await createPasswordResetTokenDoc({
        rawToken: 'second-token-rp-015',
        email: 'rpuser15@example.com',
        userId: (user as any)._id,
      });

      const firstReset = await requestResetPassword({
        token: 'first-token-rp-015',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
      const secondReset = await requestResetPassword({
        token: 'second-token-rp-015',
        password: 'AnotherPassword123',
        confirmPassword: 'AnotherPassword123',
      });

      expect(firstReset.status).toBe(200);
      expect(secondReset.status).toBe(401);
    });
  });
});
