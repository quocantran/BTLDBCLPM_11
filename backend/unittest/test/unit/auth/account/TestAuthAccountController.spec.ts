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

describe('TestAuthAccountController - AuthController account management HTTP pipeline', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;
  let userModel: Model<any>;

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  // Helper: register user then login to get access token
  async function registerAndLogin(payload: {
    username: string; fullName: string; email: string;
    password: string; role: string;
  }) {
    await request(app.getHttpServer()).post('/auth/register').send(payload);
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: payload.username, password: payload.password });
    return {
      accessToken: loginRes.body.data?.accessToken as string,
      user: loginRes.body.data?.user,
    };
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'unit-test-secret-key';
    process.env.JWT_EXPIRES_IN = '1d';
    process.env.JWT_REFRESH_SECRET = 'unit-test-refresh-secret-key';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    mongoServer = await MongoMemoryServer.create();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig, appConfig] }),
        MongooseModule.forRoot(mongoServer.getUri()),
        AuthModule,
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
    })
      .overrideProvider(MailService)
      .useValue(mailServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    userModel = moduleFixture.get<Model<any>>(getModelToken(User.name));
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  // ==================== GET PROFILE ====================

  it('UA-106 — should_return_200_with_profile_data_when_authenticated', async () => {
    // UA-106: Lấy profile thành công khi đã đăng nhập (MA-01-008).
    // Mô tả: GET /auth/profile với JWT hợp lệ → trả đúng cấu trúc user.
    // Expected: HTTP 200, body chứa user.id, username, email, role.
    const { accessToken } = await registerAndLogin({
      username: 'acuser01', fullName: 'AC User 01', email: 'ac01@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.username).toBe('acuser01');
    expect(response.body.data.user.email).toBe('ac01@test.com');
    expect(response.body.data.user.role).toBe('student');
    // Security: passwordHash KHÔNG được trả về
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.refreshTokenHash).toBeUndefined();
  });

  it('UA-107 — should_return_401_when_get_profile_without_jwt', async () => {
    // UA-107: Gọi GET /profile không có JWT (MA-01-069 tương đương).
    // Mô tả: Kiểm tra @UseGuards(JwtAuthGuard) chặn request không có token.
    // Expected: HTTP 401.
    const response = await request(app.getHttpServer()).get('/auth/profile');

    expect(response.status).toBe(401);
  });

  // ==================== UPDATE PROFILE ====================

  it('UA-108 — should_return_200_and_update_profile_successfully', async () => {
    // UA-108: Cập nhật profile thành công (MA-01-032).
    // Mô tả: PUT /auth/profile với fullName mới → trả profile đã update.
    // Expected: HTTP 200, fullName đã thay đổi.
    const { accessToken } = await registerAndLogin({
      username: 'update01', fullName: 'Old Name', email: 'update01@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'New Name' });

    expect(response.status).toBe(200);
    expect(response.body.data.user.fullName).toBe('New Name');

    // CHECKDB: verify DB lưu đúng
    const dbUser = await userModel.findOne({ username: 'update01' });
    expect(dbUser.fullName).toBe('New Name');
  });

  it('UA-109 — should_return_409_when_email_already_exists', async () => {
    // UA-109: Email trùng user khác → 409 (MA-01-031 Fail).
    // Mô tả: User A đổi email thành email User B → ConflictException.
    // Expected: HTTP 409, message 'Email already exists'.
    await registerAndLogin({
      username: 'userA', fullName: 'User A', email: 'userA@test.com',
      password: 'Password123', role: 'student',
    });
    const { accessToken: tokenB } = await registerAndLogin({
      username: 'userB', fullName: 'User B', email: 'userB@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ email: 'userA@test.com' });

    expect(response.status).toBe(409);
  });

  it('UA-110 — should_return_400_when_email_format_invalid', async () => {
    // UA-110: Email sai định dạng (MA-01-022).
    // Mô tả: Kiểm tra @IsEmail() trong UpdateProfileDto.
    // Expected: HTTP 400.
    const { accessToken } = await registerAndLogin({
      username: 'bademail01', fullName: 'Bad Email', email: 'bademail@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'not-a-valid-email' });

    expect(response.status).toBe(400);
  });

  it('UA-111 — should_return_400_when_dateOfBirth_format_invalid', async () => {
    // UA-111: dateOfBirth sai định dạng (MA-01-023).
    // Mô tả: Kiểm tra @IsDateString() trong UpdateProfileDto.
    // Expected: HTTP 400.
    const { accessToken } = await registerAndLogin({
      username: 'baddate01', fullName: 'Bad Date', email: 'baddate@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dateOfBirth: 'not-a-date' });

    expect(response.status).toBe(400);
  });

  it('UA-112 — should_return_401_when_update_profile_without_jwt', async () => {
    // UA-112: Gọi PUT /profile không có JWT.
    // Mô tả: Kiểm tra @UseGuards(JwtAuthGuard) chặn unauthorized update.
    // Expected: HTTP 401.
    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .send({ fullName: 'Hacker' });

    expect(response.status).toBe(401);
  });

  it('UA-113 — should_update_imageUrl_and_persist_to_db', async () => {
    // UA-113: Cập nhật imageUrl (avatar upload flow) lưu vào DB (MA-01-063, MA-01-085).
    // Mô tả: FE upload Cloudinary → gọi PUT /profile với imageUrl → DB lưu URL.
    // Expected: HTTP 200, imageUrl lưu persistent.
    const cloudinaryUrl = 'https://res.cloudinary.com/dl9mhhoqs/image/upload/v123/avatar.jpg';
    const { accessToken } = await registerAndLogin({
      username: 'avatar01', fullName: 'Avatar User', email: 'avatar@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ imageUrl: cloudinaryUrl });

    expect(response.status).toBe(200);

    // CHECKDB: verify imageUrl lưu vào DB
    const dbUser = await userModel.findOne({ username: 'avatar01' });
    expect(dbUser.imageUrl).toBe(cloudinaryUrl);
  });

  it('UA-114 — should_strip_extra_fields_via_whitelist', async () => {
    // UA-114: Extra fields bị strip bởi whitelist pipe.
    // Mô tả: Gửi field isAdmin: true → bị loại bỏ, không lưu vào DB.
    // Expected: HTTP 200, field isAdmin không tồn tại trong DB.
    const { accessToken } = await registerAndLogin({
      username: 'strip01', fullName: 'Strip User', email: 'strip@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'Updated', isAdmin: true, role: 'admin' });

    expect(response.status).toBe(200);
    // CHECKDB: verify extra fields không tồn tại
    const dbUser = await userModel.findOne({ username: 'strip01' });
    expect(dbUser.role).toBe('student'); // role không bị đổi
  });

  it('UA-115 — should_store_xss_payload_safely_in_fullName', async () => {
    // UA-115: XSS trong fullName lưu an toàn (MA-01-082).
    // Mô tả: Kiểm tra <script> tag không crash backend, lưu as-is.
    // Expected: HTTP 200, fullName lưu nguyên chuỗi XSS.
    const { accessToken } = await registerAndLogin({
      username: 'xssuser', fullName: 'XSS User', email: 'xss@test.com',
      password: 'Password123', role: 'student',
    });

    const xssPayload = '<script>alert("XSS")</script>';
    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: xssPayload });

    expect(response.status).toBe(200);
    const dbUser = await userModel.findOne({ username: 'xssuser' });
    expect(dbUser.fullName).toBe(xssPayload);
  });

  it('UA-116 — should_update_own_email_without_conflict', async () => {
    // UA-116: Giữ nguyên email cũ không bị conflict (MA-01-081).
    // Mô tả: User gửi email hiện tại + thay đổi fullName → không báo lỗi.
    // Expected: HTTP 200.
    const { accessToken } = await registerAndLogin({
      username: 'ownemail', fullName: 'Own Email', email: 'own@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'own@test.com', fullName: 'Changed Name' });

    expect(response.status).toBe(200);
  });

  // ==================== CHANGE PASSWORD ====================

  it('UA-117 — should_return_200_when_change_password_successfully', async () => {
    // UA-117: Đổi mật khẩu thành công (MA-01-046).
    // Mô tả: POST /auth/change-password với current đúng, new hợp lệ.
    // Expected: HTTP 200, message 'Password changed successfully'.
    const { accessToken } = await registerAndLogin({
      username: 'chgpwd01', fullName: 'Chg Pwd', email: 'chgpwd@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password123', newPassword: 'NewPass456' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Password changed successfully');
  });

  it('UA-118 — should_return_401_when_current_password_is_wrong', async () => {
    // UA-118: Sai current password → 401 (MA-01-045 Fail, root cause bị logout).
    // Mô tả: Backend throw UnauthorizedException → FE auto-logout vì nhận 401.
    // Expected: HTTP 401, message 'Current password is incorrect'.
    const { accessToken } = await registerAndLogin({
      username: 'wrongpwd', fullName: 'Wrong Pwd', email: 'wrongpwd@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongPassword123', newPassword: 'NewPass456' });

    expect(response.status).toBe(401);
  });

  it('UA-119 — should_return_409_when_new_password_same_as_current', async () => {
    // UA-119: Password mới trùng cũ → 409 (MA-01-047 Fail, MA-01-084).
    // Mô tả: Backend trả ConflictException nhưng FE hiện "Failed to change password".
    // Expected: HTTP 409.
    const { accessToken } = await registerAndLogin({
      username: 'samepwd', fullName: 'Same Pwd', email: 'samepwd@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password123', newPassword: 'Password123' });

    expect(response.status).toBe(409);
  });

  it('UA-120 — should_return_400_when_missing_required_fields', async () => {
    // UA-120: Thiếu currentPassword hoặc newPassword (MA-01-040, MA-01-042).
    // Mô tả: Kiểm tra ChangePasswordDto validation.
    // Expected: HTTP 400 cho cả 2 trường hợp.
    const { accessToken } = await registerAndLogin({
      username: 'missfld', fullName: 'Miss Fld', email: 'missfld@test.com',
      password: 'Password123', role: 'student',
    });

    const noCurrent = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ newPassword: 'NewPass456' });
    expect(noCurrent.status).toBe(400);

    const noNew = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password123' });
    expect(noNew.status).toBe(400);
  });

  it('UA-121 — should_return_400_when_password_shorter_than_6_chars', async () => {
    // UA-121: Password dưới 6 ký tự (MA-01-041, MA-01-043).
    // Mô tả: Kiểm tra @MinLength(6) trong ChangePasswordDto.
    // Expected: HTTP 400.
    const { accessToken } = await registerAndLogin({
      username: 'shortpwd', fullName: 'Short Pwd', email: 'shortpwd@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password123', newPassword: 'Abc' });

    expect(response.status).toBe(400);
  });

  it('UA-122 — should_return_401_when_change_password_without_jwt', async () => {
    // UA-122: Gọi change-password không có JWT (MA-01-070).
    // Mô tả: Kiểm tra @UseGuards(JwtAuthGuard) chặn unauthorized request.
    // Expected: HTTP 401.
    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ currentPassword: 'abc123456', newPassword: 'xyz123456' });

    expect(response.status).toBe(401);
  });

  it('UA-123 — should_login_with_new_password_after_change', async () => {
    // UA-123: Đăng nhập bằng password mới thành công (MA-01-048).
    // Mô tả: Sau đổi mật khẩu, login bằng password cũ thất bại, password mới thành công.
    // Expected: Login cũ 401, login mới 200.
    const { accessToken } = await registerAndLogin({
      username: 'loginpwd', fullName: 'Login Pwd', email: 'loginpwd@test.com',
      password: 'Password123', role: 'student',
    });

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password123', newPassword: 'NewPass456' });

    // Login password cũ → fail (MA-01-083)
    const loginOld = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'loginpwd', password: 'Password123' });
    expect(loginOld.status).toBe(401);

    // Login password mới → thành công (MA-01-048)
    const loginNew = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'loginpwd', password: 'NewPass456' });
    expect(loginNew.status).toBe(200);
  });

  it('UA-124 — should_update_dateOfBirth_and_citizenId_together', async () => {
    // UA-124: Cập nhật dateOfBirth và citizenId cùng lúc (MA-01-026, MA-01-028).
    // Mô tả: Kiểm tra multi-field update lưu đúng vào DB.
    // Expected: HTTP 200, cả 2 trường lưu đúng.
    const { accessToken } = await registerAndLogin({
      username: 'multiupd', fullName: 'Multi Update', email: 'multi@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .put('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dateOfBirth: '2000-05-15', citizenId: '012345678901' });

    expect(response.status).toBe(200);

    // CHECKDB: verify DB lưu đúng
    const dbUser = await userModel.findOne({ username: 'multiupd' });
    expect(dbUser.citizenId).toBe('012345678901');
    expect(dbUser.dateOfBirth).toBeDefined();
  });

  // ==================== REFRESH TOKENS ====================

  it('UA-101 — should_return_200_with_new_tokens_when_refresh_valid', async () => {
    // UA-101: Refresh token thành công qua HTTP pipeline.
    // Mô tả: Login → lấy refreshToken → POST /auth/refresh → trả tokens mới.
    // Expected: HTTP 200, body có accessToken và refreshToken mới.
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'refresh01', fullName: 'Refresh User', email: 'refresh01@test.com',
      password: 'Password123', role: 'student',
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'refresh01', password: 'Password123' });
    const refreshToken = loginRes.body.data.refreshToken;

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('UA-102 — should_return_401_when_refresh_token_is_invalid', async () => {
    // UA-102: Refresh token sai hoàn toàn.
    // Mô tả: Gửi token bịa → verifyAsync fail → 401.
    // Expected: HTTP 401.
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'completely-invalid-fake-jwt-token-that-is-long-enough' });

    expect(response.status).toBe(401);
  });

  it('UA-103 — should_return_400_when_refresh_token_too_short', async () => {
    // UA-103: Refresh token dưới 10 ký tự → DTO validation fail.
    // Mô tả: RefreshTokenDto @MinLength(10) chặn trước khi vào service.
    // Expected: HTTP 400.
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'short' });

    expect(response.status).toBe(400);
  });

  it('UA-104 — should_return_401_when_refresh_after_password_change', async () => {
    // UA-104: Refresh token sau khi đổi mật khẩu → refreshTokenHash bị xóa → 401.
    // Mô tả: changePassword $unset refreshTokenHash → refresh token cũ không hợp lệ.
    // Expected: HTTP 401.
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'refchg', fullName: 'Ref Chg', email: 'refchg@test.com',
      password: 'Password123', role: 'student',
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'refchg', password: 'Password123' });
    const { accessToken, refreshToken } = loginRes.body.data;

    // Đổi mật khẩu → xóa refreshTokenHash
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Password123', newPassword: 'NewPass456' });

    // Refresh token cũ phải fail
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(401);
  });
});
