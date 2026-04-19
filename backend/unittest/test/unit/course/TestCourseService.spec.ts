import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request, { Response as SupertestResponse } from 'supertest';

import { CoursesModule } from 'src/modules/courses/courses.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { Course, CourseSchema } from 'src/database/schemas/course.schema';
import {
  Enrollment,
  EnrollmentSchema,
} from 'src/database/schemas/enrollment.schema';
import { Exam, ExamSchema } from 'src/database/schemas/exam.schema';
import {
  Submission,
  SubmissionSchema,
} from 'src/database/schemas/submission.schema';

class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: String(req.headers['x-user-id'] ?? 'mock-user-id'),
      role: String(req.headers['x-user-role'] ?? 'student'),
    };
    return true;
  }
}

describe('TestCourseService - Giáo viên CRUD khóa học (Controller -> Service -> DB)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;

  let userModel: Model<any>;
  let courseModel: Model<any>;
  let enrollmentModel: Model<any>;
  let examModel: Model<any>;
  let submissionModel: Model<any>;

  async function createUser(role: 'student' | 'teacher' | 'admin', fullName: string) {
    return userModel.create({
      username: `${role}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      email: `${role}_${Date.now()}_${Math.floor(Math.random() * 10000)}@mail.com`,
      passwordHash: 'hashed-password-for-test',
      fullName,
      role,
    });
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoServer.getUri()),
        CoursesModule,
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Course.name, schema: CourseSchema },
          { name: Enrollment.name, schema: EnrollmentSchema },
          { name: Exam.name, schema: ExamSchema },
          { name: Submission.name, schema: SubmissionSchema },
        ]),
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
      }),
    );

    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    userModel = moduleFixture.get<Model<any>>(getModelToken(User.name));
    courseModel = moduleFixture.get<Model<any>>(getModelToken(Course.name));
    enrollmentModel = moduleFixture.get<Model<any>>(getModelToken(Enrollment.name));
    examModel = moduleFixture.get<Model<any>>(getModelToken(Exam.name));
    submissionModel = moduleFixture.get<Model<any>>(getModelToken(Submission.name));
  });

  beforeEach(async () => {
    // ROLLBACK: dọn dữ liệu test trước mỗi test case để đảm bảo các case độc lập.
    await Promise.all([
      submissionModel.deleteMany({}),
      examModel.deleteMany({}),
      enrollmentModel.deleteMany({}),
      courseModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  it('should_create_course_successfully_when_teacher_creates_own_course', async () => {
    // TC_COURSE_001: Giáo viên tạo khóa học của chính mình thành công.
    // Mô tả: Kiểm tra luồng CRUD - Create qua controller -> service -> DB thật.
    // Expected: HTTP 201 và dữ liệu khóa học được lưu đúng trong DB.
    const teacher = await createUser('teacher', 'Nguyễn Văn A');

    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({
        courseName: 'Khóa học kiểm thử DB',
        teacherId: String(teacher._id),
      });

    expect(response.status).toBe(201);
    expect(response.body?.success).toBe(true);

    // CHECKDB
    const createdCourse = await courseModel.findOne({ teacherId: teacher._id }).lean();
    expect(createdCourse).toBeTruthy();
    expect((createdCourse as any).courseName).toBe('Khóa học kiểm thử DB');
  });

  it('should_list_courses_by_teacher_successfully', async () => {
    // TC_COURSE_002: Giáo viên xem danh sách khóa học của mình thành công.
    // Mô tả: Kiểm tra luồng CRUD - Read/List qua endpoint teacher/:teacherId.
    // Expected: HTTP 200 và danh sách trả về đúng số lượng khóa học.
    const teacher = await createUser('teacher', 'Teacher A');

    await courseModel.create({
      publicId: 'C200001',
      courseName: 'NodeJS Cơ Bản',
      teacherId: teacher._id,
    });
    await courseModel.create({
      publicId: 'C200002',
      courseName: 'NestJS Nâng Cao',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);
    expect(response.body?.data?.courses?.length).toBe(2);

    // CHECKDB
    const count = await courseModel.countDocuments({ teacherId: teacher._id });
    expect(count).toBe(2);
  });

  it('should_update_course_name_successfully_when_teacher_updates_own_course', async () => {
    // TC_COURSE_003: Giáo viên cập nhật tên khóa học của chính mình thành công.
    // Mô tả: Kiểm tra luồng CRUD - Update tên khóa học.
    // Expected: HTTP 200 và tên khóa học trong DB được cập nhật.
    const teacher = await createUser('teacher', 'Teacher Owner');

    const course = await courseModel.create({
      publicId: 'C200003',
      courseName: 'Tên cũ',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .patch(`/courses/${String(course._id)}/name`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ courseName: 'Tên mới đã cập nhật' });

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);

    // CHECKDB
    const updatedCourse: any = await courseModel.findById(course._id).lean();
    expect(updatedCourse.courseName).toBe('Tên mới đã cập nhật');
  });

  it('should_delete_course_successfully_when_teacher_deletes_own_course', async () => {
    // TC_COURSE_004: Giáo viên xóa khóa học của chính mình thành công.
    // Mô tả: Kiểm tra luồng CRUD - Delete khóa học.
    // Expected: HTTP 200 và bản ghi course bị xóa khỏi DB.
    const teacher = await createUser('teacher', 'Teacher Owner');

    const course = await courseModel.create({
      publicId: 'C200004',
      courseName: 'Khóa học cần xóa',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .delete(`/courses/delete/${String(course._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.success).toBe(true);

    // CHECKDB
    const deletedCourse = await courseModel.findById(course._id).lean();
    expect(deletedCourse).toBeNull();
  });

  it('should_throw_forbidden_when_teacher_creates_course_for_another_teacher', async () => {
    // TC_COURSE_005: Teacher A tạo course với teacherId của Teacher B phải bị 403.
    // Mô tả: Case requirement ownership để bắt lỗi phân quyền.
    // Expected: HTTP 403 và DB không tạo course cho teacher B.
    const teacherA = await createUser('teacher', 'Teacher A');
    const teacherB = await createUser('teacher', 'Teacher B');

    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', String(teacherA._id))
      .set('x-user-role', 'teacher')
      .send({
        courseName: 'Hacked Course',
        teacherId: String(teacherB._id),
      });

    expect(response.status).toBe(403);

    // CHECKDB
    const createdForB = await courseModel.findOne({ teacherId: teacherB._id }).lean();
    expect(createdForB).toBeNull();
  });

  it('should_throw_forbidden_when_teacher_updates_another_teacher_course', async () => {
    // TC_COURSE_006: Teacher A cập nhật khóa học của Teacher B phải bị 403.
    // Mô tả: Case requirement ownership cho update.
    // Expected: HTTP 403 và tên khóa học trong DB không đổi.
    const teacherA = await createUser('teacher', 'Teacher A');
    const teacherB = await createUser('teacher', 'Teacher B');

    const courseOfB = await courseModel.create({
      publicId: 'C200005',
      courseName: 'Khóa học của B',
      teacherId: teacherB._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .patch(`/courses/${String(courseOfB._id)}/name`)
      .set('x-user-id', String(teacherA._id))
      .set('x-user-role', 'teacher')
      .send({ courseName: 'Tên bị hack' });

    expect(response.status).toBe(403);

    // CHECKDB
    const currentCourse: any = await courseModel.findById(courseOfB._id).lean();
    expect(currentCourse.courseName).toBe('Khóa học của B');
  });

  it('should_throw_forbidden_when_teacher_deletes_another_teacher_course', async () => {
    // TC_COURSE_007: Teacher A xóa khóa học của Teacher B phải bị 403.
    // Mô tả: Case requirement ownership cho delete.
    // Expected: HTTP 403 và bản ghi khóa học vẫn còn trong DB.
    const teacherA = await createUser('teacher', 'Teacher A');
    const teacherB = await createUser('teacher', 'Teacher B');

    const courseOfB = await courseModel.create({
      publicId: 'C200006',
      courseName: 'Khóa học của Teacher B',
      teacherId: teacherB._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .delete(`/courses/delete/${String(courseOfB._id)}`)
      .set('x-user-id', String(teacherA._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(403);

    // CHECKDB
    const remains = await courseModel.findById(courseOfB._id).lean();
    expect(remains).toBeTruthy();
  });

  it('should_throw_forbidden_when_student_updates_course', async () => {
    // TC_COURSE_008: Student cập nhật khóa học phải bị 403.
    // Mô tả: Case requirement RBAC cho thao tác update.
    // Expected: HTTP 403 và DB giữ nguyên dữ liệu.
    const teacher = await createUser('teacher', 'Teacher Owner');
    const student = await createUser('student', 'Student X');

    const course = await courseModel.create({
      publicId: 'C200007',
      courseName: 'Tên cũ',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .patch(`/courses/${String(course._id)}/name`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student')
      .send({ courseName: 'Tên bị sửa trái phép' });

    expect(response.status).toBe(403);

    // CHECKDB
    const currentCourse: any = await courseModel.findById(course._id).lean();
    expect(currentCourse.courseName).toBe('Tên cũ');
  });

  it('should_throw_forbidden_when_student_deletes_course', async () => {
    // TC_COURSE_009: Student xóa khóa học phải bị 403.
    // Mô tả: Case requirement RBAC cho thao tác delete.
    // Expected: HTTP 403 và bản ghi khóa học vẫn còn trong DB.
    const teacher = await createUser('teacher', 'Teacher Owner');
    const student = await createUser('student', 'Student X');

    const course = await courseModel.create({
      publicId: 'C200008',
      courseName: 'Khóa học cần bảo vệ',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .delete(`/courses/delete/${String(course._id)}`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student');

    expect(response.status).toBe(403);

    // CHECKDB
    const remains = await courseModel.findById(course._id).lean();
    expect(remains).toBeTruthy();
  });

  it('should_delete_related_enrollments_when_course_deleted', async () => {
    // TC_COURSE_010: Xóa course phải xóa enrollment liên quan (cascade delete).
    // Mô tả: Case requirement data consistency khi delete khóa học.
    // Expected: HTTP 200 và enrollment liên quan không còn trong DB.
    const teacher = await createUser('teacher', 'Teacher X');
    const student = await createUser('student', 'Student X');

    const course = await courseModel.create({
      publicId: 'C200009',
      courseName: 'Course có enrollment',
      teacherId: teacher._id,
    });

    await enrollmentModel.create({
      studentId: student._id,
      courseId: course._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .delete(`/courses/delete/${String(course._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);

    // CHECKDB
    const enrollmentStillExists = await enrollmentModel.findOne({
      courseId: course._id,
    });
    expect(enrollmentStillExists).toBeNull();
  });

  it('should_delete_related_exams_and_submissions_when_course_deleted', async () => {
    // TC_COURSE_011: Xóa course phải xóa exam và submission liên quan.
    // Mô tả: Case requirement data consistency khi xóa khóa học có exam/submission.
    // Expected: HTTP 200 và exam/submission liên quan bị xóa khỏi DB.
    const teacher = await createUser('teacher', 'Teacher X');
    const student = await createUser('student', 'Student X');

    const course = await courseModel.create({
      publicId: 'C200010',
      courseName: 'Course có exam/submission',
      teacherId: teacher._id,
    });

    const exam = await examModel.create({
      publicId: 'E200010',
      title: 'Đề kiểm tra giữa kỳ',
      durationMinutes: 60,
      startTime: new Date('2026-04-20T08:00:00.000Z'),
      endTime: new Date('2026-04-20T09:00:00.000Z'),
      status: 'scheduled',
      courseId: course._id,
      questions: [],
      rateScore: 50,
    });

    await submissionModel.create({
      studentId: student._id,
      examId: exam._id,
      score: 75,
      status: 'submitted',
      answers: [],
      submittedAt: new Date('2026-04-20T09:00:00.000Z'),
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .delete(`/courses/delete/${String(course._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);

    // CHECKDB
    const remainedExam = await examModel.findOne({ courseId: course._id });
    const remainedSubmission = await submissionModel.findOne({ examId: exam._id });
    expect(remainedExam).toBeNull();
    expect(remainedSubmission).toBeNull();
  });

  it('should_throw_conflict_when_creating_course_with_existing_name', async () => {
    // TC_COURSE_012: Tạo khóa học với tên đã tồn tại phải bị từ chối.
    // Mô tả: Case requirement tránh tạo trùng tên khóa học.
    // Expected: HTTP 409 và chỉ có 1 bản ghi course trong DB.
    const teacher = await createUser('teacher', 'Teacher A');

    await courseModel.create({
      publicId: 'C200011',
      courseName: 'Khóa học trùng tên',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({
        courseName: 'Khóa học trùng tên',
        teacherId: String(teacher._id),
      });

    expect(response.status).toBe(409);

    // CHECKDB
    const duplicatedCourses = await courseModel.find({
      teacherId: teacher._id,
      courseName: 'Khóa học trùng tên',
    });
    expect(duplicatedCourses).toHaveLength(1);
  });

  it('should_return_pagination_metadata_when_teacher_has_many_courses', async () => {
    // TC_COURSE_013: Danh sách courses phải có metadata phân trang khi số lượng lớn.
    // Mô tả: Case requirement pagination cho trang quản lý khóa học.
    // Expected: HTTP 200 và response có trường pagination.
    const teacher = await createUser('teacher', 'Teacher Pagination');

    const bulkCourses = Array.from({ length: 55 }).map((_, index) => ({
      publicId: `C3${String(index).padStart(5, '0')}`,
      courseName: `Course ${index}`,
      teacherId: teacher._id,
    }));
    await courseModel.insertMany(bulkCourses);

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.data?.pagination).toBeDefined();
    expect(response.body?.data?.pagination?.totalItems).toBeGreaterThan(50);
  });

  it('should_throw_bad_request_when_search_keyword_longer_than_255_characters', async () => {
    // TC_COURSE_014: Từ khóa tìm kiếm dài hơn 255 ký tự phải bị từ chối.
    // Mô tả: Case requirement validate input search không hợp lệ.
    // Expected: HTTP 400 và báo lỗi từ khóa tìm kiếm không hợp lệ.
    const teacher = await createUser('teacher', 'Teacher Search');

    await courseModel.create({
      publicId: 'C200012',
      courseName: 'Lập trình Python cơ bản',
      teacherId: teacher._id,
    });

    const longSearch = 'A'.repeat(256);

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .query({ search: longSearch })
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(400);
  });

  it('should_throw_bad_request_when_search_keyword_is_single_backslash', async () => {
    // TC_COURSE_015: Từ khóa tìm kiếm là ký tự '\\' phải bị từ chối hoặc xử lý an toàn.
    // Mô tả: Case requirement validate ký tự đặc biệt trong search.
    // Expected: HTTP 400 và không làm crash hệ thống.
    const teacher = await createUser('teacher', 'Teacher Search');

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .query({ search: '\\' })
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(400);
  });

  it('should_return_forbidden_when_student_calls_create_course_api', async () => {
    // TC_COURSE_016: Student gọi API tạo khóa học phải bị 403.
    // Mô tả: Xác minh code gốc có chặn student tự tạo khóa học hay không.
    // Expected: HTTP 403 với message "Only teachers can create courses".
    const student = await createUser('student', 'Student A');

    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student')
      .send({
        courseName: 'Test Course',
        teacherId: String(student._id),
      });

    expect(response.status).toBe(403);
    expect(String(response.body?.message ?? '')).toContain('Only teachers can create courses');

    // CHECKDB
    const createdByStudent = await courseModel.findOne({ teacherId: student._id }).lean();
    expect(createdByStudent).toBeNull();
  });

  it('should_return_empty_course_list_when_teacher_has_no_courses', async () => {
    // TC_COURSE_017: Teacher chưa có khóa học thì danh sách trả về rỗng.
    // Mô tả: Kiểm tra hành vi read/list khi không có dữ liệu.
    // Expected: HTTP 200 và courses là mảng rỗng.
    const teacher = await createUser('teacher', 'Teacher Empty');

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body?.data?.courses)).toBe(true);
    expect(response.body?.data?.courses).toHaveLength(0);
  });

  it('should_filter_course_list_by_search_keyword_successfully', async () => {
    // TC_COURSE_018: Search theo tên khóa học trả về đúng kết quả khớp.
    // Mô tả: Kiểm tra chức năng tìm kiếm course theo từ khóa.
    // Expected: HTTP 200 và chỉ trả về course chứa từ khóa.
    const teacher = await createUser('teacher', 'Teacher Search Success');

    await courseModel.insertMany([
      {
        publicId: 'C200013',
        courseName: 'Lập trình Python cơ bản',
        teacherId: teacher._id,
      },
      {
        publicId: 'C200014',
        courseName: 'Cơ sở dữ liệu',
        teacherId: teacher._id,
      },
    ]);

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .query({ search: 'Python' })
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.data?.courses).toHaveLength(1);
    expect(response.body?.data?.courses?.[0]?.courseName).toContain('Python');
  });

  it('should_return_empty_course_list_when_search_keyword_not_found', async () => {
    // TC_COURSE_019: Search không có kết quả trả về danh sách rỗng.
    // Mô tả: Kiểm tra case từ khóa không tồn tại trong danh sách course.
    // Expected: HTTP 200 và courses rỗng.
    const teacher = await createUser('teacher', 'Teacher Search Empty');

    await courseModel.create({
      publicId: 'C200015',
      courseName: 'Lập trình Java cơ bản',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .query({ search: 'xczcxvvvv' })
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.data?.courses).toHaveLength(0);
  });

  it('should_return_bad_request_when_creating_course_with_empty_name', async () => {
    // TC_COURSE_020: Tạo khóa học với tên rỗng phải bị validation từ chối.
    // Mô tả: Kiểm tra IsNotEmpty cho courseName tại API create.
    // Expected: HTTP 400 và không tạo dữ liệu.
    const teacher = await createUser('teacher', 'Teacher Validate Name');

    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({
        courseName: '',
        teacherId: String(teacher._id),
      });

    expect(response.status).toBe(400);

    // CHECKDB
    const total = await courseModel.countDocuments({ teacherId: teacher._id });
    expect(total).toBe(0);
  });

  it('should_return_bad_request_when_creating_course_with_invalid_teacher_id_format', async () => {
    // TC_COURSE_021: teacherId sai định dạng ObjectId phải bị validation từ chối.
    // Mô tả: Kiểm tra IsMongoId cho teacherId ở API create.
    // Expected: HTTP 400.
    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', 'teacher-x')
      .set('x-user-role', 'teacher')
      .send({
        courseName: 'Khóa học hợp lệ',
        teacherId: 'teacher-not-object-id',
      });

    expect(response.status).toBe(400);
  });

  it('should_return_not_found_when_updating_non_existing_course', async () => {
    // TC_COURSE_022: Cập nhật tên course không tồn tại phải trả NotFound.
    // Mô tả: Kiểm tra nhánh lỗi update khi courseId không có trong DB.
    // Expected: HTTP 404.
    const nonExistingCourseId = '507f1f77bcf86cd799439011';

    const response: SupertestResponse = await request(app.getHttpServer())
      .patch(`/courses/${nonExistingCourseId}/name`)
      .set('x-user-id', nonExistingCourseId)
      .set('x-user-role', 'teacher')
      .send({ courseName: 'Tên mới' });

    expect(response.status).toBe(404);
  });

  it('should_return_not_found_when_deleting_non_existing_course', async () => {
    // TC_COURSE_023: Xóa course không tồn tại phải trả NotFound.
    // Mô tả: Kiểm tra nhánh lỗi delete khi courseId không có trong DB.
    // Expected: HTTP 404.
    const nonExistingCourseId = '507f1f77bcf86cd799439012';

    const response: SupertestResponse = await request(app.getHttpServer())
      .delete(`/courses/delete/${nonExistingCourseId}`)
      .set('x-user-id', nonExistingCourseId)
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(404);
  });

  it('should_return_not_found_when_creating_course_for_non_existing_teacher', async () => {
    // TC_COURSE_024: Tạo course với teacherId không tồn tại phải bị từ chối.
    // Mô tả: Kiểm tra createCourse trả NotFound khi không tìm thấy teacher.
    // Expected: HTTP 404.
    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', '507f1f77bcf86cd799439013')
      .set('x-user-role', 'teacher')
      .send({
        courseName: 'Course non-existing teacher',
        teacherId: '507f1f77bcf86cd799439013',
      });

    expect(response.status).toBe(404);
  });

  it('should_return_forbidden_when_teacher_id_belongs_to_student_on_create', async () => {
    // TC_COURSE_025: Tạo course với teacherId thuộc user role student phải bị chặn.
    // Mô tả: Kiểm tra rule chỉ teacher mới được tạo course.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student as Teacher Id');

    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student')
      .send({
        courseName: 'Course invalid teacher role',
        teacherId: String(student._id),
      });

    expect(response.status).toBe(403);
  });

  it('should_return_bad_request_when_listing_courses_with_invalid_teacher_id_format', async () => {
    // TC_COURSE_026: List courses với teacherId sai format phải bị từ chối.
    // Mô tả: Kiểm tra validate định dạng ObjectId ở endpoint list.
    // Expected: HTTP 400.
    const response: SupertestResponse = await request(app.getHttpServer())
      .get('/courses/teacher/not-valid-object-id')
      .set('x-user-id', 'not-valid-object-id')
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(400);
  });

  it('should_return_bad_request_when_updating_course_with_invalid_course_id_format', async () => {
    // TC_COURSE_027: Update courseId sai format phải bị từ chối.
    // Mô tả: Kiểm tra validate định dạng ObjectId ở endpoint update.
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher invalid update id');

    const response: SupertestResponse = await request(app.getHttpServer())
      .patch('/courses/not-valid-object-id/name')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ courseName: 'Course name update invalid id' });

    expect(response.status).toBe(400);
  });

  it('should_return_bad_request_when_deleting_course_with_invalid_course_id_format', async () => {
    // TC_COURSE_028: Delete courseId sai format phải bị từ chối.
    // Mô tả: Kiểm tra validate định dạng ObjectId ở endpoint delete.
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher invalid delete id');

    const response: SupertestResponse = await request(app.getHttpServer())
      .delete('/courses/delete/not-valid-object-id')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(400);
  });

  it('should_return_forbidden_when_teacher_requests_courses_of_other_teacher', async () => {
    // TC_COURSE_029: Teacher A không được phép đọc danh sách course của Teacher B.
    // Mô tả: Kiểm tra phân quyền read theo identity của user đang đăng nhập.
    // Expected: HTTP 403 (defect exposure nếu trả 200).
    const teacherA = await createUser('teacher', 'Teacher A list foreign');
    const teacherB = await createUser('teacher', 'Teacher B list foreign');

    await courseModel.create({
      publicId: 'C200016',
      courseName: 'Course of Teacher B',
      teacherId: teacherB._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacherB._id)}`)
      .set('x-user-id', String(teacherA._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(403);
  });

  it('should_return_forbidden_when_student_requests_courses_of_teacher', async () => {
    // TC_COURSE_030: Student không được gọi API list course của teacher.
    // Mô tả: Kiểm tra chặn role student tại endpoint list by teacher.
    // Expected: HTTP 403 (defect exposure nếu trả 200).
    const teacher = await createUser('teacher', 'Teacher list target');
    const student = await createUser('student', 'Student list target');

    await courseModel.create({
      publicId: 'C200017',
      courseName: 'Course target for student list',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student');

    expect(response.status).toBe(403);
  });

  it('should_return_courses_sorted_by_created_at_descending', async () => {
    // TC_COURSE_031: Danh sách course phải sắp xếp theo createdAt giảm dần.
    // Mô tả: Kiểm tra sort({ createdAt: -1 }) trong service list.
    // Expected: HTTP 200 và course mới nhất đứng đầu danh sách.
    const teacher = await createUser('teacher', 'Teacher sort list');

    const oldCourse = await courseModel.create({
      publicId: 'C200018',
      courseName: 'Old Course',
      teacherId: teacher._id,
    });
    const newCourse = await courseModel.create({
      publicId: 'C200019',
      courseName: 'New Course',
      teacherId: teacher._id,
    });

    // CHECKDB: đảm bảo 2 course tạo thành công trước khi gọi API
    expect(oldCourse).toBeTruthy();
    expect(newCourse).toBeTruthy();

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.data?.courses?.[0]?.courseName).toBe('New Course');
    expect(response.body?.data?.courses?.[1]?.courseName).toBe('Old Course');
  });

  it('should_apply_trim_for_search_query_and_match_course_name', async () => {
    // TC_COURSE_032: Search query có khoảng trắng đầu/cuối vẫn phải match đúng.
    // Mô tả: Kiểm tra Transform(trim) của DTO query search.
    // Expected: HTTP 200 và trả đúng course match theo keyword đã trim.
    const teacher = await createUser('teacher', 'Teacher trim search');

    await courseModel.create({
      publicId: 'C200020',
      courseName: 'Machine Learning Basic',
      teacherId: teacher._id,
    });

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .query({ search: '   Machine   ' })
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.data?.courses).toHaveLength(1);
    expect(response.body?.data?.courses?.[0]?.courseName).toBe('Machine Learning Basic');
  });

  it('should_return_bad_request_when_search_keyword_has_invalid_regex_pattern', async () => {
    // TC_COURSE_033: Search pattern regex không hợp lệ phải bị từ chối.
    // Mô tả: Kiểm tra input '[' được xử lý an toàn thay vì làm vỡ query.
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher invalid regex pattern');

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .query({ search: '[' })
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(400);
  });

  it('should_create_course_with_public_id_prefix_c', async () => {
    // TC_COURSE_034: Course mới tạo phải có publicId bắt đầu bằng ký tự C.
    // Mô tả: Kiểm tra generatePrefixedPublicId hoạt động đúng cho course.
    // Expected: HTTP 201 và publicId trong DB match /^C\d+$/.
    const teacher = await createUser('teacher', 'Teacher public id prefix');

    const response: SupertestResponse = await request(app.getHttpServer())
      .post('/courses')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({
        courseName: 'Course public id prefix test',
        teacherId: String(teacher._id),
      });

    expect(response.status).toBe(201);

    const created = await courseModel
      .findOne({ teacherId: teacher._id, courseName: 'Course public id prefix test' })
      .lean();
    expect(created).toBeTruthy();
    expect(String((created as any).publicId)).toMatch(/^C\d+$/);
  });

  it('should_return_all_courses_when_search_query_is_whitespace_only', async () => {
    // TC_COURSE_035: Search chỉ có whitespace phải được coi như không truyền search.
    // Mô tả: Kiểm tra nhánh search rỗng sau khi trim.
    // Expected: HTTP 200 và trả về toàn bộ course của teacher.
    const teacher = await createUser('teacher', 'Teacher whitespace search');

    await courseModel.insertMany([
      { publicId: 'C200021', courseName: 'Course One', teacherId: teacher._id },
      { publicId: 'C200022', courseName: 'Course Two', teacherId: teacher._id },
    ]);

    const response: SupertestResponse = await request(app.getHttpServer())
      .get(`/courses/teacher/${String(teacher._id)}`)
      .query({ search: '     ' })
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(response.status).toBe(200);
    expect(response.body?.data?.courses).toHaveLength(2);
  });
});
