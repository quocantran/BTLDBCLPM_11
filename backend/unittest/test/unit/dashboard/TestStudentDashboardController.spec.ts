import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { StudentDashboardController } from 'src/modules/dashboard/student/student-dashboard.controller';
import { StudentDashboardService } from 'src/modules/dashboard/student/student-dashboard.service';

describe('TestStudentDashboardController — StudentDashboardController endpoints', () => {
  let controller: StudentDashboardController;
  let studentDashboardService: any;

  const mockDashboard = {
    performance: {
      points: [
        {
          submittedAt: '2026-02-01T00:00:00.000Z',
          score: 82.5,
          examTitle: 'Weekly Quiz',
          result: 'Passed',
        },
      ],
      averageScore: 82.5,
      passRate: 100,
    },
    completedExams: [
      {
        submissionId: '507f1f77bcf86cd799439012',
        examPublicId: 'E123456',
        examTitle: 'Weekly Quiz',
        courseName: 'Blockchain Basics',
        score: 82.5,
        result: 'Passed',
        submittedAt: '2026-02-01T00:00:00.000Z',
      },
    ],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentDashboardController],
      providers: [
        {
          provide: StudentDashboardService,
          useValue: {
            getStudentDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudentDashboardController>(StudentDashboardController);
    studentDashboardService = module.get(StudentDashboardService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('VR-038 — should_reject_when_student_user_context_is_missing', async () => {
    // VR-038: Dashboard student bắt buộc có user context.
    // Mô tả: CurrentUser là undefined.
    // Expected: Throw UnauthorizedException.
    await expect(controller.getStudentDashboard(undefined as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('VR-039 — should_reject_when_student_user_id_is_missing', async () => {
    // VR-039: Dashboard student phải có user.id để truy xuất dữ liệu.
    // Mô tả: CurrentUser thiếu id.
    // Expected: Throw UnauthorizedException.
    await expect(
      controller.getStudentDashboard({ role: 'student' } as never),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('VR-040 — should_return_student_dashboard_successfully', async () => {
    // VR-040: Student lấy snapshot dashboard thành công.
    // Mô tả: Service trả dữ liệu performance và completedExams.
    // Expected: Response success + message đúng contract.
    studentDashboardService.getStudentDashboard.mockResolvedValue(mockDashboard);

    const result = await controller.getStudentDashboard({
      id: '507f1f77bcf86cd799439011',
      role: 'student',
    } as never);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Student dashboard data retrieved successfully');
    expect(result.data.completedExams).toHaveLength(1);
    expect(studentDashboardService.getStudentDashboard).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
    );
  });

  it('VR-041 — should_propagate_validation_error_from_service', async () => {
    // VR-041: Lỗi validate từ service phải được trả ra ngoài.
    // Mô tả: Service throw BadRequestException.
    // Expected: Controller không nuốt lỗi.
    studentDashboardService.getStudentDashboard.mockRejectedValue(
      new BadRequestException('Invalid student identifier'),
    );

    await expect(
      controller.getStudentDashboard({ id: 'bad-id', role: 'student' } as never),
    ).rejects.toThrow(BadRequestException);
  });
});

