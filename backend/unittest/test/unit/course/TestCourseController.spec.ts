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
import { CoursesModule } from 'src/modules/courses/courses.module';
import { MailService } from 'src/modules/auth/mail.service';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { Course, CourseSchema } from 'src/database/schemas/course.schema';
import { Enrollment, EnrollmentSchema } from 'src/database/schemas/enrollment.schema';

describe('TestCourseController - CoursesController HTTP pipeline', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;
  let userModel: Model<any>;
  let courseModel: Model<any>;
  let enrollmentModel: Model<any>;

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  // Helper: register + login → get accessToken
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
        CoursesModule,
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Course.name, schema: CourseSchema },
          { name: Enrollment.name, schema: EnrollmentSchema },
        ]),
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
    courseModel = moduleFixture.get<Model<any>>(getModelToken(Course.name));
    enrollmentModel = moduleFixture.get<Model<any>>(getModelToken(Enrollment.name));
  });

  beforeEach(async () => {
    await courseModel.deleteMany({});
    await enrollmentModel.deleteMany({});
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  // ==================== CREATE COURSE ====================

  it('MC-026 — should_return_201_when_teacher_creates_course', async () => {
    // MC-026: Teacher tạo khóa học thành công (MC-01-050).
    // Mô tả: POST /courses với JWT teacher + body hợp lệ.
    // Expected: HTTP 201, course có publicId dạng C + 6 số.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher01', fullName: 'Teacher One', email: 'teacher01@test.com',
      password: 'Password123', role: 'teacher',
    });

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Lập trình Python', teacherId: user.id });

    expect(response.status).toBe(201);
    expect(response.body.data.course.publicId).toMatch(/^C\d{6}$/);
    expect(response.body.data.course.courseName).toBe('Lập trình Python');

    // CHECKDB: verify course lưu vào DB
    const dbCourse = await courseModel.findOne({ courseName: 'Lập trình Python' });
    expect(dbCourse).not.toBeNull();
  });

  it('MC-027 — should_return_401_when_no_jwt_on_create', async () => {
    // MC-027: Tạo course không có JWT → 401.
    // Mô tả: JwtAuthGuard chặn request không có token.
    // Expected: HTTP 401.
    const response = await request(app.getHttpServer())
      .post('/courses')
      .send({ courseName: 'Test', teacherId: '000000000000000000000000' });

    expect(response.status).toBe(401);
  });

  it('MC-028 — should_return_400_when_courseName_is_empty', async () => {
    // MC-028: Tên khóa học rỗng → 400 (MC-01-045).
    // Mô tả: @IsNotEmpty() trong CreateBasicCourseDto.
    // Expected: HTTP 400.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher02', fullName: 'Teacher Two', email: 'teacher02@test.com',
      password: 'Password123', role: 'teacher',
    });

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: '', teacherId: user.id });

    expect(response.status).toBe(400);
  });

  it('MC-029 — should_return_400_when_teacherId_is_not_mongo_id', async () => {
    // MC-029: teacherId sai format → 400.
    // Mô tả: @IsMongoId() trong CreateBasicCourseDto.
    // Expected: HTTP 400.
    const { accessToken } = await registerAndLogin({
      username: 'teacher03', fullName: 'Teacher Three', email: 'teacher03@test.com',
      password: 'Password123', role: 'teacher',
    });

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Valid Name Here', teacherId: 'not-a-mongo-id' });

    expect(response.status).toBe(400);
  });

  it('MC-030 — should_return_403_when_student_creates_course', async () => {
    // MC-030: Student tạo khóa học → 403 (MC-01-054 Fail).
    // Mô tả: Kiểm tra role check trong service.
    // Expected: HTTP 403.
    const { accessToken, user } = await registerAndLogin({
      username: 'student01', fullName: 'Student One', email: 'student01@test.com',
      password: 'Password123', role: 'student',
    });

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Hacked Course', teacherId: user.id });

    expect(response.status).toBe(403);
  });

  // ==================== GET COURSES BY TEACHER ====================

  it('MC-031 — should_return_200_with_courses_list', async () => {
    // MC-031: Lấy danh sách khóa học thành công (MC-01-014).
    // Mô tả: GET /courses/teacher/:teacherId với JWT hợp lệ.
    // Expected: HTTP 200, array courses.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher04', fullName: 'Teacher Four', email: 'teacher04@test.com',
      password: 'Password123', role: 'teacher',
    });

    // Tạo 1 course
    await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Course For List', teacherId: user.id });

    const response = await request(app.getHttpServer())
      .get(`/courses/teacher/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.courses).toHaveLength(1);
    expect(response.body.data.courses[0].courseName).toBe('Course For List');
  });

  it('MC-032 — should_filter_by_search_query', async () => {
    // MC-032: Tìm khóa học bằng từ khóa (MC-01-009, MC-01-013).
    // Mô tả: GET /courses/teacher/:id?search=Python → filter đúng.
    // Expected: HTTP 200, chỉ trả courses match keyword.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher05', fullName: 'Teacher Five', email: 'teacher05@test.com',
      password: 'Password123', role: 'teacher',
    });

    await request(app.getHttpServer())
      .post('/courses').set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Python Advanced', teacherId: user.id });
    await request(app.getHttpServer())
      .post('/courses').set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Java Basics', teacherId: user.id });

    const response = await request(app.getHttpServer())
      .get(`/courses/teacher/${user.id}?search=Python`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.courses).toHaveLength(1);
    expect(response.body.data.courses[0].courseName).toBe('Python Advanced');
  });

  it('MC-033 — should_return_400_when_search_contains_backslash', async () => {
    // MC-033: Tìm kiếm bằng '\' → phải trả 400 (MC-01-019 Fail).
    // Mô tả: Backend dùng raw search trong $regex, backslash gây regex error.
    // Expected: Nên trả 400 nhưng hiện tại 500 → BUG.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher06', fullName: 'Teacher Six', email: 'teacher06@test.com',
      password: 'Password123', role: 'teacher',
    });

    const response = await request(app.getHttpServer())
      .get(`/courses/teacher/${user.id}?search=\\`)
      .set('Authorization', `Bearer ${accessToken}`);

    // BUG: code hiện tại trả 500 (crash) thay vì 400
    expect(response.status).toBe(400);
  });

  // ==================== DELETE COURSE ====================

  it('MC-034 — should_return_200_when_deleting_own_course', async () => {
    // MC-034: Teacher xóa khóa học của mình (MC-01-063).
    // Mô tả: DELETE /courses/delete/:courseId thành công.
    // Expected: HTTP 200, course bị xóa khỏi DB.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher07', fullName: 'Teacher Seven', email: 'teacher07@test.com',
      password: 'Password123', role: 'teacher',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Course To Delete', teacherId: user.id });
    const courseId = createRes.body.data.course.id;

    const deleteRes = await request(app.getHttpServer())
      .delete(`/courses/delete/${courseId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(200);

    // CHECKDB: verify course bị xóa
    const dbCourse = await courseModel.findById(courseId);
    expect(dbCourse).toBeNull();
  });

  it('MC-035 — should_return_403_when_student_deletes_course', async () => {
    // MC-035: Student xóa khóa học → PHẢI bị chặn (MC-01-064 Fail).
    // Mô tả: Không có role check trên DELETE endpoint.
    // Expected: HTTP 403 Forbidden.
    const { accessToken: teacherToken, user: teacherUser } = await registerAndLogin({
      username: 'teacher08', fullName: 'Teacher Eight', email: 'teacher08@test.com',
      password: 'Password123', role: 'teacher',
    });
    const { accessToken: studentToken } = await registerAndLogin({
      username: 'student02', fullName: 'Student Two', email: 'student02@test.com',
      password: 'Password123', role: 'student',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ courseName: 'Course Student Deletes', teacherId: teacherUser.id });
    const courseId = createRes.body.data.course.id;

    // Student xóa course → phải bị chặn 403
    const deleteRes = await request(app.getHttpServer())
      .delete(`/courses/delete/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(deleteRes.status).toBe(403);
  });

  it('MC-036 — should_return_401_when_deleting_without_jwt', async () => {
    // MC-036: Xóa course không có JWT → 401.
    // Mô tả: JwtAuthGuard chặn request.
    // Expected: HTTP 401.
    const response = await request(app.getHttpServer())
      .delete('/courses/delete/507f1f77bcf86cd799439022');

    expect(response.status).toBe(401);
  });

  // ==================== UPDATE COURSE NAME ====================

  it('MC-037 — should_return_200_when_updating_course_name', async () => {
    // MC-037: Cập nhật tên khóa học thành công (MC-01-034).
    // Mô tả: PATCH /courses/:courseId/name với tên mới.
    // Expected: HTTP 200, tên đã thay đổi.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher09', fullName: 'Teacher Nine', email: 'teacher09@test.com',
      password: 'Password123', role: 'teacher',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Old Course Name', teacherId: user.id });
    const courseId = createRes.body.data.course.id;

    const updateRes = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/name`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'New Course Name' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.course.courseName).toBe('New Course Name');

    // CHECKDB: verify DB lưu đúng
    const dbCourse = await courseModel.findById(courseId);
    expect(dbCourse.courseName).toBe('New Course Name');
  });

  it('MC-038 — should_return_400_when_update_name_is_empty', async () => {
    // MC-038: Cập nhật tên rỗng → 400 (MC-01-030).
    // Mô tả: @IsNotEmpty() trong UpdateCourseNameDto.
    // Expected: HTTP 400.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher10', fullName: 'Teacher Ten', email: 'teacher10@test.com',
      password: 'Password123', role: 'teacher',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Course Name', teacherId: user.id });
    const courseId = createRes.body.data.course.id;

    const updateRes = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/name`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: '' });

    expect(updateRes.status).toBe(400);
  });

  it('MC-039 — should_return_400_when_name_shorter_than_6_chars', async () => {
    // MC-039: Cập nhật tên < 6 ký tự → PHẢI bị reject (MC-01-033 Fail).
    // Mô tả: Theo nghiệp vụ, tên khóa học >= 6 ký tự.
    // Expected: HTTP 400.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher11', fullName: 'Teacher Eleven', email: 'teacher11@test.com',
      password: 'Password123', role: 'teacher',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Valid Name Here', teacherId: user.id });
    const courseId = createRes.body.data.course.id;

    const updateRes = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/name`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'ac' });

    expect(updateRes.status).toBe(400);
  });

  it('MC-040 — should_return_401_when_updating_without_jwt', async () => {
    // MC-040: Cập nhật tên course không có JWT → 401.
    // Mô tả: JwtAuthGuard chặn request.
    // Expected: HTTP 401.
    const response = await request(app.getHttpServer())
      .patch('/courses/507f1f77bcf86cd799439022/name')
      .send({ courseName: 'New Name' });

    expect(response.status).toBe(401);
  });

  it('MC-041 — should_return_400_when_create_name_shorter_than_6_chars', async () => {
    // MC-041: Tạo khóa học tên < 6 ký tự → PHẢI bị reject (MC-01-046 Fail).
    // Mô tả: Theo nghiệp vụ, tên khóa học >= 6 ký tự.
    // Expected: HTTP 400.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher12', fullName: 'Teacher Twelve', email: 'teacher12@test.com',
      password: 'Password123', role: 'teacher',
    });

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'AB', teacherId: user.id });

    expect(response.status).toBe(400);
  });

  it('MC-042 — should_return_400_when_create_name_over_100_chars', async () => {
    // MC-042: Tạo khóa học tên > 100 ký tự → PHẢI bị reject (MC-01-047 Fail).
    // Mô tả: Theo nghiệp vụ, tên khóa học <= 100 ký tự.
    // Expected: HTTP 400.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher13', fullName: 'Teacher Thirteen', email: 'teacher13@test.com',
      password: 'Password123', role: 'teacher',
    });

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'A'.repeat(250), teacherId: user.id });

    expect(response.status).toBe(400);
  });

  it('MC-043 — should_return_400_when_update_name_over_100_chars', async () => {
    // MC-043: Cập nhật tên > 100 ký tự → PHẢI bị reject (MC-01-031 Fail).
    // Mô tả: Theo nghiệp vụ, tên khóa học <= 100 ký tự.
    // Expected: HTTP 400.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher14', fullName: 'Teacher Fourteen', email: 'teacher14@test.com',
      password: 'Password123', role: 'teacher',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Valid Name Here', teacherId: user.id });
    const courseId = createRes.body.data.course.id;

    const updateRes = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/name`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'A'.repeat(250) });

    expect(updateRes.status).toBe(400);
  });

  it('MC-044 — should_return_403_when_teacher_updates_another_teachers_course', async () => {
    // MC-044: Teacher A cập nhật course của Teacher B → 403 (MC-01-036 Fail).
    // Mô tả: updateCourseName không kiểm tra ownership.
    // Expected: HTTP 403 Forbidden.
    const { accessToken: tokenA } = await registerAndLogin({
      username: 'teacherA', fullName: 'Teacher A', email: 'teacherA@test.com',
      password: 'Password123', role: 'teacher',
    });
    const { accessToken: tokenB, user: userB } = await registerAndLogin({
      username: 'teacherB', fullName: 'Teacher B', email: 'teacherB@test.com',
      password: 'Password123', role: 'teacher',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ courseName: 'Teacher B Course', teacherId: userB.id });
    const courseId = createRes.body.data.course.id;

    // Teacher A cố cập nhật course của Teacher B
    const updateRes = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/name`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ courseName: 'Hacked By Teacher A' });

    expect(updateRes.status).toBe(403);
  });

  it('MC-045 — should_return_404_when_deleting_nonexistent_course', async () => {
    // MC-045: Xóa course không tồn tại → 404.
    // Mô tả: DELETE /courses/delete/:courseId với courseId không tồn tại.
    // Expected: HTTP 404.
    const { accessToken } = await registerAndLogin({
      username: 'teacher15', fullName: 'Teacher Fifteen', email: 'teacher15@test.com',
      password: 'Password123', role: 'teacher',
    });

    const response = await request(app.getHttpServer())
      .delete('/courses/delete/507f1f77bcf86cd799439099')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it('MC-046 — should_leave_orphan_enrollments_after_delete_exposing_cascade_bug', async () => {
    // MC-046: Xóa course không xóa enrollments liên quan (MC-01-067 Fail).
    // Mô tả: Kiểm tra DB sau delete, enrollments vẫn còn.
    // Expected: Enrollments phải bị xóa theo.
    const { accessToken, user } = await registerAndLogin({
      username: 'teacher16', fullName: 'Teacher Sixteen', email: 'teacher16@test.com',
      password: 'Password123', role: 'teacher',
    });

    const createRes = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseName: 'Course With Enrollments', teacherId: user.id });
    const courseId = createRes.body.data.course.id;

    // Tạo enrollment giả lập
    await enrollmentModel.create({ courseId, studentId: '507f1f77bcf86cd799439044' });

    // Xóa course
    await request(app.getHttpServer())
      .delete(`/courses/delete/${courseId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // CHECKDB: enrollment phải bị xóa theo
    const orphanEnrollments = await enrollmentModel.find({ courseId });
    expect(orphanEnrollments).toHaveLength(0);
  });
});
