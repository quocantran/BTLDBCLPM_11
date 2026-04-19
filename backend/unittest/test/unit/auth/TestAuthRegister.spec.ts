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

describe('TestAuthRegister - Auth register API (Controller -> Service -> DB)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;

  let userModel: Model<any>;
  let passwordResetTokenModel: Model<any>;

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  async function registerUser(payload: {
    username?: string;
    fullName?: string;
    email?: string;
    password?: string;
    role?: 'student' | 'teacher' | 'admin' | string;
    [key: string]: unknown;
  }) {
    return request(app.getHttpServer()).post('/auth/register').send(payload);
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

  describe('register() - 30 test case', () => {
    it('should_register_successfully_with_valid_student_data', async () => {
      // TC_AUTH_RG_001: register successfully with valid student data.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'student01',
        fullName: 'Sinh Vien 01',
        email: 'student01@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
      expect(response.body?.success).toBe(true);
      const userInDb = await userModel.findOne({ username: 'student01' }).lean();
      expect(userInDb).toBeTruthy();
      expect((userInDb as any).role).toBe('student');
    });

    it('should_register_successfully_with_teacher_role', async () => {
      // TC_AUTH_RG_002: register successfully with teacher role.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'teacher01',
        fullName: 'Giang Vien 01',
        email: 'teacher01@example.com',
        password: 'Password123',
        role: 'teacher',
      });

      expect(response.status).toBe(201);
      const userInDb = await userModel.findOne({ username: 'teacher01' }).lean();
      expect((userInDb as any).role).toBe('teacher');
    });

    it('should_register_successfully_with_admin_role', async () => {
      // TC_AUTH_RG_003: register successfully with admin role.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'admin01',
        fullName: 'Quan Tri 01',
        email: 'admin01@example.com',
        password: 'Password123',
        role: 'admin',
      });

      expect(response.status).toBe(201);
      const userInDb = await userModel.findOne({ username: 'admin01' }).lean();
      expect((userInDb as any).role).toBe('admin');
    });

    it('should_store_password_hash_not_plain_text_after_register', async () => {
      // TC_AUTH_RG_004: store password hash not plain text after register.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'hashuser01',
        fullName: 'Hash User',
        email: 'hash01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const userInDb = await userModel.findOne({ username: 'hashuser01' }).lean();
      expect((userInDb as any).passwordHash).toBeDefined();
      expect((userInDb as any).passwordHash).not.toBe('Password123');
      expect(String((userInDb as any).passwordHash)).toContain('argon2');
    });

    it('should_not_return_tokens_on_register_endpoint', async () => {
      // TC_AUTH_RG_005: not return tokens on register endpoint.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'notoken01',
        fullName: 'No Token',
        email: 'notoken01@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeUndefined();
      expect(response.body?.accessToken).toBeUndefined();
      expect(response.body?.refreshToken).toBeUndefined();
    });

    it('should_throw_conflict_when_registering_with_existing_email', async () => {
      // TC_AUTH_RG_006: throw conflict when registering with existing email.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'dupemail01',
        fullName: 'Dup Email',
        email: 'dupemail@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await registerUser({
        username: 'dupemail02',
        fullName: 'Dup Email 2',
        email: 'dupemail@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(409);
      const users = await userModel.find({ email: 'dupemail@example.com' }).lean();
      expect(users).toHaveLength(1);
    });

    it('should_throw_conflict_when_registering_with_existing_username', async () => {
      // TC_AUTH_RG_007: throw conflict when registering with existing username.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'dupusername',
        fullName: 'Dup Username',
        email: 'dupuser01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const response = await registerUser({
        username: 'dupusername',
        fullName: 'Dup Username 2',
        email: 'dupuser02@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(409);
      const users = await userModel.find({ username: 'dupusername' }).lean();
      expect(users).toHaveLength(1);
    });

    it('should_return_bad_request_when_email_format_is_invalid', async () => {
      // TC_AUTH_RG_008: return bad request when email format is invalid.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'invalidemail01',
        fullName: 'Invalid Email',
        email: 'not-an-email',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_password_shorter_than_6_chars', async () => {
      // TC_AUTH_RG_009: return bad request when password shorter than 6 chars.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'shortpass01',
        fullName: 'Short Pass',
        email: 'shortpass01@example.com',
        password: '12345',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_username_shorter_than_3_chars', async () => {
      // TC_AUTH_RG_010: return bad request when username shorter than 3 chars.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'ab',
        fullName: 'Short Username',
        email: 'shortusername@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_fullname_is_empty', async () => {
      // TC_AUTH_RG_011: return bad request when fullname is empty.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'emptyfullname01',
        fullName: '',
        email: 'emptyfullname01@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_role_is_invalid', async () => {
      // TC_AUTH_RG_012: return bad request when role is invalid.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'invalidrole01',
        fullName: 'Invalid Role',
        email: 'invalidrole01@example.com',
        password: 'Password123',
        role: 'guest',
      });

      expect(response.status).toBe(400);
    });

    it('should_store_createdAt_and_updatedAt_when_register_success', async () => {
      // TC_AUTH_RG_013: store createdAt and updatedAt when register success.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'timestamp01',
        fullName: 'Timestamp User',
        email: 'timestamp01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const userInDb = await userModel.findOne({ username: 'timestamp01' }).lean();
      expect((userInDb as any).createdAt).toBeDefined();
      expect((userInDb as any).updatedAt).toBeDefined();
    });

    it('should_accept_password_with_exactly_6_characters', async () => {
      // TC_AUTH_RG_014: accept password with exactly 6 characters.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'pass6char',
        fullName: 'Pass Six',
        email: 'pass6char@example.com',
        password: '123456',
        role: 'student',
      });

      expect(response.status).toBe(201);
    });

    it('should_accept_username_with_exactly_3_characters', async () => {
      // TC_AUTH_RG_015: accept username with exactly 3 characters.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'abc',
        fullName: 'User ABC',
        email: 'abc@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
    });

    it('should_return_bad_request_when_username_is_missing', async () => {
      // TC_AUTH_RG_016: return bad request when username is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        fullName: 'Missing Username',
        email: 'missing.username@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_fullname_is_missing', async () => {
      // TC_AUTH_RG_017: return bad request when fullname is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'missingfullname',
        email: 'missing.fullname@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_email_is_missing', async () => {
      // TC_AUTH_RG_018: return bad request when email is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'missingemail',
        fullName: 'Missing Email',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_password_is_missing', async () => {
      // TC_AUTH_RG_019: return bad request when password is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'missingpassword',
        fullName: 'Missing Password',
        email: 'missing.password@example.com',
        role: 'student',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_role_is_missing', async () => {
      // TC_AUTH_RG_020: return bad request when role is missing.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'missingrole',
        fullName: 'Missing Role',
        email: 'missing.role@example.com',
        password: 'Password123',
      });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_role_is_uppercase_value', async () => {
      // TC_AUTH_RG_021: return bad request when role is uppercase value.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'uppercaserole',
        fullName: 'Uppercase Role',
        email: 'uppercase.role@example.com',
        password: 'Password123',
        role: 'STUDENT',
      });

      expect(response.status).toBe(400);
    });

    it('should_register_successfully_with_uppercase_email_characters', async () => {
      // TC_AUTH_RG_022: register successfully with uppercase email characters.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'caseemail01',
        fullName: 'Case Email',
        email: 'CASEEMAIL01@EXAMPLE.COM',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
      const userInDb = await userModel.findOne({ username: 'caseemail01' }).lean();
      expect((userInDb as any).email).toBe('CASEEMAIL01@EXAMPLE.COM');
    });

    it('should_register_successfully_with_underscore_username', async () => {
      // TC_AUTH_RG_023: register successfully with underscore username.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'user_name_01',
        fullName: 'User Name 01',
        email: 'user_name_01@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
    });

    it('should_register_successfully_with_long_username_value', async () => {
      // TC_AUTH_RG_024: register successfully with long username value.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'verylongusernamevalue1234567890abcdefghij',
        fullName: 'Long Username',
        email: 'longusername@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
    });

    it('should_register_two_distinct_users_successfully', async () => {
      // TC_AUTH_RG_025: register two distinct users successfully.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response1 = await registerUser({
        username: 'multiuser01',
        fullName: 'Multi User 01',
        email: 'multiuser01@example.com',
        password: 'Password123',
        role: 'student',
      });
      const response2 = await registerUser({
        username: 'multiuser02',
        fullName: 'Multi User 02',
        email: 'multiuser02@example.com',
        password: 'Password123',
        role: 'teacher',
      });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(await userModel.countDocuments({})).toBe(2);
    });

    it('should_return_success_true_in_register_response', async () => {
      // TC_AUTH_RG_026: return success true in register response.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'responsesuccess01',
        fullName: 'Response Success',
        email: 'responsesuccess01@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
      expect(response.body?.success).toBe(true);
    });

    it('should_return_register_success_message_from_controller', async () => {
      // TC_AUTH_RG_027: return register success message from controller.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'responsemessage01',
        fullName: 'Response Message',
        email: 'responsemessage01@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
      expect(response.body?.message).toBe('User registered successfully');
    });

    it('should_store_refresh_token_hash_after_register_flow', async () => {
      // TC_AUTH_RG_028: store refresh token hash after register flow.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      await registerUser({
        username: 'refhashreg01',
        fullName: 'Refresh Hash Reg',
        email: 'refhashreg01@example.com',
        password: 'Password123',
        role: 'student',
      });

      const user = await userModel
        .findOne({ username: 'refhashreg01' })
        .select('+refreshTokenHash')
        .lean();
      expect((user as any).refreshTokenHash).toBeDefined();
    });

    it('should_strip_unknown_fields_from_register_payload', async () => {
      // TC_AUTH_RG_029: strip unknown fields from register payload.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'unknownfield01',
        fullName: 'Unknown Field',
        email: 'unknownfield01@example.com',
        password: 'Password123',
        role: 'student',
        isSuperAdmin: true,
      });

      expect(response.status).toBe(201);
      const user = await userModel.findOne({ username: 'unknownfield01' }).lean();
      expect((user as any).isSuperAdmin).toBeUndefined();
    });

    it('should_register_successfully_with_plus_email_format', async () => {
      // TC_AUTH_RG_030: register successfully with plus email format.
      // Mô tả: Kiểm tra luồng xử lý auth theo tình huống đã định nghĩa.
      // Expected: API phản hồi đúng status/code và dữ liệu tương ứng với kịch bản.
      const response = await registerUser({
        username: 'plusmail01',
        fullName: 'Plus Mail',
        email: 'plus.mail+01@example.com',
        password: 'Password123',
        role: 'student',
      });

      expect(response.status).toBe(201);
      const user = await userModel.findOne({ username: 'plusmail01' }).lean();
      expect((user as any).email).toBe('plus.mail+01@example.com');
    });
  });
});
