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

import jwtConfig from 'src/config/jwt.config';
import appConfig from 'src/config/app.config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MailService } from 'src/modules/auth/mail.service';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from 'src/database/schemas/password-reset-token.schema';
import { createHash } from 'crypto';

describe('TestAuthForgotPassController - AuthController forgot/reset password HTTP pipeline', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;

  let userModel: Model<any>;
  let passwordResetTokenModel: Model<any>;

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  async function registerUser(payload: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/auth/register').send(payload);
  }

  async function forgotPassword(payload: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/auth/forgot-password').send(payload);
  }

  async function resetPassword(payload: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/auth/reset-password').send(payload);
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

  // ==================== FORGOT PASSWORD ====================

  it('UA-066 — should_return_200_with_generic_message_for_existing_email', async () => {
    // UA-066: Gửi forgot password cho email tồn tại (QMK-01-010).
    // Mô tả: Kiểm tra POST /auth/forgot-password trả 200 và gửi email.
    // Expected: HTTP 200, message generic, mailService được gọi.
    await registerUser({
      username: 'fpuser01', fullName: 'FP User', email: 'fp01@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await forgotPassword({ email: 'fp01@test.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('If an account exists');
    expect(response.body.data.expiresInMinutes).toBeDefined();
    expect(mailServiceMock.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('UA-067 — should_return_200_with_same_message_for_nonexistent_email', async () => {
    // UA-067: Email không tồn tại, trả response giống email tồn tại (QMK-01-011).
    // Mô tả: Kiểm tra không leak thông tin user existence qua HTTP response.
    // Expected: HTTP 200, cùng message, mail KHÔNG được gọi.
    const response = await forgotPassword({ email: 'nobody@test.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('If an account exists');
    expect(mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('UA-068 — should_return_400_when_email_is_missing', async () => {
    // UA-068: Thiếu trường email (QMK-01-007).
    // Mô tả: Kiểm tra ForgotPasswordDto @IsEmail() validation.
    // Expected: HTTP 400.
    const response = await forgotPassword({});

    expect(response.status).toBe(400);
  });

  it('UA-110 — should_return_400_when_email_format_invalid', async () => {
    // UA-110: Email sai định dạng (QMK-01-008).
    // Mô tả: Kiểm tra @IsEmail() reject email không hợp lệ.
    // Expected: HTTP 400.
    const response = await forgotPassword({ email: 'abc@' });

    expect(response.status).toBe(400);
  });

  it('UA-070 — should_create_token_in_db_after_forgot_password', async () => {
    // UA-070: Sau forgot password, token lưu vào DB.
    // Mô tả: Kiểm tra DB state có PasswordResetToken mới.
    // Expected: DB có 1 token record với email đúng.
    await registerUser({
      username: 'fpdb01', fullName: 'FP DB', email: 'fpdb@test.com',
      password: 'Password123', role: 'student',
    });

    await forgotPassword({ email: 'fpdb@test.com' });

    // CHECKDB: verify token được tạo
    const tokenCount = await passwordResetTokenModel.countDocuments({ email: 'fpdb@test.com' });
    expect(tokenCount).toBe(1);
  });

  // ==================== RESET PASSWORD ====================

  it('UA-071 — should_reset_password_successfully_and_login_with_new_password', async () => {
    // UA-071: Reset password thành công, login bằng password mới (QMK-01-032, QMK-01-037).
    // Mô tả: Full flow: register → forgot → tạo token → reset → login bằng password mới.
    // Expected: HTTP 200 cho reset, login mới thành công, login cũ thất bại.
    await registerUser({
      username: 'resetuser', fullName: 'Reset User', email: 'reset@test.com',
      password: 'OldPass123', role: 'student',
    });

    await forgotPassword({ email: 'reset@test.com' });

    // Lấy token từ DB
    const tokenDoc = await passwordResetTokenModel.findOne({ email: 'reset@test.com' }).lean();
    expect(tokenDoc).toBeDefined();

    // Tìm rawToken: Vì service hash rawToken bằng SHA256, ta cần lấy từ mailService mock
    const mailCall = mailServiceMock.sendPasswordResetEmail.mock.calls[0][0];
    const resetUrl: string = mailCall.resetUrl;
    const rawToken = new URL(resetUrl).searchParams.get('token');

    const resetResponse = await resetPassword({
      token: rawToken,
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toContain('Password updated successfully');

    // CHECKDB: login với password mới thành công
    const loginNew = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'resetuser', password: 'NewPass123' });
    expect(loginNew.status).toBe(200);

    // CHECKDB: login với password cũ thất bại (QMK-01-036)
    const loginOld = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'resetuser', password: 'OldPass123' });
    expect(loginOld.status).toBe(401);
  });

  it('UA-072 — should_return_400_when_passwords_do_not_match', async () => {
    // UA-072: Password và confirmPassword không khớp (QMK-01-031).
    // Mô tả: Kiểm tra validation password mismatch tại service level.
    // Expected: HTTP 400.
    await registerUser({
      username: 'mismatch01', fullName: 'Mismatch', email: 'mismatch@test.com',
      password: 'OldPass123', role: 'student',
    });
    await forgotPassword({ email: 'mismatch@test.com' });

    const mailCall = mailServiceMock.sendPasswordResetEmail.mock.calls[0][0];
    const rawToken = new URL(mailCall.resetUrl).searchParams.get('token');

    const response = await resetPassword({
      token: rawToken,
      password: 'NewPass123',
      confirmPassword: 'NewPass456',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Passwords do not match');
  });

  it('UA-073 — should_return_401_when_token_is_invalid', async () => {
    // UA-073: Token không hợp lệ (QMK-01-033).
    // Mô tả: Kiểm tra reset với token sai/random.
    // Expected: HTTP 401.
    const response = await resetPassword({
      token: 'completely-invalid-fake-token',
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });

    expect(response.status).toBe(401);
  });

  it('UA-074 — should_return_401_when_token_already_used', async () => {
    // UA-074: Token đã sử dụng, không cho dùng lại (QMK-01-034).
    // Mô tả: Reset lần 1 thành công, reset lần 2 cùng token thất bại.
    // Expected: Lần 1 HTTP 200, lần 2 HTTP 401.
    await registerUser({
      username: 'reuse01', fullName: 'Reuse', email: 'reuse@test.com',
      password: 'OldPass123', role: 'student',
    });
    await forgotPassword({ email: 'reuse@test.com' });

    const mailCall = mailServiceMock.sendPasswordResetEmail.mock.calls[0][0];
    const rawToken = new URL(mailCall.resetUrl).searchParams.get('token');

    // Lần 1: thành công
    const first = await resetPassword({
      token: rawToken,
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });
    expect(first.status).toBe(200);

    // Lần 2: token đã dùng → fail
    const second = await resetPassword({
      token: rawToken,
      password: 'AnotherPass1',
      confirmPassword: 'AnotherPass1',
    });
    expect(second.status).toBe(401);
  });

  it('UA-075 — should_return_400_when_reset_dto_missing_required_fields', async () => {
    // UA-075: Thiếu token hoặc password trong reset request (QMK-01-028, QMK-01-029).
    // Mô tả: Kiểm tra ResetPasswordDto validation.
    // Expected: HTTP 400.
    const noToken = await resetPassword({ password: 'NewPass123', confirmPassword: 'NewPass123' });
    expect(noToken.status).toBe(400);

    const noPassword = await resetPassword({ token: 'some-token', confirmPassword: 'NewPass123' });
    expect(noPassword.status).toBe(400);
  });

  it('UA-076 — should_return_400_when_password_too_short_or_weak', async () => {
    // UA-076: Password dưới 6 ký tự hoặc không đủ điều kiện (QMK-01-029, QMK-01-030).
    // Mô tả: Kiểm tra @MinLength(6) và @Matches regex trong ResetPasswordDto.
    // Expected: HTTP 400.
    const shortPwd = await resetPassword({
      token: 'some-token-abc123',
      password: 'Ab1',
      confirmPassword: 'Ab1',
    });
    expect(shortPwd.status).toBe(400);

    const noCaps = await resetPassword({
      token: 'some-token-abc123',
      password: 'abcdef1',
      confirmPassword: 'abcdef1',
    });
    expect(noCaps.status).toBe(400);
  });
});
