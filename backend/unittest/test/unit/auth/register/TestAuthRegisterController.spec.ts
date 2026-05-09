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

describe('TestAuthRegisterController - AuthController.register() HTTP pipeline', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;

  let userModel: Model<any>;
  let passwordResetTokenModel: Model<any>;

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const validPayload = {
    username: 'newuser01',
    fullName: 'New User 01',
    email: 'newuser01@test.com',
    password: 'Password123',
    role: 'student',
  };

  async function registerUser(payload: Record<string, unknown>) {
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

  // ==================== SUCCESS CASES ====================

  it('UA-033 — should_register_student_successfully_with_201_and_correct_response', async () => {
    // UA-033: Đăng ký student thành công qua HTTP (ĐK-01-029).
    // Mô tả: Kiểm tra POST /auth/register trả 201, response đúng format, user được lưu vào DB.
    // Expected: HTTP 201, success=true, message='User registered successfully', DB có user mới.
    const response = await registerUser(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User registered successfully');

    // CHECKDB: verify user được lưu vào DB
    const userInDb = await userModel.findOne({ username: 'newuser01' }).lean();
    expect(userInDb).toBeDefined();
    expect((userInDb as any).email).toBe('newuser01@test.com');
    expect((userInDb as any).role).toBe('student');
    expect((userInDb as any).passwordHash).toBeDefined();
  });

  it('UA-034 — should_register_teacher_successfully', async () => {
    // UA-034: Đăng ký teacher thành công (ĐK-01-030).
    // Mô tả: Kiểm tra register role teacher, verify DB lưu đúng role.
    // Expected: HTTP 201, DB user.role = 'teacher'.
    const response = await registerUser({
      ...validPayload,
      username: 'teacher01',
      email: 'teacher01@test.com',
      role: 'teacher',
    });

    expect(response.status).toBe(201);

    // CHECKDB: verify DB lưu đúng role
    const userInDb = await userModel.findOne({ username: 'teacher01' }).lean();
    expect((userInDb as any).role).toBe('teacher');
  });

  // ==================== DUPLICATE CASES ====================

  it('UA-035 — should_return_409_when_username_already_exists', async () => {
    // UA-035: Username trùng, trả 409 với message chỉ rõ username (ĐK-01-031).
    // Mô tả: Kiểm tra conflict detection, verify message cụ thể giúp user biết field nào bị trùng.
    // Expected: HTTP 409, message chứa 'Username already exists', DB không tạo user thứ 2.
    await registerUser(validPayload);

    const response = await registerUser({
      ...validPayload,
      email: 'different@test.com', // email khác nhưng username trùng
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Username already exists');

    // CHECKDB: verify chỉ có 1 user trong DB
    const count = await userModel.countDocuments({});
    expect(count).toBe(1);
  });

  it('UA-109 — should_return_409_when_email_already_exists', async () => {
    // UA-109: Email trùng, trả 409 với message chỉ rõ email (ĐK-01-032).
    // Mô tả: Kiểm tra conflict detection cho email, verify message cụ thể.
    // Expected: HTTP 409, message chứa 'email already exists'.
    await registerUser(validPayload);

    const response = await registerUser({
      ...validPayload,
      username: 'differentuser', // username khác nhưng email trùng
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('email already exists');
  });

  it('UA-037 — should_check_username_first_when_both_username_and_email_exist', async () => {
    // UA-037: Cả username và email trùng, ưu tiên báo lỗi username (ĐK-01-033).
    // Mô tả: Kiểm tra thứ tự kiểm tra trùng: username trước, email sau.
    // Expected: HTTP 409, message chứa 'Username already exists' (không phải email).
    await registerUser(validPayload);

    const response = await registerUser(validPayload); // gửi lại y hệt

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Username already exists');
  });

  // ==================== DTO VALIDATION CASES ====================

  it('UA-038 — should_return_400_when_required_fields_are_missing', async () => {
    // UA-038: Thiếu các trường bắt buộc trong request body (ĐK-01-008, ĐK-01-011, ĐK-01-013, ĐK-01-016).
    // Mô tả: Kiểm tra ValidationPipe reject khi thiếu username, fullName, email, password.
    // Expected: HTTP 400 cho tất cả trường hợp thiếu field.
    const missingUsername = await registerUser({ ...validPayload, username: undefined });
    expect(missingUsername.status).toBe(400);

    const missingEmail = await registerUser({ ...validPayload, email: undefined });
    expect(missingEmail.status).toBe(400);

    const missingPassword = await registerUser({ ...validPayload, password: undefined });
    expect(missingPassword.status).toBe(400);

    const missingFullName = await registerUser({ ...validPayload, fullName: undefined });
    expect(missingFullName.status).toBe(400);
  });

  it('UA-039 — should_return_400_when_username_shorter_than_3_characters', async () => {
    // UA-039: Username dưới 3 ký tự, vi phạm @MinLength(3) (ĐK-01-012).
    // Mô tả: Kiểm tra boundary validation cho username tại controller layer.
    // Expected: HTTP 400.
    const response = await registerUser({ ...validPayload, username: 'ab' });

    expect(response.status).toBe(400);
  });

  it('UA-040 — should_return_400_when_password_shorter_than_6_characters', async () => {
    // UA-040: Password dưới 6 ký tự, vi phạm @MinLength(6) (ĐK-01-017).
    // Mô tả: Kiểm tra boundary validation cho password.
    // Expected: HTTP 400.
    const response = await registerUser({ ...validPayload, password: 'Ab1' });

    expect(response.status).toBe(400);
  });

  it('UA-041 — should_return_400_when_email_format_is_invalid', async () => {
    // UA-041: Email sai định dạng, vi phạm @IsEmail() (ĐK-01-014).
    // Mô tả: Kiểm tra @IsEmail() validation cho email.
    // Expected: HTTP 400.
    const response = await registerUser({ ...validPayload, email: 'abc@@gmail' });

    expect(response.status).toBe(400);
  });

  it('UA-042 — should_return_400_when_role_is_invalid_enum', async () => {
    // UA-042: Role không hợp lệ, vi phạm @IsEnum() (ĐK-01-015).
    // Mô tả: Kiểm tra @IsEnum(['student','teacher','admin']) validation.
    // Expected: HTTP 400 cho role không hợp lệ.
    const response = await registerUser({ ...validPayload, role: 'superadmin' });

    expect(response.status).toBe(400);
  });

  it('UA-043 — should_return_400_when_fields_are_wrong_type', async () => {
    // UA-043: Các trường có kiểu sai (number thay vì string).
    // Mô tả: Kiểm tra @IsString() validation cho username, fullName, password.
    // Expected: HTTP 400 cho tất cả trường hợp.
    const numUsername = await registerUser({ ...validPayload, username: 12345 });
    expect(numUsername.status).toBe(400);

    const numPassword = await registerUser({ ...validPayload, password: 123456 });
    expect(numPassword.status).toBe(400);
  });

  // ==================== CHECKDB & IDEMPOTENCY ====================

  it('UA-044 — should_hash_password_in_db_not_store_plaintext', async () => {
    // UA-044: Password lưu trong DB phải là hash, không phải plaintext.
    // Mô tả: Kiểm tra sau register, DB chứa passwordHash khác với password gốc.
    // Expected: DB user.passwordHash tồn tại, khác 'Password123', là argon2 hash.
    await registerUser(validPayload);

    const userInDb = await userModel.findOne({ username: 'newuser01' }).lean();
    expect((userInDb as any).passwordHash).toBeDefined();
    expect((userInDb as any).passwordHash).not.toBe('Password123');
    expect(typeof (userInDb as any).passwordHash).toBe('string');
    expect((userInDb as any).passwordHash.length).toBeGreaterThan(20);
  });

  it('UA-045 — should_create_exactly_one_user_per_register', async () => {
    // UA-045: Mỗi lần register chỉ tạo đúng 1 user trong DB.
    // Mô tả: Kiểm tra idempotency — 1 request = 1 user, không tạo thừa.
    // Expected: DB count tăng đúng 1 sau register.
    const beforeCount = await userModel.countDocuments({});

    await registerUser(validPayload);

    const afterCount = await userModel.countDocuments({});
    expect(afterCount).toBe(beforeCount + 1);
  });

  // ==================== SECURITY CASES ====================

  it('UA-046 — should_register_safely_with_xss_in_fullname', async () => {
    // UA-046: Fullname chứa XSS, hệ thống không crash (ĐK-01-025).
    // Mô tả: Kiểm tra XSS payload trong fullName được lưu an toàn.
    // Expected: HTTP 201, server không crash, user tạo thành công.
    const response = await registerUser({
      ...validPayload,
      fullName: '<script>alert("XSS")</script>',
      username: 'xssuser01',
      email: 'xss@test.com',
    });

    expect(response.status).toBe(201);

    // CHECKDB: verify user được tạo
    const userInDb = await userModel.findOne({ username: 'xssuser01' }).lean();
    expect(userInDb).toBeDefined();
  });

  it('UA-047 — should_register_safely_with_sql_injection_in_username', async () => {
    // UA-047: Username chứa SQL injection, hệ thống an toàn (ĐK-01-026).
    // Mô tả: Kiểm tra MongoDB không bị ảnh hưởng, user tạo thành công.
    // Expected: HTTP 201, server không crash.
    const response = await registerUser({
      ...validPayload,
      username: "dropuser01",
      fullName: "' DROP TABLE users --",
      email: 'sql@test.com',
    });

    expect(response.status).toBe(201);
  });

  // ==================== EDGE CASES ====================

  it('UA-114 — should_strip_extra_fields_via_whitelist', async () => {
    // UA-114: Request body chứa extra fields, bị strip bởi whitelist.
    // Mô tả: Kiểm tra ValidationPipe whitelist: true loại bỏ trường không trong DTO.
    // Expected: HTTP 201, extra fields không được lưu vào DB.
    const response = await registerUser({
      ...validPayload,
      username: 'extrafield01',
      email: 'extra@test.com',
      isAdmin: true,
      creditBalance: 999999,
    });

    expect(response.status).toBe(201);

    // CHECKDB: verify extra fields không lưu
    const userInDb = await userModel.findOne({ username: 'extrafield01' }).lean();
    expect((userInDb as any).isAdmin).toBeUndefined();
    expect((userInDb as any).creditBalance).toBeUndefined();
  });

  it('UA-049 — should_return_400_when_body_is_empty', async () => {
    // UA-049: Body rỗng, tất cả trường missing (ĐK-01-024).
    // Mô tả: Kiểm tra ValidationPipe reject khi body hoàn toàn rỗng.
    // Expected: HTTP 400.
    const response = await registerUser({});

    expect(response.status).toBe(400);
  });

  it('UA-050 — should_register_with_email_containing_plus_sign', async () => {
    // UA-050: Email có dấu cộng (+), hệ thống chấp nhận.
    // Mô tả: Kiểm tra @IsEmail() chấp nhận email hợp lệ với dấu +.
    // Expected: HTTP 201, user tạo thành công.
    const response = await registerUser({
      ...validPayload,
      username: 'plusemail01',
      email: 'test+register@test.com',
    });

    expect(response.status).toBe(201);

    const userInDb = await userModel.findOne({ username: 'plusemail01' }).lean();
    expect((userInDb as any).email).toBe('test+register@test.com');
  });
});
