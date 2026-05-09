import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { DashboardController } from 'src/modules/dashboard/dashboard.controller';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';

describe('TestDashboardController — DashboardController endpoints', () => {
  let controller: DashboardController;
  let dashboardService: any;

  const mockDashboard = {
    stats: { totalStudents: 20, activeExams: 2, certificatesIssued: 5 },
    examPerformance: {
      summary: { passRate: 75 },
      records: [{ examId: 'e1', examName: 'Quiz 1', passCount: 3, failCount: 1 }],
    },
    activeExams: [{ publicId: 'E123456', status: 'active', startTime: '2026-01-01T00:00:00.000Z' }],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getTeacherDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get(DashboardService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('VR-022 — should_reject_when_user_context_is_missing', async () => {
    // VR-022: Endpoint dashboard teacher phải yêu cầu ngữ cảnh user hợp lệ.
    // Mô tả: CurrentUser bị thiếu.
    // Expected: Throw UnauthorizedException.
    await expect(
      controller.getTeacherDashboard({ teacherId: '507f1f77bcf86cd799439011' } as never, undefined as never),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('VR-023 — should_reject_student_role_from_teacher_dashboard', async () => {
    // VR-023: Student không được truy cập dashboard giáo viên.
    // Mô tả: User role = student.
    // Expected: Throw ForbiddenException.
    await expect(
      controller.getTeacherDashboard(
        { teacherId: '507f1f77bcf86cd799439011' } as never,
        { id: '507f1f77bcf86cd799439011', role: 'student' } as never,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('VR-024 — should_reject_teacher_when_accessing_other_teacher_dashboard', async () => {
    // VR-024: Giáo viên chỉ được xem dashboard của chính mình.
    // Mô tả: teacher.id khác query.teacherId.
    // Expected: Throw ForbiddenException.
    await expect(
      controller.getTeacherDashboard(
        { teacherId: '507f1f77bcf86cd799439099' } as never,
        { id: '507f1f77bcf86cd799439011', role: 'teacher' } as never,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('VR-025 — should_allow_admin_to_view_teacher_dashboard', async () => {
    // VR-025: Admin được phép xem dashboard của mọi giáo viên.
    // Mô tả: User role = admin, teacherId hợp lệ.
    // Expected: Response success và service nhận đúng teacherId.
    dashboardService.getTeacherDashboard.mockResolvedValue(mockDashboard);

    const result = await controller.getTeacherDashboard(
      { teacherId: '507f1f77bcf86cd799439011' } as never,
      { id: '507f1f77bcf86cd799439055', role: 'admin' } as never,
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Teacher dashboard data retrieved successfully');
    expect(result.data.stats.totalStudents).toBe(20);
    expect(dashboardService.getTeacherDashboard).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('VR-026 — should_return_teacher_dashboard_successfully_for_owner', async () => {
    // VR-026: Teacher truy cập dashboard của chính mình thành công.
    // Mô tả: teacher.id trùng query.teacherId.
    // Expected: Trả data dashboard chuẩn cho UI.
    dashboardService.getTeacherDashboard.mockResolvedValue(mockDashboard);

    const result = await controller.getTeacherDashboard(
      { teacherId: '507f1f77bcf86cd799439011' } as never,
      { id: '507f1f77bcf86cd799439011', role: 'teacher' } as never,
    );

    expect(result.success).toBe(true);
    expect(result.data.activeExams).toHaveLength(1);
  });

  it('VR-027 — should_propagate_not_found_when_teacher_does_not_exist', async () => {
    // VR-027: Nếu teacher không tồn tại thì controller phải propagate lỗi.
    // Mô tả: Service throw NotFoundException.
    // Expected: Controller không nuốt lỗi.
    dashboardService.getTeacherDashboard.mockRejectedValue(new NotFoundException('Teacher not found'));

    await expect(
      controller.getTeacherDashboard(
        { teacherId: '507f1f77bcf86cd799439011' } as never,
        { id: '507f1f77bcf86cd799439011', role: 'teacher' } as never,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

