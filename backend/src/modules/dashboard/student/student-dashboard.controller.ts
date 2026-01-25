import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StudentDashboardService } from './student-dashboard.service';
import { ResponseHelper } from '../../../common/dto/response.dto';
import { CurrentUser } from '../../../common/decorators/user.decorator';
import type { IUser } from '../../../common/interfaces';
import { Roles } from '../../../common/decorators/auth.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard/student')
export class StudentDashboardController {
  constructor(
    private readonly studentDashboardService: StudentDashboardService,
  ) {}

  @Get()
  @Roles('student')
  @ApiOperation({ summary: 'Retrieve the student dashboard snapshot' })
  @ApiResponse({
    status: 200,
    description: 'Student dashboard data retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          performance: {
            averageScore: 88.3,
            passRate: 80,
            points: [
              {
                submittedAt: '2025-11-02T10:00:00.000Z',
                examTitle: 'Weekly Quiz',
                score: 92.5,
                result: 'Passed',
              },
            ],
          },
          completedExams: [
            {
              examPublicId: 'E122222',
              examTitle: 'Weekly Quiz',
              courseName: 'Blockchain Fundamentals',
              score: 92.5,
              result: 'Passed',
              submittedAt: '2025-11-02T10:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  async getStudentDashboard(@CurrentUser() user: IUser) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing user context');
    }

    const dashboard = await this.studentDashboardService.getStudentDashboard(
      user.id,
    );

    return ResponseHelper.success(
      dashboard,
      'Student dashboard data retrieved successfully',
    );
  }
}
