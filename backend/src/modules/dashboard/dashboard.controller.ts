import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { TeacherDashboardQueryDto } from './dto/teacher-dashboard-query.dto';
import { ResponseHelper } from '../../common/dto/response.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { IUser } from '../../common/interfaces';
import type { TeacherDashboardResponseDto } from './dto/teacher-dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('teacher')
  @ApiOperation({ summary: 'Lấy dữ liệu tổng hợp cho dashboard giáo viên' })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu dashboard lấy thành công',
    schema: {
      example: {
        success: true,
        data: {
          stats: {
            totalStudents: 12450,
            activeExams: 6,
            certificatesIssued: 125,
          },
          examPerformance: {
            summary: {
              passRate: 76.4,
            },
            records: [
              {
                examId: 'exam_45',
                examName: 'Physics Midterm',
                examDate: '2025-10-12T08:00:00.000Z',
                passCount: 72,
                failCount: 18,
              },
            ],
          },
          activeExams: [
            {
              publicId: 'EX-2025-03',
              status: 'active',
              startTime: '2025-11-05T08:00:00.000Z',
            },
          ],
        },
        message: 'Teacher dashboard data retrieved successfully',
        meta: {
          timestamp: '2025-11-02T00:00:00.000Z',
        },
      },
    },
  })
  async getTeacherDashboard(
    @Query() query: TeacherDashboardQueryDto,
    @CurrentUser() user: IUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Missing user context');
    }

    if (user.role === 'student') {
      throw new ForbiddenException(
        'Students are not allowed to access this resource',
      );
    }

    if (user.role === 'teacher' && user.id !== query.teacherId) {
      throw new ForbiddenException('You can only view your own dashboard');
    }

    const dashboard: TeacherDashboardResponseDto =
      await this.dashboardService.getTeacherDashboard(query.teacherId);

    return ResponseHelper.success(
      dashboard,
      'Teacher dashboard data retrieved successfully',
    );
  }
}
