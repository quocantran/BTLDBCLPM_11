import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

import { RolesGuard } from 'src/common/guards/roles.guard';
import { Course, CourseSchema } from 'src/database/schemas/course.schema';
import { Exam, ExamSchema } from 'src/database/schemas/exam.schema';
import {
  Question,
  QuestionSchema,
} from 'src/database/schemas/question.schema';
import {
  Submission,
  SubmissionSchema,
} from 'src/database/schemas/submission.schema';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { ExamsController } from 'src/modules/exams/exams.controller';
import { ExamsService } from 'src/modules/exams/exams.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: String(req.headers['x-user-id'] ?? ''),
      role: String(req.headers['x-user-role'] ?? 'student'),
    };
    return true;
  }
}

describe('TestExamService - Teacher manages exams (Controller -> Service -> DB)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryReplSet;

  let userModel: Model<any>;
  let courseModel: Model<any>;
  let examModel: Model<any>;
  let questionModel: Model<any>;
  let submissionModel: Model<any>;

  const notificationServiceMock = {
    createNotification: jest.fn().mockResolvedValue(undefined),
  };

  let userSeq = 0;
  let courseSeq = 0;
  let examSeq = 0;

  const nextCoursePublicId = () => `C${String(++courseSeq).padStart(6, '0')}`;
  const nextExamPublicId = () => `E${String(++examSeq).padStart(6, '0')}`;

  async function createUser(
    role: 'student' | 'teacher' | 'admin',
    fullName: string,
  ) {
    userSeq += 1;
    return userModel.create({
      username: `${role}_${userSeq}`,
      email: `${role}_${userSeq}@mail.com`,
      passwordHash: 'hashed-password-for-test',
      fullName,
      role,
    });
  }

  async function createCourse(
    teacherId: Types.ObjectId,
    courseName = 'Course for exam',
  ) {
    return courseModel.create({
      publicId: nextCoursePublicId(),
      courseName,
      teacherId,
    });
  }

  async function seedExam(params: {
    courseId: Types.ObjectId;
    title?: string;
    status?: 'scheduled' | 'active' | 'completed';
    startTime?: Date;
    endTime?: Date;
    rateScore?: number;
    questionCount?: number;
  }) {
    const {
      courseId,
      title = `Exam ${examSeq + 1}`,
      status = 'scheduled',
      startTime = new Date(Date.now() + 60 * 60 * 1000),
      endTime = new Date(Date.now() + 2 * 60 * 60 * 1000),
      rateScore = 60,
      questionCount = 1,
    } = params;

    const courseDoc = await courseModel.findById(courseId).select('teacherId').exec();
    if (!courseDoc) {
      throw new NotFoundException('Course not found in seedExam');
    }
    const teacherId = courseDoc.teacherId as Types.ObjectId;

    const questionDocs = await questionModel.insertMany(
      Array.from({ length: questionCount }).map((_, idx) => ({
        content: `Question ${idx + 1}`,
        answerQuestion: 2,
        answer: [
          { content: 'A', isCorrect: false },
          { content: 'B', isCorrect: true },
          { content: 'C', isCorrect: false },
          { content: 'D', isCorrect: false },
        ],
        courseId,
        teacherId,
      })),
    );

    return examModel.create({
      publicId: nextExamPublicId(),
      title,
      durationMinutes: 60,
      startTime,
      endTime,
      status,
      courseId,
      questions: questionDocs.map((q) => q._id),
      rateScore,
    });
  }

  function buildCreateExamPayload(
    courseId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      title: 'Midterm Test',
      durationMinutes: 60,
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
      courseId,
      rateScore: 60,
      questions: [
        {
          content: '2 + 2 = ?',
          answerQuestion: 2,
          answer: [
            { content: '3' },
            { content: '4' },
            { content: '5' },
            { content: '6' },
          ],
        },
      ],
      ...overrides,
    };
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoServer.getUri()),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Course.name, schema: CourseSchema },
          { name: Exam.name, schema: ExamSchema },
          { name: Question.name, schema: QuestionSchema },
          { name: Submission.name, schema: SubmissionSchema },
        ]),
      ],
      controllers: [ExamsController],
      providers: [
        ExamsService,
        {
          provide: NotificationsService,
          useValue: notificationServiceMock,
        },
        {
          provide: APP_GUARD,
          useClass: FakeJwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => new RolesGuard(reflector),
          inject: [Reflector],
        },
      ],
    }).compile();

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
    examModel = moduleFixture.get<Model<any>>(getModelToken(Exam.name));
    questionModel = moduleFixture.get<Model<any>>(getModelToken(Question.name));
    submissionModel = moduleFixture.get<Model<any>>(getModelToken(Submission.name));

    await Promise.all([
      userModel.createCollection(),
      courseModel.createCollection(),
      questionModel.createCollection(),
      examModel.createCollection(),
      submissionModel.createCollection(),
    ]);
  });

  beforeEach(async () => {
    await Promise.all([
      submissionModel.deleteMany({}),
      examModel.deleteMany({}),
      questionModel.deleteMany({}),
      courseModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
    notificationServiceMock.createNotification.mockClear();
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  describe('create exam() - 13 test case', () => {
    it('should_create_exam_successfully_for_owner_teacher', async () => {
      // TC_EXAM_001: Giáo viên tạo bài thi cho khóa học của chính mình thành công.
      // Mô tả: Kiểm tra luồng create exam qua controller -> service -> DB.
      // Expected: HTTP 201, lưu exam và question vào DB.
      const teacher = await createUser('teacher', 'Teacher A');
      const course = await createCourse(teacher._id, 'NodeJS');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(buildCreateExamPayload(String(course._id)));

      expect(response.status).toBe(201);
      expect(response.body?.success).toBe(true);
      expect(response.body?.data?.exam?.title).toBe('Midterm Test');

      const examInDb = await examModel.findOne({ courseId: course._id }).lean();
      const questionCount = await questionModel.countDocuments({ courseId: course._id });
      expect(examInDb).toBeTruthy();
      expect(questionCount).toBe(1);
    });

    it('should_default_status_to_scheduled_when_status_missing', async () => {
      // TC_EXAM_002: Thiếu status thì hệ thống gán mặc định scheduled.
      // Mô tả: Kiểm tra logic default status ở service create.
      // Expected: HTTP 201 và exam.status là scheduled.
      const teacher = await createUser('teacher', 'Teacher B');
      const course = await createCourse(teacher._id, 'NestJS');

      const payload = buildCreateExamPayload(String(course._id));
      delete (payload as any).status;

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body?.data?.exam?.status).toBe('scheduled');
    });

    it('should_return_bad_request_for_invalid_course_id_format', async () => {
      // TC_EXAM_003: courseId sai định dạng ObjectId phải bị từ chối.
      // Mô tả: Kiểm tra validation courseId tại API create.
      // Expected: HTTP 400 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher C');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(buildCreateExamPayload('not-object-id'));

      expect(response.status).toBe(400);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_not_found_for_non_existing_course', async () => {
      // TC_EXAM_004: Tạo exam cho course không tồn tại phải bị từ chối.
      // Mô tả: Kiểm tra nhánh NotFound của create exam.
      // Expected: HTTP 404 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher D');
      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(buildCreateExamPayload('507f1f77bcf86cd799439011'));

      expect(response.status).toBe(404);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_forbidden_when_teacher_creates_exam_for_other_teacher_course', async () => {
      // TC_EXAM_005: Giáo viên không được tạo exam cho course của giáo viên khác.
      // Mô tả: Kiểm tra rule ownership ở create exam.
      // Expected: HTTP 403 và DB không có exam mới.
      const teacherA = await createUser('teacher', 'Teacher A');
      const teacherB = await createUser('teacher', 'Teacher B');
      const courseOfB = await createCourse(teacherB._id, 'Course B');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacherA._id))
        .set('x-user-role', 'teacher')
        .send(buildCreateExamPayload(String(courseOfB._id)));

      expect(response.status).toBe(403);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_forbidden_when_teacher_context_missing_id', async () => {
      // TC_EXAM_006: Thiếu teacher context phải bị từ chối.
      // Mô tả: Kiểm tra req.user.id bắt buộc trong create exam.
      // Expected: HTTP 403 và không có dữ liệu mới.
      const teacher = await createUser('teacher', 'Teacher E');
      const course = await createCourse(teacher._id, 'Missing Context');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-role', 'teacher')
        .send(buildCreateExamPayload(String(course._id)));

      expect(response.status).toBe(403);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_forbidden_when_teacher_id_is_invalid_format', async () => {
      // TC_EXAM_007: teacher id sai định dạng phải bị từ chối.
      // Mô tả: Kiểm tra validation teacher.id trong service create.
      // Expected: HTTP 403 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher F');
      const course = await createCourse(teacher._id, 'Bad Teacher Id');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', 'teacher-invalid-id')
        .set('x-user-role', 'teacher')
        .send(buildCreateExamPayload(String(course._id)));

      expect(response.status).toBe(403);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_bad_request_when_end_time_before_start_time', async () => {
      // TC_EXAM_008: endTime nhỏ hơn startTime phải bị từ chối.
      // Mô tả: Kiểm tra validate mốc thời gian exam.
      // Expected: HTTP 400 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher G');
      const course = await createCourse(teacher._id, 'Date Validation');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(
          buildCreateExamPayload(String(course._id), {
            startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          }),
        );

      expect(response.status).toBe(400);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_bad_request_when_duration_exceeds_time_window', async () => {
      // TC_EXAM_009: durationMinutes vượt quá khung giờ phải bị từ chối.
      // Mô tả: Kiểm tra duration không lớn hơn end-start.
      // Expected: HTTP 400 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher H');
      const course = await createCourse(teacher._id, 'Duration Validation');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(
          buildCreateExamPayload(String(course._id), {
            durationMinutes: 200,
            startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          }),
        );

      expect(response.status).toBe(400);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_bad_request_when_questions_payload_invalid', async () => {
      // TC_EXAM_010: Danh sách questions rỗng phải bị từ chối.
      // Mô tả: Kiểm tra validation ArrayMinSize của questions.
      // Expected: HTTP 400 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher I');
      const course = await createCourse(teacher._id, 'Question Validation');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(
          buildCreateExamPayload(String(course._id), {
            questions: [],
          }),
        );

      expect(response.status).toBe(400);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_bad_request_when_rate_score_is_greater_than_100', async () => {
      // TC_EXAM_031: rateScore lớn hơn 100 phải bị từ chối.
      // Mô tả: Kiểm tra validation Max(100) của rateScore.
      // Expected: HTTP 400 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher Rate Score Max');
      const course = await createCourse(teacher._id, 'Rate Score Max Course');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(
          buildCreateExamPayload(String(course._id), {
            rateScore: 101,
          }),
        );

      expect(response.status).toBe(400);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_bad_request_when_duration_minutes_is_not_positive', async () => {
      // TC_EXAM_032: durationMinutes không dương phải bị từ chối.
      // Mô tả: Kiểm tra validation IsPositive của durationMinutes.
      // Expected: HTTP 400 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher Duration');
      const course = await createCourse(teacher._id, 'Duration Course');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(
          buildCreateExamPayload(String(course._id), {
            durationMinutes: 0,
          }),
        );

      expect(response.status).toBe(400);
      expect(await examModel.countDocuments({})).toBe(0);
    });

    it('should_return_bad_request_when_answer_question_is_out_of_range', async () => {
      // TC_EXAM_033: answerQuestion vượt phạm vi 1..4 phải bị từ chối.
      // Mô tả: Kiểm tra validation Max(4) của answerQuestion.
      // Expected: HTTP 400 và không lưu exam.
      const teacher = await createUser('teacher', 'Teacher Answer Range');
      const course = await createCourse(teacher._id, 'Answer Range Course');

      const response = await request(app.getHttpServer())
        .post('/exams')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(
          buildCreateExamPayload(String(course._id), {
            questions: [
              {
                content: 'Question invalid answerQuestion',
                answerQuestion: 5,
                answer: [
                  { content: 'A' },
                  { content: 'B' },
                  { content: 'C' },
                  { content: 'D' },
                ],
              },
            ],
          }),
        );

      expect(response.status).toBe(400);
      expect(await examModel.countDocuments({})).toBe(0);
    });
  });

  describe('list exams() - 13 test case', () => {
    it('should_list_only_exams_belonging_to_teacher_courses', async () => {
      // TC_EXAM_011: Danh sách exam chỉ gồm course thuộc teacher hiện tại.
      // Mô tả: Kiểm tra lọc theo ownership teacherId.
      // Expected: HTTP 200 và chỉ có exam của teacher A.
      const teacherA = await createUser('teacher', 'Teacher List A');
      const teacherB = await createUser('teacher', 'Teacher List B');
      const courseA = await createCourse(teacherA._id, 'Course A');
      const courseB = await createCourse(teacherB._id, 'Course B');

      await seedExam({ courseId: courseA._id, title: 'A-Exam-1' });
      await seedExam({ courseId: courseA._id, title: 'A-Exam-2' });
      await seedExam({ courseId: courseB._id, title: 'B-Exam-1' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacherA._id)}`)
        .set('x-user-id', String(teacherA._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(2);
      expect(
        response.body?.data?.exams.every(
          (exam: any) => exam.courseName === 'Course A',
        ),
      ).toBe(true);
    });

    it('should_return_bad_request_for_invalid_teacher_id', async () => {
      // TC_EXAM_012: teacherId sai định dạng phải bị từ chối.
      // Mô tả: Kiểm tra validation teacherId khi list exams.
      // Expected: HTTP 400.
      const response = await request(app.getHttpServer())
        .get('/exams/teacher/not-valid-id')
        .set('x-user-id', 'not-valid-id')
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(400);
    });

    it('should_return_empty_when_teacher_has_no_courses', async () => {
      // TC_EXAM_013: Teacher chưa có course thì danh sách exam rỗng.
      // Mô tả: Kiểm tra nhánh empty result của list exams.
      // Expected: HTTP 200 và pagination.total = 0.
      const teacher = await createUser('teacher', 'Teacher No Course');

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(0);
      expect(response.body?.data?.pagination?.total).toBe(0);
    });

    it('should_filter_by_specific_course_id', async () => {
      // TC_EXAM_014: Lọc theo courseId cụ thể trả đúng tập exam.
      // Mô tả: Kiểm tra filter courseId khi list exams.
      // Expected: HTTP 200 và chỉ còn exam của course đã chọn.
      const teacher = await createUser('teacher', 'Teacher Course Filter');
      const course1 = await createCourse(teacher._id, 'Course One');
      const course2 = await createCourse(teacher._id, 'Course Two');

      await seedExam({ courseId: course1._id, title: 'Exam One' });
      await seedExam({ courseId: course2._id, title: 'Exam Two' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ courseId: String(course1._id) })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(1);
      expect(response.body?.data?.exams?.[0]?.courseName).toBe('Course One');
    });

    it('should_return_all_courses_when_course_id_is_all', async () => {
      // TC_EXAM_015: Khi courseId=all thì trả về exam của mọi course của teacher.
      // Mô tả: Kiểm tra nhánh bỏ lọc course cụ thể.
      // Expected: HTTP 200 và lấy đủ exam của teacher.
      const teacher = await createUser('teacher', 'Teacher Course All');
      const course1 = await createCourse(teacher._id, 'Course 1');
      const course2 = await createCourse(teacher._id, 'Course 2');

      await seedExam({ courseId: course1._id, title: 'Exam 1' });
      await seedExam({ courseId: course2._id, title: 'Exam 2' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ courseId: 'all' })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(2);
    });

    it('should_return_bad_request_for_invalid_course_id_filter', async () => {
      // TC_EXAM_016: courseId filter sai định dạng phải bị từ chối.
      // Mô tả: Kiểm tra validation courseId trong query list.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Invalid Course Filter');

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ courseId: 'invalid-course-id' })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(400);
    });

    it('should_return_empty_when_filter_course_not_owned_by_teacher', async () => {
      // TC_EXAM_017: Lọc course không thuộc teacher thì kết quả phải rỗng.
      // Mô tả: Kiểm tra bảo mật ownership khi query theo courseId.
      // Expected: HTTP 200 và total = 0.
      const teacherA = await createUser('teacher', 'Teacher A');
      const teacherB = await createUser('teacher', 'Teacher B');
      const courseOfB = await createCourse(teacherB._id, 'Foreign Course');

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacherA._id)}`)
        .query({ courseId: String(courseOfB._id) })
        .set('x-user-id', String(teacherA._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(0);
      expect(response.body?.data?.pagination?.total).toBe(0);
    });

    it('should_support_search_status_and_pagination_together', async () => {
      // TC_EXAM_018: Search + status + pagination hoạt động đồng thời.
      // Mô tả: Kiểm tra kết hợp nhiều điều kiện query list exams.
      // Expected: HTTP 200, có phân trang và tổng kết quả đúng.
      const teacher = await createUser('teacher', 'Teacher Search');
      const course = await createCourse(teacher._id, 'Search Course');

      await seedExam({
        courseId: course._id,
        title: 'Algebra Midterm',
        status: 'scheduled',
      });
      await seedExam({
        courseId: course._id,
        title: 'Geometry Midterm',
        status: 'scheduled',
      });
      await seedExam({
        courseId: course._id,
        title: 'History Final',
        status: 'completed',
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ search: 'Midterm', status: 'scheduled', page: 1, limit: 1 })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(1);
      expect(response.body?.data?.pagination?.total).toBe(2);
      expect(response.body?.data?.pagination?.totalPages).toBe(2);
    });

    it('should_filter_exams_by_completed_status_only', async () => {
      // TC_EXAM_034: Filter status=completed chỉ trả exam đã completed.
      // Mô tả: Kiểm tra lọc theo trạng thái khi list exams.
      // Expected: HTTP 200 và mọi exam trả về đều completed.
      const teacher = await createUser('teacher', 'Teacher Status Filter');
      const course = await createCourse(teacher._id, 'Status Filter Course');

      await seedExam({ courseId: course._id, title: 'Exam Completed', status: 'completed' });
      await seedExam({ courseId: course._id, title: 'Exam Scheduled', status: 'scheduled' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ status: 'completed' })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(1);
      expect(response.body?.data?.exams?.[0]?.title).toBe('Exam Completed');
    });

    it('should_search_exams_by_public_id_keyword', async () => {
      // TC_EXAM_035: Search theo publicId phải trả đúng exam khớp.
      // Mô tả: Kiểm tra điều kiện search trên trường publicId.
      // Expected: HTTP 200 và có đúng 1 exam được match.
      const teacher = await createUser('teacher', 'Teacher Search PublicId');
      const course = await createCourse(teacher._id, 'Search PublicId Course');

      const exam1 = await seedExam({ courseId: course._id, title: 'Exam one' });
      await seedExam({ courseId: course._id, title: 'Exam two' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ search: exam1.publicId })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(1);
      expect(response.body?.data?.exams?.[0]?.publicId).toBe(exam1.publicId);
    });

    it('should_return_empty_when_search_keyword_has_no_match', async () => {
      // TC_EXAM_036: Search không match phải trả danh sách rỗng.
      // Mô tả: Kiểm tra nhánh empty result của search exams.
      // Expected: HTTP 200 và exams.length = 0.
      const teacher = await createUser('teacher', 'Teacher Empty Search');
      const course = await createCourse(teacher._id, 'Empty Search Course');

      await seedExam({ courseId: course._id, title: 'Math Exam' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ search: 'NoMatchKeywordXYZ' })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exams).toHaveLength(0);
    });

    it('should_return_bad_request_when_search_keyword_is_single_backslash', async () => {
      // TC_EXAM_041: Search ký tự backslash đơn phải bị từ chối an toàn.
      // Mô tả: Kiểm tra xử lý input regex nguy hiểm ở filter search.
      // Expected: HTTP 400 (không được throw 500 từ Mongo regex).
      const teacher = await createUser('teacher', 'Teacher Regex Slash');
      const course = await createCourse(teacher._id, 'Regex Slash Course');
      await seedExam({ courseId: course._id, title: 'Regex Exam' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ search: '\\' })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_search_keyword_has_invalid_regex_pattern', async () => {
      // TC_EXAM_042: Search pattern regex không hợp lệ phải bị từ chối an toàn.
      // Mô tả: Kiểm tra input '[' không gây lỗi runtime DB.
      // Expected: HTTP 400 (không được 500 internal error).
      const teacher = await createUser('teacher', 'Teacher Regex Bracket');
      const course = await createCourse(teacher._id, 'Regex Bracket Course');
      await seedExam({ courseId: course._id, title: 'Regex Bracket Exam' });

      const response = await request(app.getHttpServer())
        .get(`/exams/teacher/${String(teacher._id)}`)
        .query({ search: '[' })
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(400);
    });
  });

  describe('manage exam() - 17 test case', () => {
    it('should_get_exam_detail_by_id_for_owner_teacher', async () => {
      // TC_EXAM_019: Chủ sở hữu exam xem chi tiết theo id thành công.
      // Mô tả: Kiểm tra endpoint get exam detail theo ObjectId.
      // Expected: HTTP 200 và trả đầy đủ danh sách câu hỏi.
      const teacher = await createUser('teacher', 'Teacher Get');
      const course = await createCourse(teacher._id, 'Get Course');
      const exam = await seedExam({ courseId: course._id, questionCount: 2 });

      const response = await request(app.getHttpServer())
        .get(`/exams/${String(exam._id)}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exam?.id).toBe(String(exam._id));
      expect(response.body?.data?.exam?.questions).toHaveLength(2);
    });

    it('should_get_exam_detail_by_public_id_for_owner_teacher', async () => {
      // TC_EXAM_020: Chủ sở hữu exam xem chi tiết theo publicId thành công.
      // Mô tả: Kiểm tra lookup exam bằng publicId.
      // Expected: HTTP 200 và publicId trả về đúng.
      const teacher = await createUser('teacher', 'Teacher Get PublicId');
      const course = await createCourse(teacher._id, 'Get Public Course');
      const exam = await seedExam({ courseId: course._id, questionCount: 1 });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.data?.exam?.publicId).toBe(exam.publicId);
    });

    it('should_return_not_found_when_getting_non_existing_exam', async () => {
      // TC_EXAM_021: Lấy exam không tồn tại phải trả NotFound.
      // Mô tả: Kiểm tra nhánh lỗi exam không có trong DB.
      // Expected: HTTP 404.
      const teacher = await createUser('teacher', 'Teacher Not Found');

      const response = await request(app.getHttpServer())
        .get('/exams/507f1f77bcf86cd799439013')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(404);
    });

    it('should_return_forbidden_when_getting_exam_of_other_teacher', async () => {
      // TC_EXAM_022: Teacher không được xem exam của teacher khác.
      // Mô tả: Kiểm tra ownership khi get exam detail.
      // Expected: HTTP 403.
      const owner = await createUser('teacher', 'Owner');
      const anotherTeacher = await createUser('teacher', 'Another');
      const course = await createCourse(owner._id, 'Owner Course');
      const exam = await seedExam({ courseId: course._id });

      const response = await request(app.getHttpServer())
        .get(`/exams/${String(exam._id)}`)
        .set('x-user-id', String(anotherTeacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(403);
    });

    it('should_update_exam_successfully_and_replace_questions', async () => {
      // TC_EXAM_023: Cập nhật exam thành công và thay thế toàn bộ questions cũ.
      // Mô tả: Kiểm tra update exam + replace question documents.
      // Expected: HTTP 200, title mới đúng và question cũ bị xóa.
      const teacher = await createUser('teacher', 'Teacher Update');
      const course = await createCourse(teacher._id, 'Update Course');
      const exam = await seedExam({ courseId: course._id, questionCount: 2 });

      const previousQuestionIds = [...exam.questions].map((q: any) => String(q));

      const payload = buildCreateExamPayload(String(course._id), {
        title: 'Updated Midterm',
        durationMinutes: 45,
        rateScore: 70,
        questions: [
          {
            content: 'Updated Question',
            answerQuestion: 1,
            answer: [
              { content: 'Correct' },
              { content: 'Wrong 1' },
              { content: 'Wrong 2' },
              { content: 'Wrong 3' },
            ],
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .put(`/exams/${String(exam._id)}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body?.data?.exam?.title).toBe('Updated Midterm');
      expect(response.body?.data?.exam?.questions).toHaveLength(1);

      const remainedOldQuestions = await questionModel.countDocuments({
        _id: { $in: previousQuestionIds },
      });
      expect(remainedOldQuestions).toBe(0);
    });

    it('should_return_bad_request_when_updating_with_invalid_course_id', async () => {
      // TC_EXAM_024: Update exam với courseId sai định dạng phải bị từ chối.
      // Mô tả: Kiểm tra validation courseId ở update.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Update Invalid Course');
      const course = await createCourse(teacher._id, 'Update Invalid');
      const exam = await seedExam({ courseId: course._id });

      const payload = buildCreateExamPayload('invalid-course-id');

      const response = await request(app.getHttpServer())
        .put(`/exams/${String(exam._id)}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should_return_forbidden_when_updating_exam_to_foreign_course', async () => {
      // TC_EXAM_025: Teacher không được update exam sang course của teacher khác.
      // Mô tả: Kiểm tra rule ownership khi update exam.
      // Expected: HTTP 403.
      const teacherA = await createUser('teacher', 'Teacher A');
      const teacherB = await createUser('teacher', 'Teacher B');
      const courseA = await createCourse(teacherA._id, 'Course A');
      const courseB = await createCourse(teacherB._id, 'Course B');
      const exam = await seedExam({ courseId: courseA._id });

      const payload = buildCreateExamPayload(String(courseB._id), {
        title: 'Illegal update',
      });

      const response = await request(app.getHttpServer())
        .put(`/exams/${String(exam._id)}`)
        .set('x-user-id', String(teacherA._id))
        .set('x-user-role', 'teacher')
        .send(payload);

      expect(response.status).toBe(403);
    });

    it('should_transition_status_to_active_successfully', async () => {
      // TC_EXAM_026: Teacher chuyển trạng thái exam scheduled -> active thành công.
      // Mô tả: Kiểm tra API transition status hợp lệ.
      // Expected: HTTP 200, status đổi thành active và có notification.
      const teacher = await createUser('teacher', 'Teacher Status');
      const course = await createCourse(teacher._id, 'Status Course');
      const exam = await seedExam({
        courseId: course._id,
        status: 'scheduled',
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        endTime: new Date(Date.now() + 50 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .patch(`/exams/${String(exam._id)}/status`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.exam?.status).toBe('active');
      expect(notificationServiceMock.createNotification).toHaveBeenCalledTimes(1);
    });

    it('should_return_bad_request_for_unsupported_status_transition', async () => {
      // TC_EXAM_027: Chuyển trạng thái không hợp lệ phải bị từ chối.
      // Mô tả: Kiểm tra transition scheduled -> completed trực tiếp.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Bad Transition');
      const course = await createCourse(teacher._id, 'Transition Course');
      const exam = await seedExam({ courseId: course._id, status: 'scheduled' });

      const response = await request(app.getHttpServer())
        .patch(`/exams/${String(exam._id)}/status`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
    });

    it('should_delete_exam_and_related_questions_submissions', async () => {
      // TC_EXAM_028: Xóa exam phải xóa cascade questions và submissions liên quan.
      // Mô tả: Kiểm tra luồng delete exam và dọn dữ liệu liên quan.
      // Expected: HTTP 200, exam/questions/submissions đều bị xóa.
      const teacher = await createUser('teacher', 'Teacher Delete');
      const student = await createUser('student', 'Student Delete');
      const course = await createCourse(teacher._id, 'Delete Course');
      const exam = await seedExam({
        courseId: course._id,
        status: 'active',
        startTime: new Date(Date.now() - 30 * 60 * 1000),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        questionCount: 2,
      });

      await submissionModel.create({
        studentId: student._id,
        examId: exam._id,
        score: 80,
        status: 'graded',
        submittedAt: new Date(),
        answers: [
          { questionId: exam.questions[0], answerNumber: 2 },
          { questionId: exam.questions[1], answerNumber: 2 },
        ],
      });

      const response = await request(app.getHttpServer())
        .delete(`/exams/${String(exam._id)}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);

      const remainedExam = await examModel.findById(exam._id);
      const remainedQuestions = await questionModel.countDocuments({
        _id: { $in: exam.questions },
      });
      const remainedSubmissions = await submissionModel.countDocuments({
        examId: exam._id,
      });

      expect(remainedExam).toBeNull();
      expect(remainedQuestions).toBe(0);
      expect(remainedSubmissions).toBe(0);
    });

    it('should_return_forbidden_when_deleting_exam_of_other_teacher', async () => {
      // TC_EXAM_029: Teacher không được xóa exam của teacher khác.
      // Mô tả: Kiểm tra ownership khi delete exam.
      // Expected: HTTP 403 và exam vẫn còn trong DB.
      const owner = await createUser('teacher', 'Owner Teacher');
      const attacker = await createUser('teacher', 'Attacker Teacher');
      const course = await createCourse(owner._id, 'Owner Delete Course');
      const exam = await seedExam({ courseId: course._id });

      const response = await request(app.getHttpServer())
        .delete(`/exams/${String(exam._id)}`)
        .set('x-user-id', String(attacker._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(403);
      expect(await examModel.findById(exam._id)).toBeTruthy();
    });

    it('should_get_exam_results_for_teacher_with_pass_fail_mapping', async () => {
      // TC_EXAM_030: Giáo viên xem kết quả thi có mapping pass/fail đúng.
      // Mô tả: Kiểm tra endpoint exam results và rule rateScore.
      // Expected: HTTP 200, có đủ kết quả và trạng thái pass/fail chính xác.
      const teacher = await createUser('teacher', 'Teacher Results');
      const student1 = await createUser('student', 'Student One');
      const student2 = await createUser('student', 'Student Two');
      const course = await createCourse(teacher._id, 'Results Course');
      const exam = await seedExam({
        courseId: course._id,
        status: 'completed',
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        rateScore: 70,
      });

      await submissionModel.insertMany([
        {
          studentId: student1._id,
          examId: exam._id,
          score: 80,
          status: 'graded',
          submittedAt: new Date(),
          answers: [{ questionId: exam.questions[0], answerNumber: 2 }],
        },
        {
          studentId: student2._id,
          examId: exam._id,
          score: 60,
          status: 'graded',
          submittedAt: new Date(),
          answers: [{ questionId: exam.questions[0], answerNumber: 1 }],
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/exams/${String(exam._id)}/results`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(response.body?.success).toBe(true);
      expect(response.body?.data?.results).toHaveLength(2);

      const statuses = response.body?.data?.results
        ?.map((item: any) => item.status)
        .sort();
      expect(statuses).toEqual(['fail', 'pass']);
    });

    it('should_transition_status_to_completed_successfully', async () => {
      // TC_EXAM_037: Teacher chuyển trạng thái exam active -> completed thành công.
      // Mô tả: Kiểm tra nhánh transition completed hợp lệ.
      // Expected: HTTP 200, status = completed và có notification.
      const teacher = await createUser('teacher', 'Teacher Complete Status');
      const course = await createCourse(teacher._id, 'Complete Status Course');
      const exam = await seedExam({
        courseId: course._id,
        status: 'active',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 10 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .patch(`/exams/${String(exam._id)}/status`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.exam?.status).toBe('completed');
      expect(notificationServiceMock.createNotification).toHaveBeenCalledTimes(1);
    });

    it('should_return_bad_request_when_activating_exam_before_start_time', async () => {
      // TC_EXAM_038: Không được kích hoạt exam trước startTime.
      // Mô tả: Kiểm tra guard thời gian khi chuyển sang active.
      // Expected: HTTP 400 và trạng thái không đổi.
      const teacher = await createUser('teacher', 'Teacher Activate Early');
      const course = await createCourse(teacher._id, 'Activate Early Course');
      const exam = await seedExam({
        courseId: course._id,
        status: 'scheduled',
        startTime: new Date(Date.now() + 30 * 60 * 1000),
        endTime: new Date(Date.now() + 90 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .patch(`/exams/${String(exam._id)}/status`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send({ status: 'active' });

      expect(response.status).toBe(400);
    });

    it('should_delete_exam_successfully_when_identifier_is_public_id', async () => {
      // TC_EXAM_039: Xóa exam bằng publicId vẫn phải thành công.
      // Mô tả: Kiểm tra deleteExam hỗ trợ cả id/publicId.
      // Expected: HTTP 200 và exam bị xóa khỏi DB.
      const teacher = await createUser('teacher', 'Teacher Delete PublicId');
      const course = await createCourse(teacher._id, 'Delete PublicId Course');
      const exam = await seedExam({ courseId: course._id });

      const response = await request(app.getHttpServer())
        .delete(`/exams/${exam.publicId}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(200);
      expect(await examModel.findById(exam._id)).toBeNull();
    });

    it('should_return_forbidden_when_other_teacher_requests_exam_results', async () => {
      // TC_EXAM_040: Teacher khác không được xem kết quả exam không thuộc quyền.
      // Mô tả: Kiểm tra ownership ở endpoint get exam results.
      // Expected: HTTP 403.
      const owner = await createUser('teacher', 'Owner Results');
      const otherTeacher = await createUser('teacher', 'Other Results');
      const course = await createCourse(owner._id, 'Owner Results Course');
      const exam = await seedExam({
        courseId: course._id,
        status: 'completed',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 60 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${String(exam._id)}/results`)
        .set('x-user-id', String(otherTeacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(403);
    });

    it('should_update_exam_successfully_when_identifier_is_public_id', async () => {
      // TC_EXAM_043: Update exam bằng publicId phải thành công tương tự ObjectId.
      // Mô tả: Kiểm tra tính nhất quán identifier giữa find và update.
      // Expected: HTTP 200 và dữ liệu exam được cập nhật.
      const teacher = await createUser('teacher', 'Teacher Update PublicId');
      const course = await createCourse(teacher._id, 'Update PublicId Course');
      const exam = await seedExam({ courseId: course._id, questionCount: 1 });

      const payload = buildCreateExamPayload(String(course._id), {
        title: 'Updated via PublicId',
        durationMinutes: 50,
      });

      const response = await request(app.getHttpServer())
        .put(`/exams/${exam.publicId}`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body?.data?.exam?.title).toBe('Updated via PublicId');
    });
  });
});
