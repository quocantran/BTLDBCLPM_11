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

describe('TestAuthLogin - Auth login API (Controller -> Service -> DB)', () => {
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

  describe('login() - 30 test case', () => {
    it('should_login_successfully_with_valid_username_and_password', async () => {
      // TC_AUTH_LG_001: login successfully with valid username and password.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'loginuser01',
        fullName: 'Login User 01',
        email: 'loginuser01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'loginuser01',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.data?.accessToken).toBeDefined();
      expect(response.body?.data?.refreshToken).toBeDefined();
    });

    it('should_login_successfully_with_valid_email_and_password', async () => {
      // TC_AUTH_LG_002: login successfully with valid email and password.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'loginuser02',
        fullName: 'Login User 02',
        email: 'loginuser02@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'loginuser02@example.com',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
    });

    it('should_login_successfully_with_teacher_role_user', async () => {
      // TC_AUTH_LG_003: login successfully with teacher role user.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'teachlogin01',
        fullName: 'Teacher Login',
        email: 'teachlogin01@example.com',
        password: 'Password123',
        role: 'teacher',
      });

      const response = await loginUser({
        identifier: 'teachlogin01',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.data?.user?.role).toBe('teacher');
    });

    it('should_login_successfully_with_admin_role_user', async () => {
      // TC_AUTH_LG_004: login successfully with admin role user.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'adminlogin01',
        fullName: 'Admin Login',
        email: 'adminlogin01@example.com',
        password: 'Password123',
        role: 'admin',
      });

      const response = await loginUser({
        identifier: 'adminlogin01@example.com',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.data?.user?.role).toBe('admin');
    });

    it('should_throw_unauthorized_when_login_password_is_wrong', async () => {
      // TC_AUTH_LG_005: throw unauthorized when login password is wrong.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'wrongpass01',
        fullName: 'Wrong Pass',
        email: 'wrongpass01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'wrongpass01',
        password: 'WrongPassword123',
      });

      expect(response.status).toBe(401);
      expect(String(response.body?.message ?? '')).toContain('Invalid credentials');
    });

    it('should_throw_unauthorized_when_user_not_found', async () => {
      // TC_AUTH_LG_006: throw unauthorized when user not found.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 'unknown@example.com',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
      expect(String(response.body?.message ?? '')).toContain('Invalid credentials');
    });

    it('should_return_generic_message_for_wrong_password_case', async () => {
      // TC_AUTH_LG_007: return generic message for wrong password case.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'genericmsg01',
        fullName: 'Generic Msg',
        email: 'genericmsg01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'genericmsg01',
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
      expect(String(response.body?.message ?? '')).toContain('Invalid credentials');
    });

    it('should_return_generic_message_for_unknown_user_case', async () => {
      // TC_AUTH_LG_008: return generic message for unknown user case.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 'no-user-login',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
      expect(String(response.body?.message ?? '')).toContain('Invalid credentials');
    });

    it('should_not_return_sensitive_fields_in_login_response', async () => {
      // TC_AUTH_LG_009: not return sensitive fields in login response.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'sensitive01',
        fullName: 'Sensitive User',
        email: 'sensitive01@example.com',
        password: 'Password123',
        role: 'teacher',
      });

      const response = await loginUser({
        identifier: 'sensitive01@example.com',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.data?.user?.passwordHash).toBeUndefined();
      expect(response.body?.data?.user?.refreshTokenHash).toBeUndefined();
    });

    it('should_update_refresh_token_hash_after_login', async () => {
      // TC_AUTH_LG_010: update refresh token hash after login.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'refreshtoken01',
        fullName: 'Refresh Token User',
        email: 'refreshtoken01@example.com',
        password: 'Password123',
        role: 'student',
      });

      await loginUser({
        identifier: 'refreshtoken01',
        password: 'Password123',
      });

      const user = await userModel
        .findOne({ username: 'refreshtoken01' })
        .select('+refreshTokenHash')
        .lean();
      expect((user as any).refreshTokenHash).toBeDefined();
    });

    it('should_return_bad_request_when_identifier_is_missing', async () => {
      // TC_AUTH_LG_011: return bad request when identifier is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        password: 'Password123',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_password_is_missing', async () => {
      // TC_AUTH_LG_012: return bad request when password is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 'someone@example.com',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_password_shorter_than_6_chars', async () => {
      // TC_AUTH_LG_013: return bad request when password shorter than 6 chars.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 'someone@example.com',
        password: '12345',
      });

      expect(response.status).toBe(400);
    });

    it('should_throw_unauthorized_when_identifier_contains_sql_injection_payload', async () => {
      // TC_AUTH_LG_014: throw unauthorized when identifier contains sql injection payload.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: "' OR 1=1 --",
        password: 'Password123',
      });

      expect(response.status).toBe(401);
    });

    it('should_throw_unauthorized_when_identifier_contains_xss_payload', async () => {
      // TC_AUTH_LG_015: throw unauthorized when identifier contains xss payload.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: '<script>alert(1)</script>',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_unauthorized_when_identifier_email_case_does_not_match', async () => {
      // TC_AUTH_LG_016: return unauthorized when identifier email case does not match.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'caselogin01',
        fullName: 'Case Login 01',
        email: 'caselogin01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'CASELOGIN01@EXAMPLE.COM',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_unauthorized_when_identifier_username_case_does_not_match', async () => {
      // TC_AUTH_LG_017: return unauthorized when identifier username case does not match.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'caselogin02',
        fullName: 'Case Login 02',
        email: 'caselogin02@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'CASELOGIN02',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_unauthorized_when_identifier_contains_leading_spaces', async () => {
      // TC_AUTH_LG_018: return unauthorized when identifier contains leading spaces.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'spacelogin01',
        fullName: 'Space Login',
        email: 'spacelogin01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: ' spacelogin01',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_unauthorized_when_password_contains_trailing_spaces', async () => {
      // TC_AUTH_LG_019: return unauthorized when password contains trailing spaces.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'spacelogin02',
        fullName: 'Space Login 2',
        email: 'spacelogin02@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'spacelogin02',
        password: 'Password123 ',
      });

      expect(response.status).toBe(401);
    });

    it('should_return_success_true_in_login_response', async () => {
      // TC_AUTH_LG_020: return success true in login response.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'responsesuccesslogin',
        fullName: 'Response Login',
        email: 'responsesuccesslogin@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'responsesuccesslogin',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.success).toBe(true);
    });

    it('should_return_login_successful_message', async () => {
      // TC_AUTH_LG_021: return login successful message.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'loginmessage01',
        fullName: 'Login Message',
        email: 'loginmessage01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'loginmessage01',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.message).toBe('Login successful');
    });

    it('should_return_user_core_fields_when_login_success', async () => {
      // TC_AUTH_LG_022: return user core fields when login success.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'corefields01',
        fullName: 'Core Fields',
        email: 'corefields01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'corefields01',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.data?.user?.id).toBeDefined();
      expect(response.body?.data?.user?.username).toBe('corefields01');
      expect(response.body?.data?.user?.email).toBe('corefields01@example.com');
      expect(response.body?.data?.user?.role).toBe('student');
    });

    it('should_return_bad_request_when_identifier_is_number', async () => {
      // TC_AUTH_LG_023: return bad request when identifier is number.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 123456,
        password: 'Password123',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_password_is_number', async () => {
      // TC_AUTH_LG_024: return bad request when password is number.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 'someone@example.com',
        password: 123456,
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_password_is_empty_string', async () => {
      // TC_AUTH_LG_025: return bad request when password is empty string.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 'someone@example.com',
        password: '',
      });

      expect(response.status).toBe(400);
    });

    it('should_not_create_new_user_document_during_login', async () => {
      // TC_AUTH_LG_026: not create new user document during login.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'nousercreate01',
        fullName: 'No User Create',
        email: 'nousercreate01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const beforeCount = await userModel.countDocuments({});
      const response = await loginUser({
        identifier: 'nousercreate01',
        password: 'Password123',
      });
      const afterCount = await userModel.countDocuments({});

      expect(response.status).toBe(200);
      expect(beforeCount).toBe(afterCount);
    });

    it('should_login_correct_user_when_multiple_accounts_exist', async () => {
      // TC_AUTH_LG_027: login correct user when multiple accounts exist.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'multiaccount01',
        fullName: 'Multi Account 01',
        email: 'multiaccount01@example.com',
        password: 'Password123',
        role: 'student',
      });
      await registerUser({
        username: 'multiaccount02',
        fullName: 'Multi Account 02',
        email: 'multiaccount02@example.com',
        password: 'Password123',
        role: 'teacher',
      });

      const response = await loginUser({
        identifier: 'multiaccount02',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.data?.user?.email).toBe('multiaccount02@example.com');
      expect(response.body?.data?.user?.role).toBe('teacher');
    });

    it('should_login_successfully_with_plus_email_identifier', async () => {
      // TC_AUTH_LG_028: login successfully with plus email identifier.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'pluslogin01',
        fullName: 'Plus Login',
        email: 'plus.login+01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await loginUser({
        identifier: 'plus.login+01@example.com',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
    });

    it('should_login_teacher_successfully_using_email_identifier', async () => {
      // TC_AUTH_LG_029: login teacher successfully using email identifier.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'teacheremaillogin',
        fullName: 'Teacher Email Login',
        email: 'teacher.email.login@example.com',
        password: 'Password123',
        role: 'teacher',
      });

      const response = await loginUser({
        identifier: 'teacher.email.login@example.com',
        password: 'Password123',
      });

      expect(response.status).toBe(200);
      expect(response.body?.data?.user?.role).toBe('teacher');
    });

    it('should_return_unauthorized_when_identifier_is_plain_unknown_value', async () => {
      // TC_AUTH_LG_030: return unauthorized when identifier is plain unknown value.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await loginUser({
        identifier: 'plain-unknown-identifier',
        password: 'Password123',
      });

      expect(response.status).toBe(401);
    });
  });
});
