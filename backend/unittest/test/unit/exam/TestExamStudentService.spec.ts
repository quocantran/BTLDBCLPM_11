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
import { MongoMemoryServer } from 'mongodb-memory-server';
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

describe('TestExamStudentService - Student takes exam online (Controller -> Service -> DB)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongoServer: MongoMemoryServer;

  let userModel: Model<any>;
  let courseModel: Model<any>;
  let examModel: Model<any>;
  let questionModel: Model<any>;
  let submissionModel: Model<any>;

  let userSeq = 0;
  let courseSeq = 0;
  let examSeq = 0;

  const nextCoursePublicId = () => `C${String(++courseSeq).padStart(6, '0')}`;
  const nextExamPublicId = () => `E${String(++examSeq).padStart(6, '0')}`;

  const notificationServiceMock = {
    createNotification: jest.fn().mockResolvedValue(undefined),
  };

  async function createUser(
    role: 'student' | 'teacher' | 'admin',
    fullName: string,
  ) {
    userSeq += 1;
    return userModel.create({
      username: `${role}_student_test_${userSeq}`,
      email: `${role}_student_test_${userSeq}@mail.com`,
      passwordHash: 'hashed-password-for-test',
      fullName,
      role,
    });
  }

  async function createCourse(teacherId: Types.ObjectId, courseName = 'Exam Course') {
    return courseModel.create({
      publicId: nextCoursePublicId(),
      courseName,
      teacherId,
    });
  }

  async function createExamWithQuestions(params: {
    teacherId: Types.ObjectId;
    courseId: Types.ObjectId;
    title?: string;
    status?: 'scheduled' | 'active' | 'completed';
    startTime?: Date;
    endTime?: Date;
    rateScore?: number;
    questionCount?: number;
    answerQuestion?: number;
  }) {
    const {
      teacherId,
      courseId,
      title = `Student Exam ${examSeq + 1}`,
      status = 'active',
      startTime = new Date(Date.now() - 30 * 60 * 1000),
      endTime = new Date(Date.now() + 30 * 60 * 1000),
      rateScore = 60,
      questionCount = 1,
      answerQuestion = 2,
    } = params;

    const questions = await questionModel.insertMany(
      Array.from({ length: questionCount }).map((_, index) => ({
        content: `Question ${index + 1}`,
        answerQuestion,
        answer: [
          { content: `Q${index + 1}A`, isCorrect: answerQuestion === 1 },
          { content: `Q${index + 1}B`, isCorrect: answerQuestion === 2 },
          { content: `Q${index + 1}C`, isCorrect: answerQuestion === 3 },
          { content: `Q${index + 1}D`, isCorrect: answerQuestion === 4 },
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
      questions: questions.map((q) => q._id),
      rateScore,
    });
  }

  async function createSubmission(params: {
    studentId: Types.ObjectId;
    examId: Types.ObjectId;
    score?: number;
    status?: 'graded' | 'submitted' | 'in_progress';
    submittedAt?: Date;
    answers: Array<{ questionId: Types.ObjectId; answerNumber: number }>;
  }) {
    return submissionModel.create({
      studentId: params.studentId,
      examId: params.examId,
      score: params.score ?? 0,
      status: params.status ?? 'graded',
      submittedAt: params.submittedAt,
      answers: params.answers,
    });
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

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
  });

  beforeEach(async () => {
    await Promise.all([
      submissionModel.deleteMany({}),
      examModel.deleteMany({}),
      questionModel.deleteMany({}),
      courseModel.deleteMany({}),
      userModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
    await mongoServer.stop();
  });

  describe('joinExam() - 10 test case', () => {
    it('should_join_exam_successfully_when_exam_is_active_and_not_submitted', async () => {
      // TC_EXAM_ST_001: Student join exam thành công khi exam đang active và chưa nộp bài.
      // Mô tả: Kiểm tra luồng joinExam chuẩn với exam hợp lệ.
      // Expected: HTTP 200 và trả về thông tin exam/card.
      const teacher = await createUser('teacher', 'Teacher Join 1');
      const student = await createUser('student', 'Student Join 1');
      const course = await createCourse(teacher._id, 'Course Join 1');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: exam.publicId });

      expect(response.status).toBe(200);
      expect(response.body?.publicId).toBe(exam.publicId);
      expect(response.body?.course?.courseName).toBe('Course Join 1');
    });

    it('should_return_bad_request_when_join_exam_public_id_format_is_invalid', async () => {
      // TC_EXAM_ST_002: publicId sai định dạng phải bị từ chối.
      // Mô tả: Kiểm tra validation JoinExamDto cho exam code.
      // Expected: HTTP 400.
      const student = await createUser('student', 'Student Join 2');
      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: 'INVALID_CODE' });

      expect(response.status).toBe(400);
    });

    it('should_return_not_found_when_join_exam_with_non_existing_public_id', async () => {
      // TC_EXAM_ST_003: Join exam với publicId không tồn tại phải trả not found.
      // Mô tả: Kiểm tra nhánh exam không tồn tại ở joinExam.
      // Expected: HTTP 404.
      const student = await createUser('student', 'Student Join 3');
      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: 'E999999' });

      expect(response.status).toBe(404);
    });

    it('should_return_bad_request_when_join_exam_status_is_scheduled', async () => {
      // TC_EXAM_ST_004: Exam scheduled chưa active thì không được join.
      // Mô tả: Kiểm tra điều kiện exam.status phải là active.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Join 4');
      const student = await createUser('student', 'Student Join 4');
      const course = await createCourse(teacher._id, 'Course Join 4');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'scheduled',
      });

      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: exam.publicId });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_join_exam_status_is_completed', async () => {
      // TC_EXAM_ST_005: Exam completed thì không được join.
      // Mô tả: Kiểm tra chặn join khi exam đã completed.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Join 5');
      const student = await createUser('student', 'Student Join 5');
      const course = await createCourse(teacher._id, 'Course Join 5');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'completed',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 60 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: exam.publicId });

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_join_exam_is_active_but_end_time_passed', async () => {
      // TC_EXAM_ST_006: Exam active nhưng đã quá endTime thì join bị từ chối.
      // Mô tả: Kiểm tra guard thời gian ở joinExam.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Join 6');
      const student = await createUser('student', 'Student Join 6');
      const course = await createCourse(teacher._id, 'Course Join 6');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'active',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 10 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: exam.publicId });

      expect(response.status).toBe(400);
    });

    it('should_return_forbidden_when_join_exam_after_student_already_submitted', async () => {
      // TC_EXAM_ST_007: Student đã nộp bài thì không được join lại.
      // Mô tả: Kiểm tra chặn join theo existing submission.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Join 7');
      const student = await createUser('student', 'Student Join 7');
      const course = await createCourse(teacher._id, 'Course Join 7');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });
      const firstQuestionId = exam.questions[0] as Types.ObjectId;
      await createSubmission({
        studentId: student._id,
        examId: exam._id,
        score: 80,
        status: 'graded',
        submittedAt: new Date(),
        answers: [{ questionId: firstQuestionId, answerNumber: 2 }],
      });

      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: exam.publicId });

      expect(response.status).toBe(403);
    });

    it('should_return_forbidden_when_teacher_calls_join_exam_endpoint', async () => {
      // TC_EXAM_ST_008: Teacher không được gọi endpoint join exam của student.
      // Mô tả: Kiểm tra RolesGuard cho route /exams/join.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Join 8');
      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send({ publicId: 'E123456' });

      expect(response.status).toBe(403);
    });

    it('should_return_course_fallback_fields_when_course_document_is_missing', async () => {
      // TC_EXAM_ST_009: Join exam khi course bị xóa vẫn trả fallback thông tin course.
      // Mô tả: Kiểm tra constructor JoinExamResponseDto xử lý course null.
      // Expected: HTTP 200 và course publicId/courseName = N/A.
      const teacher = await createUser('teacher', 'Teacher Join 9');
      const student = await createUser('student', 'Student Join 9');
      const course = await createCourse(teacher._id, 'Course Join 9');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });
      await courseModel.deleteOne({ _id: course._id });

      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: exam.publicId });

      expect(response.status).toBe(200);
      expect(response.body?.course?.publicId).toBe('N/A');
      expect(response.body?.course?.courseName).toBe('N/A');
    });

    it('should_return_active_status_in_join_exam_response_for_active_exam', async () => {
      // TC_EXAM_ST_010: Join exam thành công phải trả trạng thái active đúng hiện tại.
      // Mô tả: Kiểm tra mapping status ở JoinExamResponseDto.
      // Expected: HTTP 200 và status = active.
      const teacher = await createUser('teacher', 'Teacher Join 10');
      const student = await createUser('student', 'Student Join 10');
      const course = await createCourse(teacher._id, 'Course Join 10');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'active',
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        endTime: new Date(Date.now() + 20 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .post('/exams/join')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ publicId: exam.publicId });

      expect(response.status).toBe(200);
      expect(response.body?.status).toBe('active');
    });
  });

  describe('getExamForTaking() - 10 test case', () => {
    it('should_get_exam_for_taking_successfully_with_sanitized_questions', async () => {
      // TC_EXAM_ST_011: Student lấy đề thi thành công với dữ liệu đã sanitize.
      // Mô tả: Kiểm tra endpoint /:publicId/take trả question không lộ đáp án đúng.
      // Expected: HTTP 200 và choices không có field isCorrect.
      const teacher = await createUser('teacher', 'Teacher Take 1');
      const student = await createUser('student', 'Student Take 1');
      const course = await createCourse(teacher._id, 'Course Take 1');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        questionCount: 2,
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body?.questions).toHaveLength(2);
      expect(response.body?.questions?.[0]?.choices?.[0]?.isCorrect).toBeUndefined();
    });

    it('should_return_not_found_when_take_exam_public_id_does_not_exist', async () => {
      // TC_EXAM_ST_012: Lấy đề thi với publicId không tồn tại phải trả not found.
      // Mô tả: Kiểm tra nhánh exam không có trong DB.
      // Expected: HTTP 404.
      const student = await createUser('student', 'Student Take 2');
      const response = await request(app.getHttpServer())
        .get('/exams/E999998/take')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(404);
    });

    it('should_return_bad_request_when_take_exam_status_is_not_active', async () => {
      // TC_EXAM_ST_013: Exam chưa active thì không được vào làm bài.
      // Mô tả: Kiểm tra điều kiện status active bắt buộc ở getExamForTaking.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Take 3');
      const student = await createUser('student', 'Student Take 3');
      const course = await createCourse(teacher._id, 'Course Take 3');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'scheduled',
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_take_exam_before_start_time', async () => {
      // TC_EXAM_ST_014: Exam active nhưng chưa tới startTime thì bị chặn.
      // Mô tả: Kiểm tra guard thời gian bắt đầu ở getExamForTaking.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Take 4');
      const student = await createUser('student', 'Student Take 4');
      const course = await createCourse(teacher._id, 'Course Take 4');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'active',
        startTime: new Date(Date.now() + 20 * 60 * 1000),
        endTime: new Date(Date.now() + 80 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_take_exam_after_end_time', async () => {
      // TC_EXAM_ST_015: Exam active nhưng đã qua endTime thì không được làm bài.
      // Mô tả: Kiểm tra guard thời gian kết thúc ở getExamForTaking.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Take 5');
      const student = await createUser('student', 'Student Take 5');
      const course = await createCourse(teacher._id, 'Course Take 5');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'active',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 10 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(400);
    });

    it('should_return_forbidden_when_take_exam_after_already_submitted', async () => {
      // TC_EXAM_ST_016: Student đã nộp bài thì không được lấy đề lại.
      // Mô tả: Kiểm tra chặn theo existing submission ở getExamForTaking.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Take 6');
      const student = await createUser('student', 'Student Take 6');
      const course = await createCourse(teacher._id, 'Course Take 6');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });
      const firstQuestionId = exam.questions[0] as Types.ObjectId;
      await createSubmission({
        studentId: student._id,
        examId: exam._id,
        score: 70,
        status: 'graded',
        submittedAt: new Date(),
        answers: [{ questionId: firstQuestionId, answerNumber: 2 }],
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(403);
    });

    it('should_return_forbidden_when_teacher_calls_take_exam_endpoint', async () => {
      // TC_EXAM_ST_017: Teacher không được gọi endpoint lấy đề thi của student.
      // Mô tả: Kiểm tra RolesGuard tại route /:publicId/take.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Take 7');
      const response = await request(app.getHttpServer())
        .get('/exams/E123456/take')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(403);
    });

    it('should_return_all_questions_with_four_choices_each_when_taking_exam', async () => {
      // TC_EXAM_ST_018: Dữ liệu đề thi trả về đủ số câu và mỗi câu có 4 lựa chọn.
      // Mô tả: Kiểm tra integrity dữ liệu question/choices trong take exam.
      // Expected: HTTP 200, mọi câu hỏi có đúng 4 choices.
      const teacher = await createUser('teacher', 'Teacher Take 8');
      const student = await createUser('student', 'Student Take 8');
      const course = await createCourse(teacher._id, 'Course Take 8');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        questionCount: 3,
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body?.questions).toHaveLength(3);
      expect(response.body?.questions.every((q: any) => q.choices?.length === 4)).toBe(true);
    });

    it('should_return_question_id_as_string_in_take_exam_response', async () => {
      // TC_EXAM_ST_019: questionId trả về ở take exam phải là string.
      // Mô tả: Kiểm tra kiểu dữ liệu questionId cho frontend submit.
      // Expected: HTTP 200 và questionId là string hợp lệ.
      const teacher = await createUser('teacher', 'Teacher Take 9');
      const student = await createUser('student', 'Student Take 9');
      const course = await createCourse(teacher._id, 'Course Take 9');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(typeof response.body?.questions?.[0]?.questionId).toBe('string');
      expect(response.body?.questions?.[0]?.questionId?.length).toBeGreaterThan(0);
    });

    it('should_return_exam_metadata_in_take_exam_response', async () => {
      // TC_EXAM_ST_020: Take exam phải trả đủ metadata đề thi cho UI làm bài.
      // Mô tả: Kiểm tra các trường publicId/title/durationMinutes/endTime.
      // Expected: HTTP 200 và metadata có giá trị đúng.
      const teacher = await createUser('teacher', 'Teacher Take 10');
      const student = await createUser('student', 'Student Take 10');
      const course = await createCourse(teacher._id, 'Course Take 10');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        title: 'Metadata Exam',
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.publicId}/take`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body?.publicId).toBe(exam.publicId);
      expect(response.body?.title).toBe('Metadata Exam');
      expect(response.body?.durationMinutes).toBe(60);
      expect(response.body?.endTime).toBeDefined();
    });
  });

  describe('submitExam() - 15 test case', () => {
    it('should_submit_exam_successfully_with_all_correct_answers', async () => {
      // TC_EXAM_ST_021: Nộp bài thành công với tất cả đáp án đúng.
      // Mô tả: Kiểm tra chấm điểm 100% và kết quả Passed.
      // Expected: HTTP 201, score = 100 và result = Passed.
      const teacher = await createUser('teacher', 'Teacher Submit 1');
      const student = await createUser('student', 'Student Submit 1');
      const course = await createCourse(teacher._id, 'Course Submit 1');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        rateScore: 60,
        questionCount: 2,
        answerQuestion: 2,
      });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [
            { questionId: String(exam.questions[0]), answerNumber: 2 },
            { questionId: String(exam.questions[1]), answerNumber: 2 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body?.score).toBe(100);
      expect(response.body?.result).toBe('Passed');
    });

    it('should_submit_exam_successfully_with_all_wrong_answers', async () => {
      // TC_EXAM_ST_022: Nộp bài với đáp án sai toàn bộ.
      // Mô tả: Kiểm tra chấm điểm 0% và kết quả Failed.
      // Expected: HTTP 201, score = 0 và result = Failed.
      const teacher = await createUser('teacher', 'Teacher Submit 2');
      const student = await createUser('student', 'Student Submit 2');
      const course = await createCourse(teacher._id, 'Course Submit 2');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        rateScore: 50,
        questionCount: 2,
        answerQuestion: 2,
      });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [
            { questionId: String(exam.questions[0]), answerNumber: 1 },
            { questionId: String(exam.questions[1]), answerNumber: 1 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body?.score).toBe(0);
      expect(response.body?.result).toBe('Failed');
    });

    it('should_calculate_partial_score_correctly_when_only_half_answers_are_correct', async () => {
      // TC_EXAM_ST_023: Chấm điểm đúng khi đúng một phần câu hỏi.
      // Mô tả: Kiểm tra công thức score = correct/total * 100.
      // Expected: HTTP 201 và score = 50 với 1/2 câu đúng.
      const teacher = await createUser('teacher', 'Teacher Submit 3');
      const student = await createUser('student', 'Student Submit 3');
      const course = await createCourse(teacher._id, 'Course Submit 3');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        questionCount: 2,
        answerQuestion: 2,
      });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [
            { questionId: String(exam.questions[0]), answerNumber: 2 },
            { questionId: String(exam.questions[1]), answerNumber: 1 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body?.score).toBe(50);
      expect(response.body?.correctAnswers).toBe(1);
      expect(response.body?.totalQuestions).toBe(2);
    });

    it('should_return_not_found_when_submitting_non_existing_exam', async () => {
      // TC_EXAM_ST_024: Nộp bài cho exam không tồn tại phải trả not found.
      // Mô tả: Kiểm tra nhánh tìm exam thất bại ở submitExam.
      // Expected: HTTP 404.
      const student = await createUser('student', 'Student Submit 4');
      const response = await request(app.getHttpServer())
        .post('/exams/E999997/submit')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ answers: [] });

      expect(response.status).toBe(404);
    });

    it('should_return_bad_request_when_submitting_after_exam_end_time', async () => {
      // TC_EXAM_ST_025: Không cho nộp bài khi đã hết thời gian thi.
      // Mô tả: Kiểm tra guard endTime ở submitExam.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Submit 5');
      const student = await createUser('student', 'Student Submit 5');
      const course = await createCourse(teacher._id, 'Course Submit 5');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        status: 'active',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 5 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [{ questionId: String(exam.questions[0]), answerNumber: 2 }],
        });

      expect(response.status).toBe(400);
    });

    it('should_return_forbidden_when_submitting_exam_twice', async () => {
      // TC_EXAM_ST_026: Student không được nộp bài lần thứ hai.
      // Mô tả: Kiểm tra duplicate submission theo studentId + examId.
      // Expected: HTTP 403 ở lần nộp thứ hai.
      const teacher = await createUser('teacher', 'Teacher Submit 6');
      const student = await createUser('student', 'Student Submit 6');
      const course = await createCourse(teacher._id, 'Course Submit 6');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const firstSubmit = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ answers: [{ questionId: String(exam.questions[0]), answerNumber: 2 }] });
      expect(firstSubmit.status).toBe(201);

      const secondSubmit = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ answers: [{ questionId: String(exam.questions[0]), answerNumber: 2 }] });

      expect(secondSubmit.status).toBe(403);
    });

    it('should_return_forbidden_when_teacher_calls_submit_exam_endpoint', async () => {
      // TC_EXAM_ST_027: Teacher không được gọi endpoint nộp bài của student.
      // Mô tả: Kiểm tra RolesGuard tại route /:publicId/submit.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Submit 7');
      const response = await request(app.getHttpServer())
        .post('/exams/E123456/submit')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher')
        .send({ answers: [] });

      expect(response.status).toBe(403);
    });

    it('should_return_bad_request_when_answers_field_is_missing', async () => {
      // TC_EXAM_ST_028: Thiếu answers trong payload submit phải bị từ chối.
      // Mô tả: Kiểm tra validation SubmitExamDto.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Submit 8');
      const student = await createUser('student', 'Student Submit 8');
      const course = await createCourse(teacher._id, 'Course Submit 8');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should_return_bad_request_when_answer_number_out_of_valid_range', async () => {
      // TC_EXAM_ST_029: answerNumber ngoài khoảng 1..4 phải bị từ chối.
      // Mô tả: Kiểm tra validation SubmitExamAnswerDto.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Submit 9');
      const student = await createUser('student', 'Student Submit 9');
      const course = await createCourse(teacher._id, 'Course Submit 9');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [{ questionId: String(exam.questions[0]), answerNumber: 5 }],
        });

      expect(response.status).toBe(400);
    });

    it('should_return_internal_server_error_when_question_id_format_is_invalid', async () => {
      // TC_EXAM_ST_030: questionId sai format gây lỗi server hiện tại khi submit.
      // Mô tả: Kiểm tra hành vi hiện tại của new ObjectId(questionId) trong submitExam.
      // Expected: HTTP 500 (defect exposure cho input validate chưa đủ).
      const teacher = await createUser('teacher', 'Teacher Submit 10');
      const student = await createUser('student', 'Student Submit 10');
      const course = await createCourse(teacher._id, 'Course Submit 10');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [{ questionId: 'not-object-id', answerNumber: 2 }],
        });

      expect(response.status).toBe(500);
    });

    it('should_submit_exam_with_empty_answers_and_return_zero_score', async () => {
      // TC_EXAM_ST_031: Payload answers rỗng vẫn nộp được theo logic hiện tại.
      // Mô tả: Kiểm tra chấm điểm khi student bỏ trống toàn bộ câu hỏi.
      // Expected: HTTP 201, score = 0 và result = Failed.
      const teacher = await createUser('teacher', 'Teacher Submit 11');
      const student = await createUser('student', 'Student Submit 11');
      const course = await createCourse(teacher._id, 'Course Submit 11');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, questionCount: 2 });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ answers: [] });

      expect(response.status).toBe(201);
      expect(response.body?.score).toBe(0);
      expect(response.body?.result).toBe('Failed');
    });

    it('should_ignore_extra_answer_not_in_exam_question_list_when_grading', async () => {
      // TC_EXAM_ST_032: Câu trả lời dư ngoài đề không ảnh hưởng điểm chấm.
      // Mô tả: Kiểm tra grading chỉ dựa trên câu hỏi thuộc exam.
      // Expected: HTTP 201 và score chỉ tính theo câu trong đề.
      const teacher = await createUser('teacher', 'Teacher Submit 12');
      const student = await createUser('student', 'Student Submit 12');
      const course = await createCourse(teacher._id, 'Course Submit 12');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, questionCount: 1 });
      const externalQuestionId = new Types.ObjectId().toHexString();

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [
            { questionId: String(exam.questions[0]), answerNumber: 2 },
            { questionId: externalQuestionId, answerNumber: 1 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body?.correctAnswers).toBe(1);
      expect(response.body?.totalQuestions).toBe(1);
      expect(response.body?.score).toBe(100);
    });

    it('should_use_last_answer_when_student_submits_duplicate_answers_for_same_question', async () => {
      // TC_EXAM_ST_033: Submit trùng questionId sẽ lấy đáp án cuối cùng để chấm điểm.
      // Mô tả: Kiểm tra cơ chế Map(questionId -> answerNumber) trong submitExam.
      // Expected: HTTP 201 và điểm phản ánh đáp án cuối.
      const teacher = await createUser('teacher', 'Teacher Submit 13');
      const student = await createUser('student', 'Student Submit 13');
      const course = await createCourse(teacher._id, 'Course Submit 13');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, questionCount: 1, answerQuestion: 2 });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [
            { questionId: String(exam.questions[0]), answerNumber: 1 },
            { questionId: String(exam.questions[0]), answerNumber: 2 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body?.score).toBe(100);
    });

    it('should_mark_result_as_passed_when_score_equals_rate_score_threshold', async () => {
      // TC_EXAM_ST_034: Điểm bằng đúng ngưỡng rateScore vẫn phải đậu.
      // Mô tả: Kiểm tra điều kiện Passed với phép so sánh >= rateScore.
      // Expected: HTTP 201 và result = Passed.
      const teacher = await createUser('teacher', 'Teacher Submit 14');
      const student = await createUser('student', 'Student Submit 14');
      const course = await createCourse(teacher._id, 'Course Submit 14');
      const exam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        questionCount: 2,
        answerQuestion: 2,
        rateScore: 50,
      });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({
          answers: [
            { questionId: String(exam.questions[0]), answerNumber: 2 },
            { questionId: String(exam.questions[1]), answerNumber: 1 },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body?.score).toBe(50);
      expect(response.body?.result).toBe('Passed');
    });

    it('should_persist_submission_with_graded_status_and_return_submission_id', async () => {
      // TC_EXAM_ST_035: Nộp bài thành công phải lưu submission trạng thái graded.
      // Mô tả: Kiểm tra side-effect DB và submissionId trả về.
      // Expected: HTTP 201, submission tồn tại và status = graded.
      const teacher = await createUser('teacher', 'Teacher Submit 15');
      const student = await createUser('student', 'Student Submit 15');
      const course = await createCourse(teacher._id, 'Course Submit 15');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.publicId}/submit`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student')
        .send({ answers: [{ questionId: String(exam.questions[0]), answerNumber: 2 }] });

      expect(response.status).toBe(201);
      expect(response.body?.submissionId).toBeDefined();

      // CHECKDB
      const savedSubmission = await submissionModel.findById(response.body?.submissionId).lean();
      expect(savedSubmission).toBeTruthy();
      expect((savedSubmission as any).status).toBe('graded');
      expect((savedSubmission as any).examId.toString()).toBe(String(exam._id));
    });
  });

  describe('getMyCompletedExams() - 7 test case', () => {
    it('should_return_empty_completed_exams_when_student_has_no_graded_submissions', async () => {
      // TC_EXAM_ST_036: Student chưa có bài graded thì danh sách completed rỗng.
      // Mô tả: Kiểm tra getMyCompletedExams khi không có dữ liệu phù hợp.
      // Expected: HTTP 200 và mảng trả về rỗng.
      const student = await createUser('student', 'Student Completed 1');
      const response = await request(app.getHttpServer())
        .get('/exams/my-completed')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should_return_only_graded_submissions_in_completed_exam_list', async () => {
      // TC_EXAM_ST_037: Chỉ submission status graded mới xuất hiện ở tab completed.
      // Mô tả: Kiểm tra filter status = graded trong service.
      // Expected: HTTP 200 và chỉ còn 1 bản ghi graded.
      const teacher = await createUser('teacher', 'Teacher Completed 2');
      const student = await createUser('student', 'Student Completed 2');
      const course = await createCourse(teacher._id, 'Course Completed 2');
      const gradedExam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        rateScore: 60,
      });
      const submittedExam = await createExamWithQuestions({
        teacherId: teacher._id,
        courseId: course._id,
        rateScore: 60,
      });
      const gradedQuestion = gradedExam.questions[0] as Types.ObjectId;
      const submittedQuestion = submittedExam.questions[0] as Types.ObjectId;

      await createSubmission({
        studentId: student._id,
        examId: gradedExam._id,
        score: 75,
        status: 'graded',
        submittedAt: new Date(),
        answers: [{ questionId: gradedQuestion, answerNumber: 2 }],
      });
      await createSubmission({
        studentId: student._id,
        examId: submittedExam._id,
        score: 10,
        status: 'submitted',
        submittedAt: new Date(),
        answers: [{ questionId: submittedQuestion, answerNumber: 1 }],
      });

      const response = await request(app.getHttpServer())
        .get('/exams/my-completed')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should_return_passed_and_failed_result_labels_correctly_in_completed_list', async () => {
      // TC_EXAM_ST_038: Kết quả completed phải map đúng nhãn Passed/Failed.
      // Mô tả: Kiểm tra logic so sánh score với rateScore theo từng exam.
      // Expected: HTTP 200 và có đủ cả Passed lẫn Failed.
      const teacher = await createUser('teacher', 'Teacher Completed 3');
      const student = await createUser('student', 'Student Completed 3');
      const course = await createCourse(teacher._id, 'Course Completed 3');
      const examPass = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, rateScore: 70 });
      const examFail = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, rateScore: 70 });

      await createSubmission({
        studentId: student._id,
        examId: examPass._id,
        score: 80,
        status: 'graded',
        submittedAt: new Date(Date.now() - 2000),
        answers: [{ questionId: examPass.questions[0], answerNumber: 2 }],
      });
      await createSubmission({
        studentId: student._id,
        examId: examFail._id,
        score: 60,
        status: 'graded',
        submittedAt: new Date(Date.now() - 1000),
        answers: [{ questionId: examFail.questions[0], answerNumber: 1 }],
      });

      const response = await request(app.getHttpServer())
        .get('/exams/my-completed')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      const results = response.body.map((item: any) => item.result).sort();
      expect(results).toEqual(['Failed', 'Passed']);
    });

    it('should_sort_completed_exams_by_submitted_at_descending', async () => {
      // TC_EXAM_ST_039: Danh sách completed phải được sắp xếp submittedAt giảm dần.
      // Mô tả: Kiểm tra sort mặc định trong getMyCompletedExams.
      // Expected: HTTP 200 và bản ghi mới nhất đứng trước.
      const teacher = await createUser('teacher', 'Teacher Completed 4');
      const student = await createUser('student', 'Student Completed 4');
      const course = await createCourse(teacher._id, 'Course Completed 4');
      const examOld = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, title: 'Old Exam' });
      const examNew = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, title: 'New Exam' });

      await createSubmission({
        studentId: student._id,
        examId: examOld._id,
        score: 80,
        status: 'graded',
        submittedAt: new Date(Date.now() - 10 * 60 * 1000),
        answers: [{ questionId: examOld.questions[0], answerNumber: 2 }],
      });
      await createSubmission({
        studentId: student._id,
        examId: examNew._id,
        score: 90,
        status: 'graded',
        submittedAt: new Date(Date.now() - 1 * 60 * 1000),
        answers: [{ questionId: examNew.questions[0], answerNumber: 2 }],
      });

      const response = await request(app.getHttpServer())
        .get('/exams/my-completed')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body?.[0]?.examTitle).toBe('New Exam');
      expect(response.body?.[1]?.examTitle).toBe('Old Exam');
    });

    it('should_fallback_to_created_at_when_submitted_at_is_missing', async () => {
      // TC_EXAM_ST_040: Nếu thiếu submittedAt thì dùng createdAt cho kết quả completed.
      // Mô tả: Kiểm tra fallback submittedAt ?? createdAt trong mapping DTO.
      // Expected: HTTP 200 và submittedAt vẫn có giá trị.
      const teacher = await createUser('teacher', 'Teacher Completed 5');
      const student = await createUser('student', 'Student Completed 5');
      const course = await createCourse(teacher._id, 'Course Completed 5');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      await createSubmission({
        studentId: student._id,
        examId: exam._id,
        score: 75,
        status: 'graded',
        answers: [{ questionId: exam.questions[0], answerNumber: 2 }],
      });

      const response = await request(app.getHttpServer())
        .get('/exams/my-completed')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body?.[0]?.submittedAt).toBeDefined();
    });

    it('should_return_bad_request_when_student_id_header_is_invalid_for_completed_list', async () => {
      // TC_EXAM_ST_041: student id sai định dạng phải bị từ chối ở completed list.
      // Mô tả: Kiểm tra new ObjectId(user.id) fail trong getMyCompletedExams.
      // Expected: HTTP 400.
      const response = await request(app.getHttpServer())
        .get('/exams/my-completed')
        .set('x-user-id', 'invalid-student-id')
        .set('x-user-role', 'student');

      expect(response.status).toBe(400);
    });

    it('should_return_forbidden_when_teacher_calls_my_completed_endpoint', async () => {
      // TC_EXAM_ST_042: Teacher không được gọi endpoint completed exams của student.
      // Mô tả: Kiểm tra RolesGuard ở route /exams/my-completed.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Completed 7');
      const response = await request(app.getHttpServer())
        .get('/exams/my-completed')
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(403);
    });
  });

  describe('getSubmissionResult() - 8 test case', () => {
    it('should_get_submission_result_successfully_for_owner_student', async () => {
      // TC_EXAM_ST_043: Student xem chi tiết submission của chính mình thành công.
      // Mô tả: Kiểm tra endpoint submissions/:id/result cho owner.
      // Expected: HTTP 200 và trả đủ exam/metrics/questions.
      const teacher = await createUser('teacher', 'Teacher Detail 1');
      const student = await createUser('student', 'Student Detail 1');
      const course = await createCourse(teacher._id, 'Course Detail 1');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, questionCount: 2, rateScore: 50 });

      const submission = await createSubmission({
        studentId: student._id,
        examId: exam._id,
        score: 50,
        status: 'graded',
        submittedAt: new Date(),
        answers: [
          { questionId: exam.questions[0], answerNumber: 2 },
          { questionId: exam.questions[1], answerNumber: 1 },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/submissions/${String(submission._id)}/result`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body?.data?.submissionId).toBe(String(submission._id));
      expect(response.body?.data?.exam?.examPublicId).toBe(exam.publicId);
      expect(response.body?.data?.metrics?.totalQuestions).toBe(2);
      expect(response.body?.data?.questions).toHaveLength(2);
    });

    it('should_return_bad_request_when_submission_id_format_is_invalid', async () => {
      // TC_EXAM_ST_044: submissionId sai định dạng phải bị từ chối.
      // Mô tả: Kiểm tra validation ObjectId ở getSubmissionResult.
      // Expected: HTTP 400.
      const student = await createUser('student', 'Student Detail 2');
      const response = await request(app.getHttpServer())
        .get('/exams/submissions/not-an-object-id/result')
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(400);
    });

    it('should_return_not_found_when_submission_does_not_exist', async () => {
      // TC_EXAM_ST_045: Submission không tồn tại phải trả not found.
      // Mô tả: Kiểm tra nhánh load submission thất bại.
      // Expected: HTTP 404.
      const student = await createUser('student', 'Student Detail 3');
      const response = await request(app.getHttpServer())
        .get(`/exams/submissions/${new Types.ObjectId().toHexString()}/result`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(404);
    });

    it('should_return_forbidden_when_student_requests_submission_of_another_student', async () => {
      // TC_EXAM_ST_046: Student không được xem kết quả submission của người khác.
      // Mô tả: Kiểm tra ownership check trên studentId.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Detail 4');
      const ownerStudent = await createUser('student', 'Owner Detail 4');
      const anotherStudent = await createUser('student', 'Another Detail 4');
      const course = await createCourse(teacher._id, 'Course Detail 4');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id });

      const submission = await createSubmission({
        studentId: ownerStudent._id,
        examId: exam._id,
        score: 70,
        status: 'graded',
        submittedAt: new Date(),
        answers: [{ questionId: exam.questions[0], answerNumber: 2 }],
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/submissions/${String(submission._id)}/result`)
        .set('x-user-id', String(anotherStudent._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(403);
    });

    it('should_return_forbidden_when_teacher_calls_student_submission_result_endpoint', async () => {
      // TC_EXAM_ST_047: Teacher không được gọi endpoint result dành cho student.
      // Mô tả: Kiểm tra RolesGuard ở /exams/submissions/:id/result.
      // Expected: HTTP 403.
      const teacher = await createUser('teacher', 'Teacher Detail 5');
      const response = await request(app.getHttpServer())
        .get(`/exams/submissions/${new Types.ObjectId().toHexString()}/result`)
        .set('x-user-id', String(teacher._id))
        .set('x-user-role', 'teacher');

      expect(response.status).toBe(403);
    });

    it('should_set_student_answer_to_null_for_unanswered_questions_in_submission_detail', async () => {
      // TC_EXAM_ST_048: Câu hỏi không trả lời phải có studentAnswer = null.
      // Mô tả: Kiểm tra mapping answerMap trong mapSubmissionDetail.
      // Expected: HTTP 200 và tồn tại question có studentAnswer null.
      const teacher = await createUser('teacher', 'Teacher Detail 6');
      const student = await createUser('student', 'Student Detail 6');
      const course = await createCourse(teacher._id, 'Course Detail 6');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, questionCount: 2 });

      const submission = await createSubmission({
        studentId: student._id,
        examId: exam._id,
        score: 50,
        status: 'graded',
        submittedAt: new Date(),
        answers: [{ questionId: exam.questions[0], answerNumber: 2 }],
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/submissions/${String(submission._id)}/result`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      const hasNullAnswer = response.body?.data?.questions?.some(
        (q: any) => q.studentAnswer === null,
      );
      expect(hasNullAnswer).toBe(true);
    });

    it('should_compute_passed_metric_correctly_in_submission_result_detail', async () => {
      // TC_EXAM_ST_049: Metrics.passed phải đúng theo score và rateScore.
      // Mô tả: Kiểm tra cờ passed ở exam result detail.
      // Expected: HTTP 200 và passed = false khi score < rateScore.
      const teacher = await createUser('teacher', 'Teacher Detail 7');
      const student = await createUser('student', 'Student Detail 7');
      const course = await createCourse(teacher._id, 'Course Detail 7');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, rateScore: 80 });

      const submission = await createSubmission({
        studentId: student._id,
        examId: exam._id,
        score: 70,
        status: 'graded',
        submittedAt: new Date(),
        answers: [{ questionId: exam.questions[0], answerNumber: 2 }],
      });

      const response = await request(app.getHttpServer())
        .get(`/exams/submissions/${String(submission._id)}/result`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(200);
      expect(response.body?.data?.metrics?.passed).toBe(false);
    });

    it('should_return_bad_request_when_exam_data_is_incomplete_in_submission_result', async () => {
      // TC_EXAM_ST_050: Thiếu dữ liệu exam/course phải trả lỗi dữ liệu không đầy đủ.
      // Mô tả: Kiểm tra guard Exam data is incomplete ở mapSubmissionDetail.
      // Expected: HTTP 400.
      const teacher = await createUser('teacher', 'Teacher Detail 8');
      const student = await createUser('student', 'Student Detail 8');
      const course = await createCourse(teacher._id, 'Course Detail 8');
      const exam = await createExamWithQuestions({ teacherId: teacher._id, courseId: course._id, questionCount: 1 });

      const submission = await createSubmission({
        studentId: student._id,
        examId: exam._id,
        score: 100,
        status: 'graded',
        submittedAt: new Date(),
        answers: [{ questionId: exam.questions[0], answerNumber: 2 }],
      });

      await courseModel.deleteOne({ _id: course._id });

      const response = await request(app.getHttpServer())
        .get(`/exams/submissions/${String(submission._id)}/result`)
        .set('x-user-id', String(student._id))
        .set('x-user-role', 'student');

      expect(response.status).toBe(400);
    });
  });
});
