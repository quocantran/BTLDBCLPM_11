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

describe('TestAuthLoginController - AuthController.login() HTTP pipeline', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;

  let userModel: Model<any>;
  let passwordResetTokenModel: Model<any>;

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  /**
   * Helper: Đăng ký user mới qua API register để tạo dữ liệu test
   * Sử dụng API thật thay vì insert trực tiếp để đảm bảo passwordHash được hash đúng
   */
  async function registerUser(payload: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
  }) {
    return request(app.getHttpServer()).post('/auth/register').send(payload);
  }

  /**
   * Helper: Gọi API login với payload tùy ý (cho phép gửi data không hợp lệ để test validation)
   */
  async function loginUser(payload: {
    identifier?: unknown;
    password?: unknown;
  }) {
    return request(app.getHttpServer()).post('/auth/login').send(payload);
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

  // ROLLBACK: Xóa toàn bộ dữ liệu trước mỗi test case → đảm bảo test case độc lập
  beforeEach(async () => {
    await Promise.all([
      passwordResetTokenModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  // ==================== DTO VALIDATION CASES ====================

  it('UA-011 — should_return_400_when_identifier_is_missing', async () => {
    // UA-011: Thiếu trường identifier trong request body (ĐN-01-008).
    // Mô tả: Kiểm tra ValidationPipe reject khi LoginDto thiếu @IsString() identifier.
    // Expected: HTTP 400 Bad Request.
    const response = await loginUser({ password: 'Password123' });

    expect(response.status).toBe(400);
  });

  it('UA-012 — should_return_400_when_password_is_missing', async () => {
    // UA-012: Thiếu trường password trong request body (ĐN-01-009).
    // Mô tả: Kiểm tra ValidationPipe reject khi LoginDto thiếu @IsString() @MinLength(6) password.
    // Expected: HTTP 400 Bad Request.
    const response = await loginUser({ identifier: 'someone@test.com' });

    expect(response.status).toBe(400);
  });

  it('UA-040 — should_return_400_when_password_shorter_than_6_characters', async () => {
    // UA-040: Password dưới 6 ký tự, vi phạm boundary @MinLength(6) (ĐN-01-011).
    // Mô tả: Kiểm tra ValidationPipe reject password 5 chars tại controller layer.
    // Expected: HTTP 400 Bad Request.
    const response = await loginUser({
      identifier: 'someone@test.com',
      password: '12345',
    });

    expect(response.status).toBe(400);
  });

  it('UA-014 — should_return_400_when_identifier_or_password_is_wrong_type', async () => {
    // UA-014: Identifier hoặc password là number thay vì string.
    // Mô tả: Kiểm tra @IsString() validation cho cả 2 trường trong LoginDto.
    // Expected: HTTP 400 cho cả 2 trường hợp.
    const responseIdentifierNumber = await loginUser({
      identifier: 123456,
      password: 'Password123',
    });
    expect(responseIdentifierNumber.status).toBe(400);

    const responsePasswordNumber = await loginUser({
      identifier: 'someone@test.com',
      password: 123456,
    });
    expect(responsePasswordNumber.status).toBe(400);
  });

  // ==================== SUCCESS RESPONSE FORMAT ====================

  it('UA-015 — should_return_200_with_correct_response_structure_when_login_success', async () => {
    // UA-015: Login thành công, response đúng format ResponseHelper.success() (ĐN-01-020).
    // Mô tả: Kiểm tra full response: success, message, data (user + tokens), meta.timestamp, không leak nhạy cảm.
    // Expected: HTTP 200, {success: true, message: 'Login successful', data: {user, tokens}}.
    await registerUser({
      username: 'loginuser01',
      fullName: 'Login User 01',
      email: 'loginuser01@test.com',
      password: 'Password123',
      role: 'student',
    });

    const response = await loginUser({
      identifier: 'loginuser01',
      password: 'Password123',
    });

    // Assert: HTTP status + top-level structure
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.meta?.timestamp).toBeDefined();

    // Assert: data chứa đầy đủ tokens + user info
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(response.body.data.user.id).toBeDefined();
    expect(response.body.data.user.username).toBe('loginuser01');
    expect(response.body.data.user.email).toBe('loginuser01@test.com');
    expect(response.body.data.user.role).toBe('student');

    // Assert: KHÔNG chứa trường nhạy cảm
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.refreshTokenHash).toBeUndefined();

    // CHECKDB: Verify refreshTokenHash đã được cập nhật trong DB sau login
    const userInDb = await userModel
      .findOne({ username: 'loginuser01' })
      .select('+refreshTokenHash')
      .lean();
    expect((userInDb as any).refreshTokenHash).toBeDefined();
  });

  it('UA-016 — should_return_200_with_teacher_role_when_teacher_logins_by_email', async () => {
    // UA-016: Teacher login bằng email, trả đúng role teacher (ĐN-01-021).
    // Mô tả: Kiểm tra response.data.user.role phản ánh đúng role trong DB.
    // Expected: HTTP 200, user.role === 'teacher'.
    await registerUser({
      username: 'teacher01',
      fullName: 'Teacher One',
      email: 'teacher01@test.com',
      password: 'Password123',
      role: 'teacher',
    });

    const response = await loginUser({
      identifier: 'teacher01@test.com',
      password: 'Password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe('teacher');
  });

  // ==================== ERROR RESPONSE FORMAT ====================

  it('UA-017 — should_return_401_with_generic_message_for_wrong_password_and_nonexistent_user', async () => {
    // UA-017: Sai password và user không tồn tại đều trả cùng message (ĐN-01-022, ĐN-01-024).
    // Mô tả: Kiểm tra không leak thông tin user existence qua error message khác nhau.
    // Expected: Cả 2 đều HTTP 401 với message 'Invalid credentials' giống nhau.
    await registerUser({
      username: 'existuser',
      fullName: 'Exist User',
      email: 'exist@test.com',
      password: 'Password123',
      role: 'student',
    });

    // Case A: User tồn tại, password sai
    const wrongPwdResponse = await loginUser({
      identifier: 'existuser',
      password: 'WrongPassword999',
    });
    expect(wrongPwdResponse.status).toBe(401);
    const wrongPwdMessage = String(wrongPwdResponse.body?.message ?? '');

    // Case B: User không tồn tại
    const notFoundResponse = await loginUser({
      identifier: 'noone@test.com',
      password: 'Password123',
    });
    expect(notFoundResponse.status).toBe(401);
    const notFoundMessage = String(notFoundResponse.body?.message ?? '');

    // Assert: message phải giống nhau → không leak thông tin user existence
    expect(wrongPwdMessage).toContain('Invalid credentials');
    expect(notFoundMessage).toContain('Invalid credentials');
    expect(wrongPwdMessage).toBe(notFoundMessage);
  });

  // ==================== SECURITY INTEGRATION CASES ====================

  it('UA-018 — should_return_401_for_sql_injection_and_xss_payloads_without_crash', async () => {
    // UA-018: Identifier chứa SQL injection và XSS qua HTTP (ĐN-01-016, ĐN-01-017).
    // Mô tả: Kiểm tra server không crash, không thực thi script, trả 401 bình thường.
    // Expected: HTTP 401 cho cả SQL injection và XSS payload.

    // SQL Injection
    const sqlResponse = await loginUser({
      identifier: "' OR 1=1 --",
      password: 'Password123',
    });
    expect(sqlResponse.status).toBe(401);

    // XSS
    const xssResponse = await loginUser({
      identifier: '<script>alert("XSS")</script>',
      password: 'Password123',
    });
    expect(xssResponse.status).toBe(401);
  });

  // ==================== CHECKDB & IDEMPOTENCY ====================

  it('UA-019 — should_not_create_new_user_and_should_update_refreshToken_on_login', async () => {
    // UA-019: Login không tạo user mới, cập nhật refreshTokenHash trong DB (ĐN-01-019, ĐN-01-020).
    // Mô tả: Kiểm tra idempotency (user count không đổi) và DB lưu refreshTokenHash đúng.
    // Expected: HTTP 200, user count giữ nguyên, refreshTokenHash được set.
    await registerUser({
      username: 'dbcheck01',
      fullName: 'DB Check User',
      email: 'dbcheck01@test.com',
      password: 'Password123',
      role: 'student',
    });

    // CHECKDB: Đếm user trước login
    const beforeCount = await userModel.countDocuments({});

    const response = await loginUser({
      identifier: 'dbcheck01',
      password: 'Password123',
    });
    expect(response.status).toBe(200);

    // CHECKDB: User count không đổi sau login (không tạo user mới)
    const afterCount = await userModel.countDocuments({});
    expect(afterCount).toBe(beforeCount);

    // CHECKDB: refreshTokenHash đã được cập nhật
    const userInDb = await userModel
      .findOne({ username: 'dbcheck01' })
      .select('+refreshTokenHash')
      .lean();
    expect((userInDb as any).refreshTokenHash).toBeDefined();
    expect(typeof (userInDb as any).refreshTokenHash).toBe('string');
    expect((userInDb as any).refreshTokenHash.length).toBeGreaterThan(0);
  });

  it('UA-020 — should_handle_whitespace_password_and_leading_space_identifier_correctly', async () => {
    // UA-020: Password toàn whitespace và identifier có leading space (ĐN-01-013).
    // Mô tả: Kiểm tra whitespace password pass DTO validation (MinLength) nhưng fail ở argon2 verify.
    // Expected: HTTP 401 cho cả 2 trường hợp (whitespace pass và leading space identifier).
    await registerUser({
      username: 'whitespace01',
      fullName: 'Whitespace User',
      email: 'whitespace01@test.com',
      password: 'Password123',
      role: 'student',
    });

    // Case A: Password toàn whitespace (6 ký tự → pass @MinLength(6) validation)
    const whitespaceResponse = await loginUser({
      identifier: 'whitespace01',
      password: '      ',
    });
    // Kỳ vọng: pass DTO validation nhưng fail ở argon2 verify → 401
    // Lưu ý: System test ĐN-01-013 đánh giá đây là FAIL (thiếu validate whitespace phía client/server)
    expect(whitespaceResponse.status).toBe(401);

    // Case B: Identifier có leading space → tìm không thấy user (exact match)
    const leadingSpaceResponse = await loginUser({
      identifier: ' whitespace01',
      password: 'Password123',
    });
    expect(leadingSpaceResponse.status).toBe(401);
  });
});
