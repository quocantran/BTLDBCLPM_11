import { ApiProperty } from '@nestjs/swagger';
export class StudentDashboardExamResultDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  submissionId: string;

  @ApiProperty({ example: 'E123456' })
  examPublicId: string;

  @ApiProperty({ example: 'Midterm Assessment' })
  examTitle: string;

  @ApiProperty({ example: 'Blockchain Fundamentals' })
  courseName: string;

  @ApiProperty({ example: 92.5 })
  score: number;

  @ApiProperty({ enum: ['Passed', 'Failed'], example: 'Passed' })
  result: 'Passed' | 'Failed';

  @ApiProperty({ example: '2025-11-02T10:00:00.000Z' })
  submittedAt: string;
}

export class StudentDashboardPerformancePointDto {
  @ApiProperty({ example: '2025-11-02T10:00:00.000Z' })
  submittedAt: string;

  @ApiProperty({ example: 92.5 })
  score: number;

  @ApiProperty({ example: 'Weekly Quiz' })
  examTitle: string;

  @ApiProperty({ enum: ['Passed', 'Failed'], example: 'Passed' })
  result: 'Passed' | 'Failed';
}

export class StudentDashboardPerformanceDto {
  @ApiProperty({ type: [StudentDashboardPerformancePointDto] })
  points: StudentDashboardPerformancePointDto[];

  @ApiProperty({ example: 87.5 })
  averageScore: number;

  @ApiProperty({ example: 80 })
  passRate: number;
}

export class StudentDashboardResponseDto {
  @ApiProperty({ type: StudentDashboardPerformanceDto })
  performance: StudentDashboardPerformanceDto;

  @ApiProperty({ type: [StudentDashboardExamResultDto] })
  completedExams: StudentDashboardExamResultDto[];
}
