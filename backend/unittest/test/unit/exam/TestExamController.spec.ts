import {
  CanActivate,
  ExecutionContext,
  INestApplication,
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
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { RolesGuard } from 'src/common/guards/roles.guard';
import { Course, CourseSchema } from 'src/database/schemas/course.schema';
import { Exam, ExamSchema } from 'src/database/schemas/exam.schema';
import { Question, QuestionSchema } from 'src/database/schemas/question.schema';
import { Submission, SubmissionSchema } from 'src/database/schemas/submission.schema';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { ExamsController } from 'src/modules/exams/exams.controller';
import { ExamsService } from 'src/modules/exams/exams.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: String(req.headers['x-user-id'] ?? ''),
      role: String(req.headers['x-user-role'] ?? 'teacher'),
    };
    return true;
  }
}

describe('TestExamController - Teacher exam management endpoints', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryReplSet;

  let userModel: Model<any>;
  let courseModel: Model<any>;
  let examModel: Model<any>;
  let questionModel: Model<any>;
  let submissionModel: Model<any>;

  let courseSeq = 0;

  const notificationServiceMock = {
    createNotification: jest.fn().mockResolvedValue(undefined),
  };

  async function createUser(role: string, fullName: string) {
    return userModel.create({
      username: `ctrl_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@mail.com`,
      passwordHash: 'hashed',
      fullName,
      role,
    });
  }

  async function createCourse(teacherId: Types.ObjectId, courseName = 'Test Course') {
    courseSeq++;
    return courseModel.create({
      publicId: `C${String(courseSeq).padStart(6, '0')}`,
      courseName,
      teacherId,
    });
  }

  function buildValidExamBody(courseId: string) {
    return {
      title: 'Controller Exam',
      durationMinutes: 60,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 172800000).toISOString(),
      courseId,
      rateScore: 70,
      questions: [
        {
          content: 'What is 1+1?',
          answerQuestion: 2,
          answer: [
            { content: 'A. 1' },
            { content: 'B. 2' },
            { content: 'C. 3' },
            { content: 'D. 4' },
          ],
        },
      ],
    };
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
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
        { provide: NotificationsService, useValue: notificationServiceMock },
        { provide: APP_GUARD, useClass: FakeJwtAuthGuard },
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => new RolesGuard(reflector),
          inject: [Reflector],
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }));
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    userModel = moduleFixture.get<Model<any>>(getModelToken(User.name));
    courseModel = moduleFixture.get<Model<any>>(getModelToken(Course.name));
    examModel = moduleFixture.get<Model<any>>(getModelToken(Exam.name));
    questionModel = moduleFixture.get<Model<any>>(getModelToken(Question.name));
    submissionModel = moduleFixture.get<Model<any>>(getModelToken(Submission.name));

    // Warmup: wait until replica set primary is elected and transactions work.
    // A simple findOne is insufficient — we must probe with an actual transaction.
    const maxRetries = 20;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const session = await connection.startSession();
        session.startTransaction();
        await userModel.findOne({}).session(session).exec();
        await session.abortTransaction();
        session.endSession();
        break; // transaction succeeded → replica set is ready
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }, 60000);


  beforeEach(async () => {
    await Promise.all([
      submissionModel.deleteMany({}),
      examModel.deleteMany({}),
      questionModel.deleteMany({}),
      courseModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
    // Wait for MongoDB catalog to stabilize after drops (prevents TransientTransactionError)
    await userModel.findOne({}).exec();
    await new Promise((r) => setTimeout(r, 100));
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  // ==================== CREATE EXAM ====================

  it('ME-067 — should_return_201_when_teacher_creates_exam', async () => {
    // ME-067: Teacher tạo bài thi thành công qua HTTP.
    // Mô tả: POST /exams với dữ liệu hợp lệ.
    // Expected: HTTP 201, exam publicId dạng E + 6 số.
    const teacher = await createUser('teacher', 'Teacher Create 1');
    const course = await createCourse(teacher._id);

    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send(buildValidExamBody(String(course._id)));

    expect(res.status).toBe(201);
    expect(res.body?.data?.exam?.publicId).toMatch(/^E\d{6}$/);

    // CheckDB: exam phải tồn tại
    const saved = await examModel.findOne({ publicId: res.body?.data?.exam?.publicId });
    expect(saved).toBeTruthy();
  });

  it('ME-068 — should_return_403_when_student_creates_exam', async () => {
    // ME-068: Student tạo exam → 403.
    // Mô tả: RolesGuard chặn student ở POST /exams.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student Create');

    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student')
      .send(buildValidExamBody(new Types.ObjectId().toHexString()));

    expect(res.status).toBe(403);
  });

  it('ME-069 — should_return_400_when_title_is_empty', async () => {
    // ME-069: Title rỗng → 400.
    // Mô tả: DTO @IsNotEmpty validation.
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher Create 3');
    const course = await createCourse(teacher._id);

    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody(String(course._id)), title: '' });

    expect(res.status).toBe(400);
  });

  it('ME-070 — should_return_400_when_questions_array_is_empty', async () => {
    // ME-070: questions rỗng → 400.
    // Mô tả: DTO @ArrayMinSize(1).
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher Create 4');
    const course = await createCourse(teacher._id);

    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody(String(course._id)), questions: [] });

    expect(res.status).toBe(400);
  });

  // ==================== GET EXAM BY ID ====================

  it('ME-071 — should_return_200_when_teacher_gets_own_exam', async () => {
    // ME-071: Teacher xem chi tiết exam thành công.
    // Mô tả: GET /exams/:id.
    // Expected: HTTP 200 với exam data.
    const teacher = await createUser('teacher', 'Teacher Get 1');
    const course = await createCourse(teacher._id);

    const createRes = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send(buildValidExamBody(String(course._id)));

    const examId = createRes.body?.data?.exam?.id;

    const res = await request(app.getHttpServer())
      .get(`/exams/${examId}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(200);
    expect(res.body?.data?.exam?.title).toBe('Controller Exam');
  });

  it('ME-072 — should_return_403_when_student_gets_exam', async () => {
    // ME-072: Student xem exam → 403.
    // Mô tả: RolesGuard chặn student.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student Get');

    const res = await request(app.getHttpServer())
      .get(`/exams/${new Types.ObjectId().toHexString()}`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student');

    expect(res.status).toBe(403);
  });

  // ==================== LIST EXAMS BY TEACHER ====================

  it('ME-073 — should_return_200_with_pagination_for_list_exams', async () => {
    // ME-073: Lấy danh sách exams có pagination.
    // Mô tả: GET /exams/teacher/:teacherId.
    // Expected: HTTP 200 với pagination metadata.
    const teacher = await createUser('teacher', 'Teacher List 1');
    const course = await createCourse(teacher._id);

    await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send(buildValidExamBody(String(course._id)));

    const res = await request(app.getHttpServer())
      .get(`/exams/teacher/${String(teacher._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(200);
    expect(res.body?.data?.pagination).toBeDefined();
    expect(res.body?.data?.exams?.length).toBeGreaterThanOrEqual(1);
  });

  it('ME-074 — should_filter_exams_by_search_query', async () => {
    // ME-074: Tìm kiếm exam theo keyword.
    // Mô tả: GET /exams/teacher/:id?search=Controller.
    // Expected: HTTP 200, chỉ trả exam match.
    const teacher = await createUser('teacher', 'Teacher List 2');
    const course = await createCourse(teacher._id);

    await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send(buildValidExamBody(String(course._id)));

    const res = await request(app.getHttpServer())
      .get(`/exams/teacher/${String(teacher._id)}?search=Controller`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(200);
    expect(res.body?.data?.exams?.length).toBeGreaterThanOrEqual(1);
  });

  it('ME-075 — should_filter_exams_by_specific_courseId', async () => {
    // ME-075: Filter exams theo courseId cụ thể.
    // Mô tả: GET /exams/teacher/:id?courseId=xxx.
    // Expected: HTTP 200 và chỉ trả exam của course đó.
    const teacher = await createUser('teacher', 'Teacher List 3');
    const course1 = await createCourse(teacher._id, 'Course A');
    const course2 = await createCourse(teacher._id, 'Course B');

    await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody(String(course1._id)), title: 'Exam A' });

    await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody(String(course2._id)), title: 'Exam B' });

    const res = await request(app.getHttpServer())
      .get(`/exams/teacher/${String(teacher._id)}?courseId=${String(course1._id)}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(200);
    expect(res.body?.data?.exams?.every((e: any) => e.courseId === String(course1._id))).toBe(true);
  });

  // ==================== UPDATE EXAM ====================

  it('ME-076 — should_return_200_when_teacher_updates_exam', async () => {
    // ME-076: Teacher cập nhật exam thành công.
    // Mô tả: PUT /exams/:id.
    // Expected: HTTP 200 với title mới.
    const teacher = await createUser('teacher', 'Teacher Update 1');
    const course = await createCourse(teacher._id);

    const createRes = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send(buildValidExamBody(String(course._id)));

    const examId = createRes.body?.data?.exam?.id;

    const res = await request(app.getHttpServer())
      .put(`/exams/${examId}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody(String(course._id)), title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.exam?.title).toBe('Updated Title');
  });

  it('ME-077 — should_return_403_when_student_updates_exam', async () => {
    // ME-077: Student cập nhật exam → 403.
    // Mô tả: RolesGuard chặn student ở PUT.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student Update');

    const res = await request(app.getHttpServer())
      .put(`/exams/${new Types.ObjectId().toHexString()}`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student')
      .send(buildValidExamBody(new Types.ObjectId().toHexString()));

    expect(res.status).toBe(403);
  });

  // ==================== DELETE EXAM ====================

  it('ME-078 — should_return_200_when_teacher_deletes_own_exam', async () => {
    // ME-078: Teacher xóa exam thành công.
    // Mô tả: DELETE /exams/:id cascade xóa questions + submissions.
    // Expected: HTTP 200, exam bị xóa khỏi DB.
    const teacher = await createUser('teacher', 'Teacher Delete 1');
    const course = await createCourse(teacher._id);

    const createRes = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send(buildValidExamBody(String(course._id)));

    const examId = createRes.body?.data?.exam?.id;

    const res = await request(app.getHttpServer())
      .delete(`/exams/${examId}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(200);

    // CheckDB: exam phải bị xóa
    const deleted = await examModel.findById(examId);
    expect(deleted).toBeNull();
  });

  it('ME-079 — should_return_403_when_student_deletes_exam', async () => {
    // ME-079: Student xóa exam → 403.
    // Mô tả: RolesGuard chặn student.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student Delete');

    const res = await request(app.getHttpServer())
      .delete(`/exams/${new Types.ObjectId().toHexString()}`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student');

    expect(res.status).toBe(403);
  });

  // ==================== TRANSITION STATUS ====================

  it('ME-080 — should_return_403_when_student_transitions_exam_status', async () => {
    // ME-080: Student transition status → 403.
    // Mô tả: RolesGuard chặn student ở PATCH.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student Transition');

    const res = await request(app.getHttpServer())
      .patch(`/exams/${new Types.ObjectId().toHexString()}/status`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student')
      .send({ status: 'active' });

    expect(res.status).toBe(403);
  });

  // ==================== GET EXAM RESULTS ====================

  it('ME-081 — should_return_200_when_teacher_gets_exam_results', async () => {
    // ME-081: Teacher lấy kết quả thi thành công.
    // Mô tả: GET /exams/:id/results.
    // Expected: HTTP 200 với exam + results.
    const teacher = await createUser('teacher', 'Teacher Results 1');
    const course = await createCourse(teacher._id);

    const createRes = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send(buildValidExamBody(String(course._id)));

    const examId = createRes.body?.data?.exam?.id;

    const res = await request(app.getHttpServer())
      .get(`/exams/${examId}/results`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(200);
    expect(res.body?.data?.exam?.title).toBe('Controller Exam');
    expect(res.body?.data?.results).toBeDefined();
  });

  it('ME-082 — should_return_403_when_student_gets_exam_results', async () => {
    // ME-082: Student xem exam results → 403.
    // Mô tả: RolesGuard chặn student.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student Results');

    const res = await request(app.getHttpServer())
      .get(`/exams/${new Types.ObjectId().toHexString()}/results`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student');

    expect(res.status).toBe(403);
  });

  // ==================== GET SUBMISSION RESULT FOR TEACHER ====================

  it('ME-083 — should_return_403_when_student_gets_teacher_submission_result', async () => {
    // ME-083: Student xem teacher submission detail → 403.
    // Mô tả: RolesGuard chặn student ở /:examId/submissions/:subId/result.
    // Expected: HTTP 403.
    const student = await createUser('student', 'Student Sub Detail');

    const res = await request(app.getHttpServer())
      .get(`/exams/${new Types.ObjectId().toHexString()}/submissions/${new Types.ObjectId().toHexString()}/result`)
      .set('x-user-id', String(student._id))
      .set('x-user-role', 'student');

    expect(res.status).toBe(403);
  });

  // ==================== DTO VALIDATION ====================

  it('ME-084 — should_return_400_when_rateScore_exceeds_100', async () => {
    // ME-084: rateScore > 100 → 400.
    // Mô tả: DTO @Max(100).
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher Rate');
    const course = await createCourse(teacher._id);

    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody(String(course._id)), rateScore: 150 });

    expect(res.status).toBe(400);
  });

  it('ME-085 — should_return_400_when_durationMinutes_is_negative', async () => {
    // ME-085: durationMinutes < 0 → 400.
    // Mô tả: DTO @IsPositive.
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher Duration');
    const course = await createCourse(teacher._id);

    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody(String(course._id)), durationMinutes: -10 });

    expect(res.status).toBe(400);
  });

  it('ME-086 — should_return_400_when_courseId_is_not_mongo_id', async () => {
    // ME-086: courseId sai format → 400.
    // Mô tả: DTO @IsMongoId.
    // Expected: HTTP 400.
    const teacher = await createUser('teacher', 'Teacher BadCourse');

    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ ...buildValidExamBody('not-a-mongo-id') });

    expect(res.status).toBe(400);
  });

  // ==================== TRANSITION STATUS (TEACHER SUCCESS) ====================

  it('ME-087 — should_return_200_when_teacher_transitions_exam_to_active', async () => {
    // ME-087: Teacher chuyển exam scheduled → active thành công.
    // Mô tả: PATCH /exams/:id/status với status='active'.
    // Expected: HTTP 200 với exam status mới.
    const teacher = await createUser('teacher', 'Teacher Transition 1');
    const course = await createCourse(teacher._id);

    // Tạo exam với startTime trong quá khứ
    const createRes = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({
        ...buildValidExamBody(String(course._id)),
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

    const examId = createRes.body?.data?.exam?.id;
    expect(examId).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/exams/${examId}/status`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.exam?.status).toBe('active');
  });

  it('ME-088 — should_return_200_when_teacher_transitions_exam_to_completed', async () => {
    // ME-088: Teacher chuyển exam active → completed thành công.
    // Mô tả: PATCH /exams/:id/status với status='completed'.
    // Expected: HTTP 200 với exam status completed.
    const teacher = await createUser('teacher', 'Teacher Transition 2');
    const course = await createCourse(teacher._id);

    const createRes = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({
        ...buildValidExamBody(String(course._id)),
        startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
        endTime: new Date(Date.now() - 3600000).toISOString(),
      });

    const examId = createRes.body?.data?.exam?.id;
    expect(examId).toBeDefined();

    // Chuyển sang active trước
    await request(app.getHttpServer())
      .patch(`/exams/${examId}/status`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ status: 'active' });

    // Rồi chuyển sang completed
    const res = await request(app.getHttpServer())
      .patch(`/exams/${examId}/status`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.exam?.status).toBe('completed');
  });

  // ==================== GET SUBMISSION RESULT FOR TEACHER (SUCCESS) ====================

  it('ME-089 — should_return_200_when_teacher_views_submission_detail', async () => {
    // ME-089: Teacher xem chi tiết submission thành công.
    // Mô tả: GET /exams/:examId/submissions/:subId/result.
    // Expected: HTTP 200.
    const teacher = await createUser('teacher', 'Teacher SubDetail');
    const student = await createUser('student', 'Student SubDetail');
    const course = await createCourse(teacher._id);

    // Tạo exam active
    const createRes = await request(app.getHttpServer())
      .post('/exams')
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({
        ...buildValidExamBody(String(course._id)),
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

    const examId = createRes.body?.data?.exam?.id;

    // Activate exam
    await request(app.getHttpServer())
      .patch(`/exams/${examId}/status`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher')
      .send({ status: 'active' });

    // Lấy questions từ DB
    const questions = await questionModel.find({ examId: examId });

    // Tạo submission trực tiếp trong DB
    const submission = await submissionModel.create({
      examId: examId,
      studentId: student._id,
      answers: questions.map((q: any) => ({ questionId: q._id, answerNumber: 2 })),
      score: 100,
      status: 'graded',
      submittedAt: new Date(),
    });

    const res = await request(app.getHttpServer())
      .get(`/exams/${examId}/submissions/${String(submission._id)}/result`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(200);
    expect(res.body?.data?.submissionId).toBe(String(submission._id));
  });

  // ==================== TEACHER DELETE NONEXISTENT ====================

  it('ME-090 — should_return_404_when_deleting_nonexistent_exam', async () => {
    // ME-090: Teacher xóa exam không tồn tại → 404.
    // Mô tả: DELETE /exams/:id với id không tồn tại.
    // Expected: HTTP 404.
    const teacher = await createUser('teacher', 'Teacher Delete404');

    const res = await request(app.getHttpServer())
      .delete(`/exams/${new Types.ObjectId().toHexString()}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(404);
  });

  it('ME-091 — should_return_404_when_getting_nonexistent_exam', async () => {
    // ME-091: Teacher GET exam không tồn tại → 404.
    // Mô tả: GET /exams/:id.
    // Expected: HTTP 404.
    const teacher = await createUser('teacher', 'Teacher Get404');

    const res = await request(app.getHttpServer())
      .get(`/exams/${new Types.ObjectId().toHexString()}`)
      .set('x-user-id', String(teacher._id))
      .set('x-user-role', 'teacher');

    expect(res.status).toBe(404);
  });
});
