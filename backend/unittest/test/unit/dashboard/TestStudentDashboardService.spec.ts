import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { StudentDashboardService } from 'src/modules/dashboard/student/student-dashboard.service';
import { Submission } from 'src/database/schemas/submission.schema';

describe('TestStudentDashboardService — StudentDashboardService business logic', () => {
  let service: StudentDashboardService;
  let submissionModel: any;

  const STUDENT_ID = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentDashboardService,
        {
          provide: getModelToken(Submission.name),
          useValue: {
            aggregate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StudentDashboardService>(StudentDashboardService);
    submissionModel = module.get(getModelToken(Submission.name));
  });

  beforeEach(() => jest.clearAllMocks());

  it('VR-028 — should_reject_invalid_student_identifier', async () => {
    // VR-028: Dashboard student phải chặn studentId sai format.
    // Mô tả: Input không phải Mongo ObjectId hợp lệ.
    // Expected: Throw BadRequestException.
    await expect(service.getStudentDashboard('invalid-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('VR-029 — should_reject_empty_student_identifier', async () => {
    // VR-029: Dashboard student phải chặn input rỗng.
    // Mô tả: studentId = ''.
    // Expected: Throw BadRequestException.
    await expect(service.getStudentDashboard('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('VR-030 — should_return_empty_dashboard_when_student_has_no_completed_exams', async () => {
    // VR-030: Student chưa có bài chấm điểm phải nhận snapshot rỗng.
    // Mô tả: Aggregate trả [].
    // Expected: performance/completedExams đều empty với score/rate=0.
    submissionModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const result = await service.getStudentDashboard(STUDENT_ID);

    expect(result).toEqual({
      performance: { points: [], averageScore: 0, passRate: 0 },
      completedExams: [],
    });
  });

  it('VR-031 — should_build_performance_summary_with_sorted_points_average_and_pass_rate', async () => {
    // VR-031: Dashboard student phải tính đúng averageScore/passRate và sort điểm theo thời gian.
    // Mô tả: Có cả bài Passed và Failed, submittedAt không cùng thứ tự.
    // Expected: average làm tròn 1 chữ số, passRate chuẩn %, points tăng dần theo submittedAt.
    submissionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          submissionId: 's2',
          examPublicId: 'E000002',
          examTitle: 'Exam 2',
          courseName: 'Course 2',
          score: 50,
          examRateScore: 60,
          submittedAt: new Date('2026-02-02T00:00:00.000Z'),
        },
        {
          submissionId: 's1',
          examPublicId: 'E000001',
          examTitle: 'Exam 1',
          courseName: 'Course 1',
          score: 89.4,
          examRateScore: 60,
          submittedAt: new Date('2026-02-01T00:00:00.000Z'),
        },
      ]),
    });

    const result = await service.getStudentDashboard(STUDENT_ID);

    expect(result.performance.averageScore).toBe(69.7);
    expect(result.performance.passRate).toBe(50);
    expect(result.performance.points[0].examTitle).toBe('Exam 1');
    expect(result.performance.points[1].examTitle).toBe('Exam 2');
  });

  it('VR-032 — should_map_completed_exam_results_to_passed_or_failed_by_rate_score', async () => {
    // VR-032: Kết quả completedExams phải phản ánh đúng ngưỡng đạt của từng bài thi.
    // Mô tả: 1 bài đủ điểm, 1 bài thiếu điểm.
    // Expected: result lần lượt Passed và Failed.
    submissionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          submissionId: 's1',
          examPublicId: 'E010001',
          examTitle: 'Midterm',
          courseName: 'Math',
          score: 70,
          examRateScore: 70,
          submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          submissionId: 's2',
          examPublicId: 'E010002',
          examTitle: 'Final',
          courseName: 'Math',
          score: 69.9,
          examRateScore: 70,
          submittedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ]),
    });

    const result = await service.getStudentDashboard(STUDENT_ID);
    expect(result.completedExams[0].result).toBe('Passed');
    expect(result.completedExams[1].result).toBe('Failed');
  });

  it('VR-033 — should_fallback_submitted_at_when_submission_date_missing', async () => {
    // VR-033: Dữ liệu thiếu submittedAt vẫn phải trả timestamp hợp lệ cho FE.
    // Mô tả: Aggregate row không có submittedAt.
    // Expected: completedExams[].submittedAt là ISO string hợp lệ.
    submissionModel.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          submissionId: 's3',
          examPublicId: 'E020001',
          examTitle: 'Quiz',
          courseName: 'Physics',
          score: 90,
          examRateScore: 60,
          submittedAt: undefined,
        },
      ]),
    });

    const result = await service.getStudentDashboard(STUDENT_ID);
    expect(Number.isNaN(Date.parse(result.completedExams[0].submittedAt))).toBe(false);
  });

  it('VR-034 — should_use_default_limit_12_when_querying_completed_exam_results', async () => {
    // VR-034: Snapshot dashboard chỉ lấy tối đa 12 bài gần nhất theo nghiệp vụ.
    // Mô tả: Gọi getStudentDashboard với studentId hợp lệ.
    // Expected: Pipeline aggregate chứa $limit = 12.
    const exec = jest.fn().mockResolvedValue([]);
    submissionModel.aggregate.mockReturnValue({ exec });

    await service.getStudentDashboard(STUDENT_ID);

    const calledPipeline = submissionModel.aggregate.mock.calls[0][0];
    expect(calledPipeline.some((stage: any) => stage.$limit === 12)).toBe(true);
  });

  it('VR-035 — should_return_empty_performance_snapshot_for_empty_input_points', () => {
    // VR-035: Performance snapshot rỗng phải trả giá trị mặc định ổn định.
    // Mô tả: buildPerformanceSnapshot nhận [].
    // Expected: points=[], averageScore=0, passRate=0.
    const result = (service as any).buildPerformanceSnapshot([]);
    expect(result).toEqual({ points: [], averageScore: 0, passRate: 0 });
  });

  it('VR-036 — should_normalize_points_order_chronologically_in_private_snapshot_builder', () => {
    // VR-036: Điểm biểu đồ phải theo thứ tự thời gian tăng dần để tránh nhiễu chart.
    // Mô tả: buildPerformanceSnapshot nhận dữ liệu đảo thứ tự.
    // Expected: points[0] là bản ghi có submittedAt sớm hơn.
    const result = (service as any).buildPerformanceSnapshot([
      {
        submissionId: '2',
        examPublicId: 'E2',
        examTitle: 'Exam 2',
        courseName: 'Course',
        score: 20,
        result: 'Failed',
        submittedAt: '2026-03-02T00:00:00.000Z',
      },
      {
        submissionId: '1',
        examPublicId: 'E1',
        examTitle: 'Exam 1',
        courseName: 'Course',
        score: 80,
        result: 'Passed',
        submittedAt: '2026-03-01T00:00:00.000Z',
      },
    ]);

    expect(result.points[0].examTitle).toBe('Exam 1');
    expect(result.averageScore).toBe(50);
    expect(result.passRate).toBe(50);
  });

  it('VR-037 — should_query_graded_submissions_for_specific_student_id', async () => {
    // VR-037: Dashboard chỉ tổng hợp submissions đã chấm của đúng student hiện tại.
    // Mô tả: Kiểm tra pipeline aggregate của buildCompletedExamResults.
    // Expected: $match chứa studentId ObjectId và status='graded'.
    const exec = jest.fn().mockResolvedValue([]);
    submissionModel.aggregate.mockReturnValue({ exec });

    await service.getStudentDashboard(STUDENT_ID);

    const calledPipeline = submissionModel.aggregate.mock.calls[0][0];
    const matchStage = calledPipeline.find((stage: any) => stage.$match);
    expect(matchStage.$match.status).toBe('graded');
    expect(matchStage.$match.studentId).toEqual(new Types.ObjectId(STUDENT_ID));
  });
});

