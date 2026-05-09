import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { ExamsService } from 'src/modules/exams/exams.service';
import { Exam } from 'src/database/schemas/exam.schema';
import { Question } from 'src/database/schemas/question.schema';
import { Course } from 'src/database/schemas/course.schema';
import { Submission } from 'src/database/schemas/submission.schema';
import { User } from 'src/database/schemas/user.schema';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

jest.mock('src/common/utils/public-id.util', () => ({
  generatePrefixedPublicId: jest.fn().mockResolvedValue('E123456'),
}));

jest.mock('src/common/utils/exam.util', () => ({
  computeExamStatus: jest.fn().mockReturnValue('scheduled'),
}));

describe('TestExamService - ExamsService business logic', () => {
  let service: ExamsService;
  let examModel: any;
  let questionModel: any;
  let courseModel: any;
  let submissionModel: any;
  let userModel: any;
  let notificationServiceMock: any;

  const TEACHER_ID = '507f1f77bcf86cd799439011';
  const TEACHER_B_ID = '607f1f77bcf86cd799439099';
  const COURSE_ID = '507f1f77bcf86cd799439022';
  const EXAM_ID = '507f1f77bcf86cd799439033';
  const STUDENT_ID = '507f1f77bcf86cd799439044';

  const futureStart = new Date(Date.now() + 86400000).toISOString();
  const futureEnd = new Date(Date.now() + 172800000).toISOString();

  const mockTeacher = { id: TEACHER_ID, role: 'teacher' };
  const mockStudent = { id: STUDENT_ID, role: 'student' };

  const createMockCourse = (overrides: any = {}) => ({
    _id: new Types.ObjectId(COURSE_ID),
    courseName: 'Test Course',
    teacherId: new Types.ObjectId(TEACHER_ID),
    ...overrides,
  });

  const createValidExamDto = (overrides: any = {}) => ({
    title: 'Midterm Exam',
    durationMinutes: 60,
    startTime: futureStart,
    endTime: futureEnd,
    courseId: COURSE_ID,
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
    ...overrides,
  });

  const createMockExam = (overrides: any = {}) => ({
    _id: new Types.ObjectId(EXAM_ID),
    publicId: 'E123456',
    title: 'Midterm Exam',
    durationMinutes: 60,
    startTime: new Date(futureStart),
    endTime: new Date(futureEnd),
    status: 'scheduled',
    courseId: new Types.ObjectId(COURSE_ID),
    questions: [new Types.ObjectId()],
    rateScore: 70,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // Mock session
  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const mockExamModel: any = jest.fn();
    mockExamModel.findById = jest.fn();
    mockExamModel.findOne = jest.fn();
    mockExamModel.find = jest.fn();
    mockExamModel.create = jest.fn();
    mockExamModel.deleteOne = jest.fn();
    mockExamModel.countDocuments = jest.fn();
    mockExamModel.exists = jest.fn();
    mockExamModel.findByIdAndUpdate = jest.fn();
    mockExamModel.findOneAndUpdate = jest.fn();
    mockExamModel.hydrate = jest.fn((obj) => obj);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: getModelToken(Exam.name), useValue: mockExamModel },
        {
          provide: getModelToken(Question.name),
          useValue: {
            insertMany: jest.fn().mockResolvedValue([
              { _id: new Types.ObjectId(), content: 'Q1', answerQuestion: 2, answer: [
                { content: 'A', isCorrect: false },
                { content: 'B', isCorrect: true },
                { content: 'C', isCorrect: false },
                { content: 'D', isCorrect: false },
              ]},
            ]),
            find: jest.fn(),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
          },
        },
        {
          provide: getModelToken(Course.name),
          useValue: { findById: jest.fn(), find: jest.fn() },
        },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn().mockResolvedValue(mockSession) },
        },
        {
          provide: getModelToken(Submission.name),
          useValue: {
            findOne: jest.fn(),
            findById: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: { findById: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
    examModel = module.get(getModelToken(Exam.name));
    questionModel = module.get(getModelToken(Question.name));
    courseModel = module.get(getModelToken(Course.name));
    submissionModel = module.get(getModelToken(Submission.name));
    userModel = module.get(getModelToken(User.name));
    notificationServiceMock = module.get(NotificationsService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ==================== CREATE EXAM ====================

  it('ME-001 — should_create_exam_successfully_with_valid_data', async () => {
    // ME-001: Teacher tạo bài thi thành công.
    // Mô tả: createExam với dữ liệu hợp lệ, course thuộc teacher.
    // Expected: Trả ExamResponseDto, publicId dạng E + 6 số, questions lưu DB.
    courseModel.findById.mockResolvedValue(createMockCourse());
    examModel.create.mockResolvedValue([createMockExam()]);

    const result = await service.createExam(createValidExamDto(), mockTeacher as any);

    expect(result.publicId).toMatch(/^E\d{6}$/);
    expect(result.title).toBe('Midterm Exam');
    expect(questionModel.insertMany).toHaveBeenCalled();
    expect(mockSession.commitTransaction).toHaveBeenCalled();
  });

  it('ME-002 — should_throw_forbidden_when_teacher_context_missing', async () => {
    // ME-002: Thiếu teacher context → 403.
    // Mô tả: createExam với user.id = undefined.
    // Expected: ForbiddenException('Missing teacher context').
    await expect(
      service.createExam(createValidExamDto(), {} as any),
    ).rejects.toThrow('Missing teacher context');
  });

  it('ME-003 — should_throw_not_found_when_course_not_exist', async () => {
    // ME-003: courseId không tồn tại → 404.
    // Mô tả: createExam với courseId không tồn tại trong DB.
    // Expected: NotFoundException('Course not found').
    courseModel.findById.mockResolvedValue(null);

    await expect(
      service.createExam(createValidExamDto(), mockTeacher as any),
    ).rejects.toThrow('Course not found');
  });

  it('ME-004 — should_throw_forbidden_when_course_belongs_to_other_teacher', async () => {
    // ME-004: Course thuộc teacher khác → 403.
    // Mô tả: Teacher A tạo exam cho course của Teacher B.
    // Expected: ForbiddenException('You can only create exams for your courses').
    courseModel.findById.mockResolvedValue(
      createMockCourse({ teacherId: new Types.ObjectId(TEACHER_B_ID) }),
    );

    await expect(
      service.createExam(createValidExamDto(), mockTeacher as any),
    ).rejects.toThrow('You can only create exams for your courses');
  });

  it('ME-005 — should_throw_bad_request_when_endTime_before_startTime', async () => {
    // ME-005: endTime trước startTime → 400.
    // Mô tả: Validate ensureValidDates.
    // Expected: BadRequestException('endTime must be after startTime').
    courseModel.findById.mockResolvedValue(createMockCourse());

    await expect(
      service.createExam(
        createValidExamDto({ startTime: futureEnd, endTime: futureStart }),
        mockTeacher as any,
      ),
    ).rejects.toThrow('endTime must be after startTime');
  });

  it('ME-006 — should_throw_bad_request_when_duration_exceeds_window', async () => {
    // ME-006: durationMinutes > thời gian window → 400.
    // Mô tả: Exam 60 phút nhưng window chỉ 30 phút.
    // Expected: BadRequestException.
    courseModel.findById.mockResolvedValue(createMockCourse());
    const shortEnd = new Date(Date.now() + 86400000 + 1800000).toISOString(); // +30min

    await expect(
      service.createExam(
        createValidExamDto({ endTime: shortEnd, durationMinutes: 60 }),
        mockTeacher as any,
      ),
    ).rejects.toThrow('durationMinutes cannot exceed the available time window');
  });

  it('ME-007 — should_throw_bad_request_when_duration_is_zero_or_negative', async () => {
    // ME-007: durationMinutes = 0 → 400.
    // Mô tả: Validate ensureDurationWithinWindow.
    // Expected: BadRequestException('durationMinutes must be greater than 0').
    courseModel.findById.mockResolvedValue(createMockCourse());

    await expect(
      service.createExam(
        createValidExamDto({ durationMinutes: 0 }),
        mockTeacher as any,
      ),
    ).rejects.toThrow('durationMinutes must be greater than 0');
  });

  it('ME-008 — should_rollback_transaction_on_error', async () => {
    // ME-008: Lỗi trong transaction → rollback.
    // Mô tả: examModel.create throw error, session phải abortTransaction.
    // Expected: abortTransaction được gọi.
    courseModel.findById.mockResolvedValue(createMockCourse());
    examModel.create.mockRejectedValue(new Error('DB write error'));

    await expect(
      service.createExam(createValidExamDto(), mockTeacher as any),
    ).rejects.toThrow('DB write error');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it('ME-009 — should_reject_title_over_200_chars', async () => {
    // ME-009: Title > 200 ký tự → phải bị reject.
    // Mô tả: Theo nghiệp vụ title phải có giới hạn độ dài hợp lý.
    // Expected: Throw BadRequestException vì title quá dài.
    courseModel.findById.mockResolvedValue(createMockCourse());
    examModel.create.mockResolvedValue([createMockExam({ title: 'A'.repeat(300) })]);

    await expect(
      service.createExam(
        createValidExamDto({ title: 'A'.repeat(300) }),
        mockTeacher as any,
      ),
    ).rejects.toThrow();
  });

  // ==================== FIND EXAM BY ID ====================

  it('ME-010 — should_find_exam_by_id_successfully', async () => {
    // ME-010: Teacher xem chi tiết bài thi của mình.
    // Mô tả: findExamById với examId hợp lệ, course thuộc teacher.
    // Expected: Trả ExamResponseDto đầy đủ.
    const mockExam = createMockExam();
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockExam) });
    courseModel.findById.mockResolvedValue(createMockCourse());
    questionModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.findExamById(EXAM_ID, mockTeacher as any);

    expect(result.id).toBe(EXAM_ID);
    expect(result.title).toBe('Midterm Exam');
  });

  it('ME-011 — should_throw_not_found_when_exam_not_exist', async () => {
    // ME-011: Exam không tồn tại → 404.
    // Mô tả: findExamById với examId không tồn tại.
    // Expected: NotFoundException('Exam not found').
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.findExamById('nonexistent', mockTeacher as any),
    ).rejects.toThrow('Exam not found');
  });

  it('ME-012 — should_throw_forbidden_when_viewing_other_teachers_exam', async () => {
    // ME-012: Teacher xem exam của teacher khác → 403.
    // Mô tả: Course thuộc Teacher B nhưng Teacher A truy cập.
    // Expected: ForbiddenException.
    const mockExam = createMockExam();
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockExam) });
    courseModel.findById.mockResolvedValue(
      createMockCourse({ teacherId: new Types.ObjectId(TEACHER_B_ID) }),
    );

    await expect(
      service.findExamById(EXAM_ID, mockTeacher as any),
    ).rejects.toThrow('You can only view exams for your courses');
  });

  // ==================== DELETE EXAM ====================

  it('ME-013 — should_delete_exam_and_cascade_questions_submissions', async () => {
    // ME-013: Xóa exam → xóa questions + submissions.
    // Mô tả: deleteExam cascade đúng cả questions và submissions.
    // Expected: questionModel.deleteMany + submissionModel.deleteMany + examModel.deleteOne.
    const mockExam = createMockExam();
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockExam) });
    courseModel.findById.mockResolvedValue(createMockCourse());
    examModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await service.deleteExam(EXAM_ID, mockTeacher as any);

    expect(questionModel.deleteMany).toHaveBeenCalled();
    expect(submissionModel.deleteMany).toHaveBeenCalled();
    expect(examModel.deleteOne).toHaveBeenCalled();
  });

  it('ME-014 — should_throw_not_found_when_deleting_nonexistent_exam', async () => {
    // ME-014: Xóa exam không tồn tại → 404.
    // Mô tả: deleteExam với examId không tồn tại.
    // Expected: NotFoundException('Exam not found').
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.deleteExam('nonexistent', mockTeacher as any),
    ).rejects.toThrow('Exam not found');
  });

  it('ME-015 — should_throw_forbidden_when_deleting_other_teachers_exam', async () => {
    // ME-015: Teacher xóa exam của teacher khác → 403.
    // Mô tả: Course thuộc Teacher B, Teacher A cố xóa.
    // Expected: ForbiddenException('You can only delete exams you own').
    const mockExam = createMockExam();
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockExam) });
    courseModel.findById.mockResolvedValue(
      createMockCourse({ teacherId: new Types.ObjectId(TEACHER_B_ID) }),
    );

    await expect(
      service.deleteExam(EXAM_ID, mockTeacher as any),
    ).rejects.toThrow('You can only delete exams you own');
  });

  // ==================== JOIN EXAM (STUDENT) ====================

  it('ME-016 — should_throw_not_found_when_joining_invalid_code', async () => {
    // ME-016: Student join exam với mã không tồn tại → 404.
    // Mô tả: joinExam với publicId không tồn tại.
    // Expected: NotFoundException.
    examModel.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    await expect(
      service.joinExam({ publicId: 'INVALID' }, mockStudent as any),
    ).rejects.toThrow('Exam with this code not found.');
  });

  it('ME-017 — should_throw_bad_request_when_exam_not_active', async () => {
    // ME-017: Student join exam đã scheduled → 400.
    // Mô tả: Exam status = scheduled, chưa active.
    // Expected: BadRequestException('This exam is not active.').
    const mockExam = createMockExam({ status: 'scheduled' });
    examModel.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockExam) });

    await expect(
      service.joinExam({ publicId: 'E123456' }, mockStudent as any),
    ).rejects.toThrow('This exam is not active.');
  });

  it('ME-018 — should_throw_forbidden_when_already_submitted', async () => {
    // ME-018: Student đã nộp bài rồi → 403.
    // Mô tả: existingSubmission tồn tại.
    // Expected: ForbiddenException('You have already submitted this exam.').
    const mockExam = createMockExam({
      status: 'active',
      endTime: new Date(Date.now() + 86400000),
    });
    examModel.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockExam) });
    submissionModel.findOne.mockResolvedValue({ _id: 'existing-submission' });

    await expect(
      service.joinExam({ publicId: 'E123456' }, mockStudent as any),
    ).rejects.toThrow('You have already submitted this exam.');
  });

  it('ME-019 — should_allow_any_student_to_join_without_enrollment_check', async () => {
    // ME-019: Student chưa enroll vào course vẫn join được exam.
    // Mô tả: Enrollment check bị comment out trong code (L807-817).
    // Expected: Nên throw ForbiddenException nhưng hiện tại PASS → BUG.
    const mockExam = {
      ...createMockExam({ status: 'active', endTime: new Date(Date.now() + 86400000) }),
      courseId: createMockCourse(),
    };
    examModel.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockExam) });
    submissionModel.findOne.mockResolvedValue(null);

    // BUG: student chưa enroll vẫn join được vì enrollment check bị comment out
    await expect(
      service.joinExam({ publicId: 'E123456' }, mockStudent as any),
    ).rejects.toThrow();
  });

  // ==================== LIST EXAMS ====================

  it('ME-020 — should_list_exams_with_pagination', async () => {
    // ME-020: Lấy danh sách bài thi có pagination.
    // Mô tả: listExamSummaries trả đúng pagination metadata.
    // Expected: Trả exams + pagination object.
    const mockCourses = [createMockCourse()];
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockCourses) }),
    });
    examModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(25) });
    examModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([createMockExam()]),
          }),
        }),
      }),
    });

    const result = await service.listExamSummaries(TEACHER_ID, {
      page: 1,
      limit: 10,
    } as any);

    expect(result.pagination.total).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNextPage).toBe(true);
  });

  it('ME-021 — should_throw_bad_request_when_teacher_id_invalid', async () => {
    // ME-021: teacherId sai format → 400.
    // Mô tả: listExamSummaries với teacherId không hợp lệ.
    // Expected: BadRequestException('Invalid teacher ID').
    await expect(
      service.listExamSummaries('invalid-id'),
    ).rejects.toThrow('Invalid teacher ID');
  });

  it('ME-022 — should_reject_backslash_search_with_bad_request', async () => {
    // ME-022: Tìm exam bằng '\' → phải trả BadRequestException (400).
    // Mô tả: Input chứa ký tự regex đặc biệt cần được escape hoặc reject.
    // Expected: BadRequestException.
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([createMockCourse()]),
      }),
    });
    examModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('Invalid regular expression')),
    });

    await expect(
      service.listExamSummaries(TEACHER_ID, { search: '\\' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('ME-023 — should_return_empty_when_teacher_has_no_courses', async () => {
    // ME-023: Teacher chưa có khóa học → trả rỗng.
    // Mô tả: Teacher không có course nào → trả exams = [].
    // Expected: Trả { exams: [], pagination: { total: 0 } }.
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    });

    const result = await service.listExamSummaries(TEACHER_ID, {} as any);

    expect(result.exams).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  // ==================== ADDITIONAL RISK TESTS ====================

  it('ME-024 — should_throw_bad_request_when_invalid_date_strings', async () => {
    // ME-024: startTime/endTime không phải date → 400.
    // Mô tả: ensureValidDates với invalid date.
    // Expected: BadRequestException('Invalid start or end time').
    courseModel.findById.mockResolvedValue(createMockCourse());

    await expect(
      service.createExam(
        createValidExamDto({ startTime: 'not-a-date', endTime: 'also-not' }),
        mockTeacher as any,
      ),
    ).rejects.toThrow('Invalid start or end time');
  });

  it('ME-025 — should_throw_bad_request_when_courseId_invalid_format', async () => {
    // ME-025: courseId sai format → 400.
    // Mô tả: createExam với courseId không phải MongoId.
    // Expected: BadRequestException('Invalid courseId').
    await expect(
      service.createExam(
        createValidExamDto({ courseId: 'invalid' }),
        mockTeacher as any,
      ),
    ).rejects.toThrow('Invalid courseId');
  });

  // ==================== UPDATE EXAM ====================

  it('ME-026 — should_update_exam_successfully', async () => {
    // ME-026: Teacher cập nhật bài thi thành công.
    // Mô tả: updateExam với dữ liệu hợp lệ, ownership đúng.
    // Expected: Trả ExamResponseDto mới, questions mới.
    const existingExam = createMockExam();
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingExam) });
    courseModel.findById.mockResolvedValue(createMockCourse());
    questionModel.deleteMany.mockResolvedValue({ deletedCount: 1 });
    const updatedExam = createMockExam({ title: 'Updated Exam' });
    examModel.findByIdAndUpdate.mockResolvedValue(updatedExam);

    const result = await service.updateExam(
      EXAM_ID,
      createValidExamDto({ title: 'Updated Exam' }) as any,
      mockTeacher as any,
    );

    expect(result.title).toBe('Updated Exam');
    expect(mockSession.commitTransaction).toHaveBeenCalled();
  });

  it('ME-027 — should_throw_not_found_when_updating_nonexistent_exam', async () => {
    // ME-027: Cập nhật exam không tồn tại → 404.
    // Mô tả: updateExam với examId không tồn tại.
    // Expected: NotFoundException('Exam not found').
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.updateExam(EXAM_ID, createValidExamDto() as any, mockTeacher as any),
    ).rejects.toThrow('Exam not found');
  });

  it('ME-028 — should_throw_forbidden_when_updating_other_teachers_exam', async () => {
    // ME-028: Teacher A cập nhật exam course Teacher B → 403.
    // Mô tả: Ownership check trong updateExam.
    // Expected: ForbiddenException.
    const existingExam = createMockExam();
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingExam) });
    courseModel.findById.mockResolvedValue(
      createMockCourse({ teacherId: new Types.ObjectId(TEACHER_B_ID) }),
    );

    await expect(
      service.updateExam(EXAM_ID, createValidExamDto() as any, mockTeacher as any),
    ).rejects.toThrow('You can only update exams for your courses');
  });

  it('ME-029 — should_throw_forbidden_when_update_missing_teacher_context', async () => {
    // ME-029: updateExam thiếu teacher context → 403.
    // Mô tả: user.id undefined.
    // Expected: ForbiddenException('Missing teacher context').
    await expect(
      service.updateExam(EXAM_ID, createValidExamDto() as any, {} as any),
    ).rejects.toThrow('Missing teacher context');
  });

  it('ME-030 — should_rollback_on_update_transaction_error', async () => {
    // ME-030: Lỗi DB khi update → rollback transaction.
    // Mô tả: questionModel.deleteMany throw error.
    // Expected: session.abortTransaction được gọi.
    const existingExam = createMockExam();
    examModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingExam) });
    courseModel.findById.mockResolvedValue(createMockCourse());
    questionModel.deleteMany.mockRejectedValue(new Error('Delete failed'));

    await expect(
      service.updateExam(EXAM_ID, createValidExamDto() as any, mockTeacher as any),
    ).rejects.toThrow('Delete failed');

    expect(mockSession.abortTransaction).toHaveBeenCalled();
  });

  // ==================== TRANSITION EXAM STATUS ====================

  it('ME-031 — should_throw_not_found_when_transitioning_nonexistent_exam', async () => {
    // ME-031: Transition exam không tồn tại → 404.
    // Mô tả: transitionExamStatus với exam null.
    // Expected: NotFoundException('Exam not found').
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    await expect(
      service.transitionExamStatus(EXAM_ID, 'active' as any, mockTeacher as any),
    ).rejects.toThrow('Exam not found');
  });

  it('ME-032 — should_throw_forbidden_when_teacher_transitions_other_teachers_exam', async () => {
    // ME-032: Teacher transition exam của teacher khác → 403.
    // Mô tả: Ownership check trong transitionExamStatus.
    // Expected: ForbiddenException.
    const mockExam = {
      ...createMockExam({ status: 'scheduled' }),
      courseId: createMockCourse({ teacherId: new Types.ObjectId(TEACHER_B_ID) }),
      questions: [],
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    await expect(
      service.transitionExamStatus(EXAM_ID, 'active' as any, mockTeacher as any),
    ).rejects.toThrow('You can only transition exams for your courses');
  });

  it('ME-033 — should_throw_bad_request_for_invalid_status_transition', async () => {
    // ME-033: Transition completed → active → 400.
    // Mô tả: Kiểm tra invalid transition path.
    // Expected: BadRequestException('Unsupported status transition').
    const mockExam = {
      ...createMockExam({ status: 'completed' }),
      courseId: createMockCourse(),
      questions: [],
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    await expect(
      service.transitionExamStatus(EXAM_ID, 'active' as any, mockTeacher as any),
    ).rejects.toThrow('Unsupported status transition');
  });

  it('ME-034 — should_return_same_exam_when_status_already_matches', async () => {
    // ME-034: Transition same status → trả exam hiện tại.
    // Mô tả: status === nextStatus → no-op.
    // Expected: Trả exam không thay đổi.
    const mockExam = {
      ...createMockExam({ status: 'active' }),
      courseId: createMockCourse(),
      questions: [],
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    const result = await service.transitionExamStatus(EXAM_ID, 'active' as any, mockTeacher as any);
    expect(result.status).toBe('active');
  });

  it('ME-035 — should_throw_when_activating_before_start_time', async () => {
    // ME-035: Activate exam trước startTime → 400.
    // Mô tả: Kiểm tra guard time cho activation.
    // Expected: BadRequestException('Cannot activate before start time').
    const farFutureStart = new Date(Date.now() + 86400000 * 7);
    const farFutureEnd = new Date(Date.now() + 86400000 * 14);
    const mockExam = {
      ...createMockExam({ status: 'scheduled', startTime: farFutureStart, endTime: farFutureEnd }),
      courseId: createMockCourse(),
      questions: [],
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    await expect(
      service.transitionExamStatus(EXAM_ID, 'active' as any, mockTeacher as any),
    ).rejects.toThrow('Cannot activate before start time');
  });

  it('ME-036 — should_throw_when_completing_before_end_time', async () => {
    // ME-036: Complete exam trước endTime → 400.
    // Mô tả: Kiểm tra guard time cho completion.
    // Expected: BadRequestException('Cannot complete before end time').
    const pastStart = new Date(Date.now() - 86400000);
    const futEnd = new Date(Date.now() + 86400000);
    const mockExam = {
      ...createMockExam({ status: 'active', startTime: pastStart, endTime: futEnd }),
      courseId: createMockCourse(),
      questions: [],
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    await expect(
      service.transitionExamStatus(EXAM_ID, 'completed' as any, mockTeacher as any),
    ).rejects.toThrow('Cannot complete before end time');
  });

  // ==================== GET EXAM RESULTS ====================

  it('ME-037 — should_get_exam_results_successfully', async () => {
    // ME-037: Teacher lấy kết quả thi thành công.
    // Mô tả: getExamResults trả danh sách submissions.
    // Expected: Trả ExamResultsResponseDto.
    const mockExam = createMockExam({ rateScore: 50 });
    examModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockExam) });
    courseModel.findById.mockResolvedValue(createMockCourse());
    const mockStudentDoc = {
      _id: new Types.ObjectId(STUDENT_ID),
      fullName: 'Student A',
      username: 'student_a',
    };
    submissionModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              studentId: mockStudentDoc,
              score: 80,
              submittedAt: new Date(),
            },
          ]),
        }),
      }),
    });

    const result = await service.getExamResults(EXAM_ID, mockTeacher as any);
    expect(result.exam.title).toBe('Midterm Exam');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('pass');
  });

  it('ME-038 — should_throw_bad_request_for_invalid_exam_id_in_results', async () => {
    // ME-038: examId sai format → 400.
    // Mô tả: getExamResults với invalid ObjectId.
    // Expected: BadRequestException('Invalid exam ID').
    await expect(
      service.getExamResults('invalid-id', mockTeacher as any),
    ).rejects.toThrow('Invalid exam ID');
  });

  it('ME-039 — should_throw_forbidden_when_viewing_results_of_other_teachers_exam', async () => {
    // ME-039: Teacher xem results exam của teacher khác → 403.
    // Mô tả: Ownership check trong getExamResults.
    // Expected: ForbiddenException.
    const mockExam = createMockExam();
    examModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockExam) });
    courseModel.findById.mockResolvedValue(
      createMockCourse({ teacherId: new Types.ObjectId(TEACHER_B_ID) }),
    );

    await expect(
      service.getExamResults(EXAM_ID, mockTeacher as any),
    ).rejects.toThrow('You can only view results for exams in your courses');
  });

  it('ME-040 — should_skip_student_without_username_in_results', async () => {
    // ME-040: Student bị xóa (username null) → skip trong kết quả.
    // Mô tả: Kiểm tra branch !student || !student.username.
    // Expected: Kết quả results.length = 0.
    const mockExam = createMockExam();
    examModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockExam) });
    courseModel.findById.mockResolvedValue(createMockCourse());
    submissionModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              studentId: new Types.ObjectId(), // Not populated, ObjectId
              score: 80,
            },
          ]),
        }),
      }),
    });
    userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const result = await service.getExamResults(EXAM_ID, mockTeacher as any);
    expect(result.results).toHaveLength(0);
  });

  // ==================== GET MY COMPLETED EXAMS ====================

  it('ME-041 — should_throw_bad_request_for_invalid_user_id_in_completed', async () => {
    // ME-041: user.id sai format → 400.
    // Mô tả: getMyCompletedExams với invalid ObjectId.
    // Expected: BadRequestException('Invalid user ID format.').
    await expect(
      service.getMyCompletedExams({ id: 'invalid-id' } as any),
    ).rejects.toThrow('Invalid user ID format.');
  });

  // ==================== GET EXAM FOR TAKING ====================

  it('ME-042 — should_throw_not_found_when_taking_nonexistent_exam', async () => {
    // ME-042: getExamForTaking với publicId không tồn tại → 404.
    // Mô tả: Exam not found.
    // Expected: NotFoundException('Exam not found.').
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    await expect(
      service.getExamForTaking('E999999', mockStudent as any),
    ).rejects.toThrow('Exam not found.');
  });

  it('ME-043 — should_throw_bad_request_when_taking_inactive_exam', async () => {
    // ME-043: Exam status scheduled → 400.
    // Mô tả: getExamForTaking requires active status.
    // Expected: BadRequestException('This exam is not active.').
    const mockExam = { ...createMockExam({ status: 'scheduled' }), questions: [] };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    await expect(
      service.getExamForTaking('E123456', mockStudent as any),
    ).rejects.toThrow('This exam is not active.');
  });

  // ==================== SUBMIT EXAM ====================

  it('ME-044 — should_throw_not_found_when_submitting_nonexistent_exam', async () => {
    // ME-044: submitExam với publicId không tồn tại → 404.
    // Mô tả: Exam not found.
    // Expected: NotFoundException('Exam not found.').
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.submitExam('E999999', mockStudent as any, { answers: [] } as any),
    ).rejects.toThrow('Exam not found.');
  });

  it('ME-045 — should_throw_bad_request_when_submitting_after_end_time', async () => {
    // ME-045: Nộp bài khi đã hết giờ → 400.
    // Mô tả: endTime < now.
    // Expected: BadRequestException('The time for this exam has ended.').
    const pastEnd = new Date(Date.now() - 3600000);
    const mockExam = {
      ...createMockExam({ status: 'active', endTime: pastEnd }),
      courseId: createMockCourse(),
      questions: [],
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockExam),
      }),
    });

    await expect(
      service.submitExam('E123456', mockStudent as any, { answers: [] } as any),
    ).rejects.toThrow('The time for this exam has ended.');
  });

  it('ME-046 — should_throw_forbidden_when_submitting_duplicate', async () => {
    // ME-046: Student nộp bài lần 2 → 403.
    // Mô tả: Existing submission found.
    // Expected: ForbiddenException('You have already submitted this exam.').
    const futureEndTime = new Date(Date.now() + 86400000);
    const mockExam = {
      ...createMockExam({ status: 'active', endTime: futureEndTime }),
      courseId: createMockCourse(),
      questions: [],
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockExam),
      }),
    });
    submissionModel.findOne.mockResolvedValue({ _id: 'existing' });

    await expect(
      service.submitExam('E123456', mockStudent as any, { answers: [] } as any),
    ).rejects.toThrow('You have already submitted this exam.');
  });

  // ==================== PROCESS AUTOMATIC STATUS TRANSITIONS ====================

  it('ME-047 — should_process_automatic_transitions_for_scheduled_exams', async () => {
    // ME-047: Scheduled exam quá startTime → tự chuyển active.
    // Mô tả: processAutomaticStatusTransitions cron job.
    // Expected: findOneAndUpdate gọi với status active.
    const pastStart = new Date(Date.now() - 3600000);
    const futEnd = new Date(Date.now() + 3600000);
    examModel.find.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(EXAM_ID),
            status: 'scheduled',
            startTime: pastStart,
            endTime: futEnd,
            courseId: new Types.ObjectId(COURSE_ID),
          },
        ]),
      }),
    });
    examModel.findOneAndUpdate.mockResolvedValue(
      createMockExam({ status: 'active' }),
    );
    courseModel.findById.mockResolvedValue(createMockCourse());

    await service.processAutomaticStatusTransitions();
    expect(examModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('ME-048 — should_skip_transition_when_no_candidates', async () => {
    // ME-048: Không có exam cần transition → không làm gì.
    // Mô tả: processAutomaticStatusTransitions with empty result.
    // Expected: findOneAndUpdate không được gọi.
    examModel.find.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });
    examModel.findOneAndUpdate = jest.fn();

    await service.processAutomaticStatusTransitions();
    expect(examModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // ==================== EDGE CASES ====================

  it('ME-049 — should_throw_when_teacher_id_is_invalid_objectid', async () => {
    // ME-049: teacher.id không phải ObjectId hợp lệ → 403.
    // Mô tả: createExam với teacher.id = 'abc'.
    // Expected: ForbiddenException('Invalid teacher identifier').
    await expect(
      service.createExam(createValidExamDto(), { id: 'abc', role: 'teacher' } as any),
    ).rejects.toThrow('Invalid teacher identifier');
  });

  it('ME-050 — should_throw_when_answerQuestion_out_of_range', async () => {
    // ME-050: answerQuestion = 5 (chỉ có 4 choices) → 400.
    // Mô tả: normalizeChoices với index ngoài phạm vi.
    // Expected: BadRequestException.
    courseModel.findById.mockResolvedValue(createMockCourse());

    await expect(
      service.createExam(
        createValidExamDto({
          questions: [
            {
              content: 'Q1',
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
        mockTeacher as any,
      ),
    ).rejects.toThrow('answerQuestion must reference one of the provided choices');
  });

  // ==================== GET SUBMISSION RESULT FOR TEACHER ====================

  it('ME-051 — should_throw_bad_request_for_invalid_exam_id_in_teacher_submission', async () => {
    // ME-051: examId sai format trong getSubmissionResultForTeacher → 400.
    // Mô tả: Kiểm tra validation ObjectId.
    // Expected: BadRequestException('Invalid exam ID').
    await expect(
      service.getSubmissionResultForTeacher('invalid-id', EXAM_ID, mockTeacher as any),
    ).rejects.toThrow('Invalid exam ID');
  });

  it('ME-052 — should_throw_not_found_for_nonexistent_submission_in_teacher_view', async () => {
    // ME-052: submissionId không tồn tại → 404.
    // Mô tả: getSubmissionResultForTeacher loadSubmissionWithExam trả null.
    // Expected: NotFoundException('Submission not found.').
    const populateChain052 = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    submissionModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(populateChain052),
    });

    await expect(
      service.getSubmissionResultForTeacher(EXAM_ID, STUDENT_ID, mockTeacher as any),
    ).rejects.toThrow('Submission not found.');
  });

  it('ME-053 — should_throw_not_found_for_nonexistent_submission_in_student_view', async () => {
    // ME-053: Student getSubmissionResult với submissionId không tồn tại → 404.
    // Mô tả: loadSubmissionWithExam trả null.
    // Expected: NotFoundException.
    submissionModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      service.getSubmissionResult(STUDENT_ID, mockStudent as any),
    ).rejects.toThrow('Submission not found.');
  });

  it('ME-054 — should_throw_bad_request_for_invalid_submission_id_format', async () => {
    // ME-054: submissionId sai format → 400.
    // Mô tả: loadSubmissionWithExam với invalid ObjectId.
    // Expected: BadRequestException('Invalid submission ID').
    await expect(
      service.getSubmissionResult('invalid-id', mockStudent as any),
    ).rejects.toThrow('Invalid submission ID');
  });

  it('ME-055 — should_return_empty_when_courseId_filter_not_in_teacher_courses', async () => {
    // ME-055: courseId không thuộc teacher → trả rỗng.
    // Mô tả: listExamSummaries filter courseId ngoài phạm vi.
    // Expected: { exams: [], pagination: { total: 0 } }.
    const teacherCourse = createMockCourse();
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([teacherCourse]),
      }),
    });

    const otherCourseId = '607f1f77bcf86cd799439099';
    const result = await service.listExamSummaries(TEACHER_ID, {
      courseId: otherCourseId,
    } as any);

    expect(result.exams).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('ME-056 — should_throw_bad_request_for_invalid_courseId_in_list', async () => {
    // ME-056: courseId sai format trong listExamSummaries → 400.
    // Mô tả: courseId filter không phải ObjectId hợp lệ.
    // Expected: BadRequestException('Invalid course ID').
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([createMockCourse()]),
      }),
    });

    await expect(
      service.listExamSummaries(TEACHER_ID, { courseId: 'invalid!!' } as any),
    ).rejects.toThrow('Invalid course ID');
  });

  it('ME-057 — should_transition_exam_status_and_save_successfully', async () => {
    // ME-057: Transition scheduled → active thành công.
    // Mô tả: transitionExamStatus save exam mới + gọi notification.
    // Expected: Trả exam với status mới.
    const pastStart = new Date(Date.now() - 3600000);
    const futEnd = new Date(Date.now() + 3600000);
    const mockExam = {
      ...createMockExam({ status: 'scheduled', startTime: pastStart, endTime: futEnd }),
      courseId: createMockCourse(),
      questions: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({
        _id: new Types.ObjectId(EXAM_ID),
        status: 'scheduled',
        startTime: pastStart,
        endTime: futEnd,
        questions: [],
      }),
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    const result = await service.transitionExamStatus(EXAM_ID, 'active' as any, mockTeacher as any);
    expect(mockExam.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('ME-058 — should_get_teacher_submission_result_successfully', async () => {
    // ME-058: Teacher xem chi tiết submission thành công.
    // Mô tả: getSubmissionResultForTeacher trả ExamResultDetailDto.
    // Expected: Trả data với submissionId đúng.
    const mockQuestion = {
      _id: new Types.ObjectId(),
      content: 'Q1',
      answerQuestion: 2,
      answer: [
        { content: 'A', isCorrect: false },
        { content: 'B', isCorrect: true },
        { content: 'C', isCorrect: false },
        { content: 'D', isCorrect: false },
      ],
    };
    const mockExamData = {
      _id: new Types.ObjectId(EXAM_ID),
      publicId: 'E123456',
      title: 'Test Exam',
      rateScore: 70,
      courseId: {
        _id: new Types.ObjectId(COURSE_ID),
        courseName: 'Test Course',
        teacherId: new Types.ObjectId(TEACHER_ID),
      },
      questions: [mockQuestion],
    };
    const subId = new Types.ObjectId();
    const mockSubmission = {
      _id: subId,
      studentId: {
        _id: new Types.ObjectId(STUDENT_ID),
        fullName: 'Student A',
        username: 'student_a',
      },
      examId: mockExamData,
      score: 80,
      submittedAt: new Date(),
      answers: [{ questionId: mockQuestion._id, answerNumber: 2 }],
    };
    const populateChain = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockSubmission),
    };
    const populateChain058 = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockSubmission),
    };
    submissionModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(populateChain058),
    });

    const result = await service.getSubmissionResultForTeacher(
      EXAM_ID, String(subId), mockTeacher as any,
    );
    expect(result.submissionId).toBe(String(subId));
    expect(result.exam.examPublicId).toBe('E123456');
  });

  it('ME-059 — should_throw_when_submission_exam_mismatch_in_teacher_view', async () => {
    // ME-059: Submission thuộc exam khác → 400.
    // Mô tả: examId trong URL khác examId trong submission.
    // Expected: BadRequestException('Submission does not belong to the specified exam').
    const differentExamId = new Types.ObjectId();
    const subId = new Types.ObjectId();
    const mockSubmission = {
      _id: subId,
      studentId: { _id: new Types.ObjectId(STUDENT_ID), fullName: 'S', username: 's' },
      examId: {
        _id: differentExamId,
        publicId: 'E999999',
        title: 'Other',
        rateScore: 70,
        courseId: {
          _id: new Types.ObjectId(COURSE_ID),
          courseName: 'C',
          teacherId: new Types.ObjectId(TEACHER_ID),
        },
        questions: [],
      },
      score: 50,
      submittedAt: new Date(),
      answers: [],
    };
    const populateChain059 = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockSubmission),
    };
    submissionModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(populateChain059),
    });

    await expect(
      service.getSubmissionResultForTeacher(EXAM_ID, String(subId), mockTeacher as any),
    ).rejects.toThrow('Submission does not belong to the specified exam');
  });

  it('ME-060 — should_list_exams_with_status_filter', async () => {
    // ME-060: Filter exams theo status.
    // Mô tả: listExamSummaries với status = 'active'.
    // Expected: query.status = 'active' trong filter.
    courseModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([createMockCourse()]),
      }),
    });
    examModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(5) });
    examModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([createMockExam({ status: 'active' })]),
          }),
        }),
      }),
    });

    const result = await service.listExamSummaries(TEACHER_ID, {
      status: 'active',
      page: 1,
      limit: 10,
    } as any);

    expect(result.pagination.total).toBe(5);
    expect(result.exams.length).toBeGreaterThanOrEqual(1);
  });

  it('ME-061 — should_auto_transition_active_to_completed', async () => {
    // ME-061: Active exam quá endTime → tự chuyển completed.
    // Mô tả: processAutomaticStatusTransitions active→completed branch.
    // Expected: findOneAndUpdate gọi với status completed.
    const pastStart = new Date(Date.now() - 86400000 * 2);
    const pastEnd = new Date(Date.now() - 3600000);
    examModel.find.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(EXAM_ID),
            status: 'active',
            startTime: pastStart,
            endTime: pastEnd,
            courseId: new Types.ObjectId(COURSE_ID),
          },
        ]),
      }),
    });
    const updatedExam = createMockExam({ status: 'completed' });
    examModel.findOneAndUpdate.mockResolvedValue(updatedExam);
    courseModel.findById.mockResolvedValue(createMockCourse());

    await service.processAutomaticStatusTransitions();
    expect(examModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'completed' }) }),
      expect.anything(),
    );
  });

  it('ME-062 — should_skip_candidate_when_findOneAndUpdate_returns_null', async () => {
    // ME-062: Race condition — findOneAndUpdate trả null → skip.
    // Mô tả: processAutomaticStatusTransitions khi exam bị update bởi process khác.
    // Expected: courseModel.findById không gọi.
    const pastStart = new Date(Date.now() - 3600000);
    const futEnd = new Date(Date.now() + 3600000);
    examModel.find.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(EXAM_ID),
            status: 'scheduled',
            startTime: pastStart,
            endTime: futEnd,
            courseId: new Types.ObjectId(COURSE_ID),
          },
        ]),
      }),
    });
    examModel.findOneAndUpdate.mockResolvedValue(null);
    courseModel.findById = jest.fn();

    await service.processAutomaticStatusTransitions();
    expect(courseModel.findById).not.toHaveBeenCalled();
  });

  it('ME-063 — should_skip_notification_when_course_not_found_in_auto_transition', async () => {
    // ME-063: Course bị xóa → skip notification trong auto transition.
    // Mô tả: courseModel.findById trả null sau findOneAndUpdate.
    // Expected: Không throw, tiếp tục xử lý.
    const pastStart = new Date(Date.now() - 3600000);
    const futEnd = new Date(Date.now() + 3600000);
    examModel.find.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(EXAM_ID),
            status: 'scheduled',
            startTime: pastStart,
            endTime: futEnd,
            courseId: new Types.ObjectId(COURSE_ID),
          },
        ]),
      }),
    });
    examModel.findOneAndUpdate.mockResolvedValue(createMockExam({ status: 'active' }));
    courseModel.findById.mockResolvedValue(null);

    // Should not throw
    await expect(service.processAutomaticStatusTransitions()).resolves.not.toThrow();
  });

  it('ME-064 — should_transition_active_to_completed_and_save', async () => {
    // ME-064: Transition active → completed thành công.
    // Mô tả: transitionExamStatus save + emit notification (completed branch).
    // Expected: exam.save gọi, notification emitted.
    const pastStart = new Date(Date.now() - 86400000 * 2);
    const pastEnd = new Date(Date.now() - 3600000);
    const mockExam = {
      ...createMockExam({ status: 'active', startTime: pastStart, endTime: pastEnd }),
      courseId: createMockCourse(),
      questions: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({
        _id: new Types.ObjectId(EXAM_ID),
        status: 'active',
        startTime: pastStart,
        endTime: pastEnd,
        questions: [],
      }),
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });

    const result = await service.transitionExamStatus(EXAM_ID, 'completed' as any, mockTeacher as any);
    expect(mockExam.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('ME-065 — should_list_exams_with_missing_courseMap_entries', async () => {
    // ME-065: Exams có courseId chưa nằm trong courseMap → fetch bổ sung.
    // Mô tả: Covers lines 309-318 (missingCourseIds fetch).
    // Expected: Trả exams với courseName bổ sung.
    const unknownCourseId = new Types.ObjectId();
    courseModel.find.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([createMockCourse()]),
      }),
    });
    examModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
    examModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              createMockExam({ courseId: unknownCourseId }),
            ]),
          }),
        }),
      }),
    });
    // Mock lần findById cho missing course
    courseModel.find.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: unknownCourseId, courseName: 'Fetched Course' },
        ]),
      }),
    });

    const result = await service.listExamSummaries(TEACHER_ID, {
      page: 1,
      limit: 10,
    } as any);

    expect(result.exams.length).toBe(1);
  });

  it('ME-066 — should_handle_notification_error_gracefully', async () => {
    // ME-066: Notification service throw error → catch + log warning.
    // Mô tả: emitTeacherExamStatusNotification catches error.
    // Expected: Không throw, kết quả vẫn trả bình thường.
    const pastStart = new Date(Date.now() - 3600000);
    const futEnd = new Date(Date.now() + 3600000);
    const mockExam = {
      ...createMockExam({ status: 'scheduled', startTime: pastStart, endTime: futEnd }),
      courseId: createMockCourse(),
      questions: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({
        _id: new Types.ObjectId(EXAM_ID),
        status: 'scheduled',
        startTime: pastStart,
        endTime: futEnd,
        questions: [],
      }),
    };
    examModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExam),
        }),
      }),
    });
    // Notification service throws
    notificationServiceMock.createNotification.mockRejectedValueOnce(
      new Error('Notification failed'),
    );

    // Should NOT throw — notification error is caught
    const result = await service.transitionExamStatus(EXAM_ID, 'active' as any, mockTeacher as any);
    expect(result).toBeDefined();
    expect(mockExam.save).toHaveBeenCalled();
  });
});
