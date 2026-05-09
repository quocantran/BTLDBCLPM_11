import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { Course } from 'src/database/schemas/course.schema';
import { Exam } from 'src/database/schemas/exam.schema';
import { Enrollment } from 'src/database/schemas/enrollment.schema';
import { Submission } from 'src/database/schemas/submission.schema';
import { User } from 'src/database/schemas/user.schema';
import { Certificate } from 'src/database/schemas/certificate.schema';
import * as dashboardUtils from 'src/common/utils/dashboard.util';

describe('TestDashboardService — DashboardService business logic', () => {
  let service: DashboardService;
  let courseModel: any;
  let examModel: any;
  let enrollmentModel: any;
  let submissionModel: any;
  let userModel: any;
  let certificateModel: any;

  const TEACHER_ID = '507f1f77bcf86cd799439011';
  const COURSE_ID_1 = new Types.ObjectId('507f1f77bcf86cd799439021');
  const COURSE_ID_2 = new Types.ObjectId('507f1f77bcf86cd799439022');
  const EXAM_ID_1 = new Types.ObjectId('507f1f77bcf86cd799439031');
  const EXAM_ID_2 = new Types.ObjectId('507f1f77bcf86cd799439032');

  const buildSelectLeanExec = (result: unknown) => ({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(result),
      }),
    }),
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Course.name), useValue: { find: jest.fn() } },
        { provide: getModelToken(Exam.name), useValue: { find: jest.fn() } },
        { provide: getModelToken(Enrollment.name), useValue: { aggregate: jest.fn() } },
        { provide: getModelToken(Submission.name), useValue: { aggregate: jest.fn() } },
        { provide: getModelToken(User.name), useValue: { findOne: jest.fn() } },
        { provide: getModelToken(Certificate.name), useValue: { countDocuments: jest.fn() } },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    courseModel = module.get(getModelToken(Course.name));
    examModel = module.get(getModelToken(Exam.name));
    enrollmentModel = module.get(getModelToken(Enrollment.name));
    submissionModel = module.get(getModelToken(Submission.name));
    userModel = module.get(getModelToken(User.name));
    certificateModel = module.get(getModelToken(Certificate.name));
  });

  beforeEach(() => jest.clearAllMocks());

  it('VR-001 — should_throw_not_found_when_teacher_does_not_exist', async () => {
    // VR-001: Dashboard giáo viên phải trả lỗi khi teacher không tồn tại.
    // Mô tả: Query user role teacher theo teacherId nhưng không có dữ liệu.
    // Expected: Throw NotFoundException.
    userModel.findOne.mockReturnValue(buildSelectLeanExec(null));

    await expect(service.getTeacherDashboard(TEACHER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('VR-002 — should_return_empty_dashboard_when_teacher_has_no_courses', async () => {
    // VR-002: Giáo viên chưa có khóa học vẫn phải trả dashboard rỗng hợp lệ.
    // Mô tả: teacher tồn tại, course list rỗng.
    // Expected: stats/examPerformance/activeExams đều ở trạng thái empty.
    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([]));

    const result = await service.getTeacherDashboard(TEACHER_ID);

    expect(result).toEqual({
      stats: { totalStudents: 0, activeExams: 0, certificatesIssued: 0 },
      examPerformance: { summary: { passRate: 0 }, records: [] },
      activeExams: [],
    });
  });

  it('VR-003 — should_return_empty_exam_sections_when_courses_exist_but_no_exams', async () => {
    // VR-003: Có khóa học nhưng chưa có bài thi vẫn cần thống kê students/certificates.
    // Mô tả: courses có dữ liệu, exams rỗng.
    // Expected: activeExams=0, records=[] và vẫn có totalStudents/certificatesIssued.
    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }, { _id: COURSE_ID_2 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(7) });
    examModel.find.mockReturnValue(buildSelectLeanExec([]));
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]) });
    submissionModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.getTeacherDashboard(TEACHER_ID);

    expect(result.stats.totalStudents).toBe(1);
    expect(result.stats.certificatesIssued).toBe(7);
    expect(result.stats.activeExams).toBe(0);
    expect(result.examPerformance.records).toEqual([]);
    expect(result.activeExams).toEqual([]);
  });

  it('VR-004 — should_build_teacher_dashboard_with_pass_rate_records_and_active_exams', async () => {
    // VR-004: Dashboard teacher phải trả đầy đủ stats, performance và active exams.
    // Mô tả: Có 2 exam với trạng thái runtime khác nhau + dữ liệu submissions graded.
    // Expected: passRate đúng, records đúng và activeExams sắp xếp chuẩn cho UI.
    const now = new Date('2026-06-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(4) });
    examModel.find.mockReturnValue(
      buildSelectLeanExec([
        {
          _id: EXAM_ID_1,
          title: 'Exam B',
          startTime: new Date('2026-05-25T00:00:00.000Z'),
          endTime: new Date('2026-06-02T00:00:00.000Z'),
          status: 'scheduled',
          publicId: 'E000002',
          rateScore: 70,
        },
        {
          _id: EXAM_ID_2,
          title: 'Exam A',
          startTime: new Date('2026-05-20T00:00:00.000Z'),
          endTime: new Date('2026-05-22T00:00:00.000Z'),
          status: 'scheduled',
          publicId: 'E000001',
          rateScore: 60,
        },
      ]),
    );
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId('507f1f77bcf86cd799439041') }]) });
    submissionModel.aggregate
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { _id: new Types.ObjectId('507f1f77bcf86cd799439041') },
          { _id: new Types.ObjectId('507f1f77bcf86cd799439042') },
        ]),
      })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { _id: EXAM_ID_1, passCount: 7, failCount: 3 },
          { _id: EXAM_ID_2, passCount: 2, failCount: 2 },
        ]),
      });

    const result = await service.getTeacherDashboard(TEACHER_ID);

    expect(result.stats.totalStudents).toBe(2);
    expect(result.stats.activeExams).toBe(1);
    expect(result.stats.certificatesIssued).toBe(4);
    expect(result.examPerformance.summary.passRate).toBe(64.3);
    expect(result.examPerformance.records[0].examName).toBe('Exam A');
    expect(result.examPerformance.records[1].examName).toBe('Exam B');
    expect(result.activeExams[0].publicId).toBe('E000002');

    jest.useRealTimers();
  });

  it('VR-005 — should_keep_pass_rate_zero_when_no_graded_attempts_exist', async () => {
    // VR-005: Nếu chưa có lượt chấm điểm thì passRate phải bằng 0.
    // Mô tả: Exams tồn tại nhưng aggregation performance rỗng.
    // Expected: summary.passRate=0 và mỗi record có pass/fail=0.
    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    examModel.find.mockReturnValue(
      buildSelectLeanExec([
        {
          _id: EXAM_ID_1,
          title: 'No attempt exam',
          startTime: new Date('2026-01-01T00:00:00.000Z'),
          endTime: new Date('2026-01-02T00:00:00.000Z'),
          status: 'completed',
          publicId: 'E000003',
          rateScore: 50,
        },
      ]),
    );
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    submissionModel.aggregate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.getTeacherDashboard(TEACHER_ID);

    expect(result.examPerformance.summary.passRate).toBe(0);
    expect(result.examPerformance.records[0].passCount).toBe(0);
    expect(result.examPerformance.records[0].failCount).toBe(0);
  });

  it('VR-006 — should_exclude_cancelled_exam_from_active_count_after_normalization', async () => {
    // VR-006: Exam bị hủy không được tính là active trên dashboard.
    // Mô tả: status cancelled được normalize về completed.
    // Expected: activeExams count = 0.
    const now = new Date('2026-06-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
    examModel.find.mockReturnValue(
      buildSelectLeanExec([
        {
          _id: EXAM_ID_1,
          title: 'Cancelled exam',
          startTime: new Date('2026-05-30T00:00:00.000Z'),
          endTime: new Date('2026-06-05T00:00:00.000Z'),
          status: 'cancelled',
          publicId: 'E000004',
          rateScore: 70,
        },
      ]),
    );
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    submissionModel.aggregate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.getTeacherDashboard(TEACHER_ID);
    expect(result.stats.activeExams).toBe(0);
    expect(result.activeExams[0].status).toBe('completed');

    jest.useRealTimers();
  });

  it('VR-007 — should_merge_distinct_students_from_enrollments_and_submissions_without_duplicates', async () => {
    // VR-007: Tổng học viên phải gộp từ enrollment + submission và loại bỏ trùng lặp.
    // Mô tả: studentId xuất hiện ở nhiều nguồn với nhiều kiểu dữ liệu.
    // Expected: totalStudents phản ánh số lượng duy nhất.
    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    examModel.find.mockReturnValue(buildSelectLeanExec([]));

    const objectIdA = new Types.ObjectId('507f1f77bcf86cd799439041');
    const objectIdB = new Types.ObjectId('507f1f77bcf86cd799439042');
    const objectIdC = new Types.ObjectId('507f1f77bcf86cd799439043');
    enrollmentModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: objectIdA },
        { _id: objectIdB.toHexString() },
        { _id: { toHexString: () => objectIdC.toHexString() } },
        { _id: { toHexString: () => 123, toString: () => objectIdA.toHexString() } },
        { _id: null },
      ]),
    });
    submissionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ _id: objectIdB }, { _id: undefined }]),
    });

    const result = await service.getTeacherDashboard(TEACHER_ID);
    expect(result.stats.totalStudents).toBe(3);
  });

  it('VR-008 — should_return_zero_when_count_distinct_students_receives_empty_inputs', async () => {
    // VR-008: Khi không có courseId và examId thì tổng học viên phải bằng 0.
    // Mô tả: Trường hợp dữ liệu nguồn rỗng hoàn toàn.
    // Expected: countDistinctStudents trả 0.
    const result = await (service as any).countDistinctStudents([], []);
    expect(result).toBe(0);
  });

  it('VR-009 — should_return_empty_performance_aggregation_when_exam_ids_empty', async () => {
    // VR-009: Không có examId thì không có dữ liệu performance.
    // Mô tả: aggregateExamPerformance nhận mảng rỗng.
    // Expected: Trả [].
    const result = await (service as any).aggregateExamPerformance([]);
    expect(result).toEqual([]);
  });

  it('VR-010 — should_return_zero_issued_certificates_when_course_ids_empty', async () => {
    // VR-010: Không có khóa học thì số chứng chỉ đã cấp phải bằng 0.
    // Mô tả: countIssuedCertificates nhận mảng course rỗng.
    // Expected: Trả 0 và không query DB.
    const result = await (service as any).countIssuedCertificates([]);
    expect(result).toBe(0);
    expect(certificateModel.countDocuments).not.toHaveBeenCalled();
  });

  it('VR-011 — should_map_aggregation_exam_ids_to_strings', async () => {
    // VR-011: Dữ liệu aggregate phải map examId về string cho response contract.
    // Mô tả: aggregate trả _id kiểu ObjectId.
    // Expected: examId trong kết quả là chuỗi hex.
    submissionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ _id: EXAM_ID_1, passCount: 3, failCount: 2 }]),
    });

    const result = await (service as any).aggregateExamPerformance([EXAM_ID_1]);
    expect(result).toEqual([
      { examId: EXAM_ID_1.toHexString(), passCount: 3, failCount: 2 },
    ]);
  });

  it('VR-012 — should_return_null_when_student_identifier_is_not_normalizable', () => {
    // VR-012: ID học viên không thể chuẩn hóa phải bị loại khỏi thống kê.
    // Mô tả: Input là object không có toHexString/toString hợp lệ.
    // Expected: normalizeStudentId trả null.
    const result = (service as any).normalizeStudentId({ toHexString: () => 10, toString: () => 20 });
    expect(result).toBeNull();
  });

  it('VR-013 — should_sort_exam_performance_records_by_exam_date_ascending', async () => {
    // VR-013: Biểu đồ performance phải có thứ tự theo ngày thi tăng dần.
    // Mô tả: Exams trả về không theo thứ tự thời gian.
    // Expected: records được sort tăng dần theo examDate.
    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    examModel.find.mockReturnValue(
      buildSelectLeanExec([
        {
          _id: EXAM_ID_1,
          title: 'Later',
          startTime: new Date('2026-04-01T00:00:00.000Z'),
          endTime: new Date('2026-04-02T00:00:00.000Z'),
          status: 'completed',
          publicId: 'E200002',
          rateScore: 60,
        },
        {
          _id: EXAM_ID_2,
          title: 'Earlier',
          startTime: new Date('2026-03-01T00:00:00.000Z'),
          endTime: new Date('2026-03-02T00:00:00.000Z'),
          status: 'completed',
          publicId: 'E200001',
          rateScore: 60,
        },
      ]),
    );
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    submissionModel.aggregate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { _id: EXAM_ID_1, passCount: 1, failCount: 0 },
          { _id: EXAM_ID_2, passCount: 1, failCount: 1 },
        ]),
      });

    const result = await service.getTeacherDashboard(TEACHER_ID);
    expect(result.examPerformance.records.map((r) => r.examName)).toEqual([
      'Earlier',
      'Later',
    ]);
  });

  it('VR-014 — should_limit_active_exam_list_to_five_items', async () => {
    // VR-014: Danh sách activeExams cho UI phải giới hạn tối đa 5 bản ghi.
    // Mô tả: Có nhiều exam hơn limit mặc định.
    // Expected: activeExams.length = 5.
    const now = new Date('2026-06-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    const exams = Array.from({ length: 7 }).map((_, index) => ({
      _id: new Types.ObjectId(),
      title: `Exam ${index + 1}`,
      startTime: new Date(`2026-06-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
      endTime: new Date(`2026-06-${String(index + 2).padStart(2, '0')}T00:00:00.000Z`),
      status: 'scheduled',
      publicId: `E30000${index}`,
      rateScore: 60,
    }));
    examModel.find.mockReturnValue(buildSelectLeanExec(exams));
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    submissionModel.aggregate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.getTeacherDashboard(TEACHER_ID);
    expect(result.activeExams).toHaveLength(5);
    jest.useRealTimers();
  });

  it('VR-015 — should_keep_exam_record_sort_stable_when_exam_date_missing', async () => {
    // VR-015: Dashboard không được lỗi khi exam thiếu startTime.
    // Mô tả: examDate undefined phải được xử lý an toàn trong sort.
    // Expected: Trả records hợp lệ và không throw.
    const listSpy = jest
      .spyOn(dashboardUtils, 'buildDashboardExamList')
      .mockReturnValue([]);

    userModel.findOne.mockReturnValue(
      buildSelectLeanExec({ _id: new Types.ObjectId(TEACHER_ID), role: 'teacher' }),
    );
    courseModel.find.mockReturnValue(buildSelectLeanExec([{ _id: COURSE_ID_1 }]));
    certificateModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    examModel.find.mockReturnValue(
      buildSelectLeanExec([
        {
          _id: EXAM_ID_1,
          title: 'Missing date exam A',
          startTime: undefined,
          endTime: new Date('2026-01-02T00:00:00.000Z'),
          status: 'completed',
          publicId: 'E400001',
          rateScore: 50,
        } as any,
        {
          _id: EXAM_ID_2,
          title: 'Has date exam',
          startTime: new Date('2026-01-03T00:00:00.000Z'),
          endTime: new Date('2026-01-04T00:00:00.000Z'),
          status: 'completed',
          publicId: 'E400002',
          rateScore: 50,
        } as any,
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439033'),
          title: 'Missing date exam B',
          startTime: undefined,
          endTime: new Date('2026-01-05T00:00:00.000Z'),
          status: 'completed',
          publicId: 'E400003',
          rateScore: 50,
        } as any,
      ]),
    );
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    submissionModel.aggregate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.getTeacherDashboard(TEACHER_ID);
    expect(result.examPerformance.records[0].examDate).toBeUndefined();
    listSpy.mockRestore();
  });

  it('VR-016 — should_count_students_from_submissions_when_course_list_is_empty', async () => {
    // VR-016: countDistinctStudents phải hỗ trợ nguồn submissions độc lập.
    // Mô tả: courseIds rỗng, examIds có dữ liệu.
    // Expected: Trả số student duy nhất từ submissions.
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    submissionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: new Types.ObjectId('507f1f77bcf86cd799439081') },
        { _id: new Types.ObjectId('507f1f77bcf86cd799439081') },
        { _id: new Types.ObjectId('507f1f77bcf86cd799439082') },
      ]),
    });

    const result = await (service as any).countDistinctStudents([], [EXAM_ID_1]);
    expect(result).toBe(2);
  });

  it('VR-017 — should_normalize_student_id_from_to_hex_string_object', () => {
    // VR-017: normalizeStudentId phải đọc được id từ object có toHexString.
    // Mô tả: Input là object wrapper từ thư viện khác.
    // Expected: Trả chuỗi hex hợp lệ.
    const target = '507f1f77bcf86cd799439091';
    const result = (service as any).normalizeStudentId({
      toHexString: () => target,
    });
    expect(result).toBe(target);
  });

  it('VR-018 — should_normalize_student_id_from_to_string_fallback', () => {
    // VR-018: normalizeStudentId phải fallback qua toString khi toHexString không dùng được.
    // Mô tả: toHexString trả non-string, toString trả string.
    // Expected: Trả giá trị từ toString.
    const target = '507f1f77bcf86cd799439092';
    const result = (service as any).normalizeStudentId({
      toHexString: () => 10,
      toString: () => target,
    });
    expect(result).toBe(target);
  });

  it('VR-019 — should_return_null_when_to_string_fallback_is_not_string', () => {
    // VR-019: normalizeStudentId phải loại ID object không convert được về string.
    // Mô tả: toHexString và toString đều không cho ra string.
    // Expected: Trả null.
    const result = (service as any).normalizeStudentId({
      toHexString: () => 12,
      toString: () => 34,
    });
    expect(result).toBeNull();
  });

  it('VR-020 — should_normalize_student_id_when_only_to_string_exists', () => {
    // VR-020: normalizeStudentId phải nhận object chỉ có toString.
    // Mô tả: toHexString không tồn tại, toString trả string.
    // Expected: Trả đúng chuỗi id.
    const target = '507f1f77bcf86cd799439094';
    const result = (service as any).normalizeStudentId({
      toString: () => target,
    });
    expect(result).toBe(target);
  });

  it('VR-021 — should_skip_invalid_submission_student_rows_in_distinct_counter', async () => {
    // VR-021: countDistinctStudents phải bỏ qua submission row không hợp lệ.
    // Mô tả: submissionRows có _id null/invalid object.
    // Expected: Chỉ đếm các studentId hợp lệ.
    enrollmentModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    submissionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: null },
        { _id: { toString: () => 999 } },
        { _id: '507f1f77bcf86cd799439093' },
      ]),
    });

    const result = await (service as any).countDistinctStudents([], [EXAM_ID_1]);
    expect(result).toBe(1);
  });
});

