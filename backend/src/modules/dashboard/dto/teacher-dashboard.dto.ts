import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    example: 12450,
    description: 'Tổng số học viên tham gia các khóa do giáo viên phụ trách',
  })
  totalStudents: number;

  @ApiProperty({ example: 6, description: 'Số bài thi đang diễn ra' })
  activeExams: number;

  @ApiProperty({
    example: 125,
    description: 'Tổng số chứng chỉ đã được cấp phát',
  })
  certificatesIssued: number;
}

export class ExamPerformanceSummaryDto {
  @ApiProperty({
    example: 76.4,
    description: 'Tỉ lệ đạt tổng thể ở dạng phần trăm (0-100)',
  })
  passRate: number;
}

export class ExamPerformanceRecordDto {
  @ApiProperty({ example: 'exam_45', description: 'ID nội bộ của kỳ thi' })
  examId: string;

  @ApiProperty({
    example: 'Physics Midterm',
    description: 'Tên bài thi dùng cho trục X của biểu đồ',
  })
  examName: string;

  @ApiProperty({
    example: '2025-10-12T08:00:00.000Z',
    required: false,
    description: 'Ngày thi phục vụ tooltip hoặc lọc',
  })
  examDate?: string;

  @ApiProperty({ example: 72, description: 'Số học viên đạt' })
  passCount: number;

  @ApiProperty({ example: 18, description: 'Số học viên không đạt' })
  failCount: number;
}

export class ExamPerformanceDto {
  @ApiProperty({ type: ExamPerformanceSummaryDto })
  summary: ExamPerformanceSummaryDto;

  @ApiProperty({ type: [ExamPerformanceRecordDto] })
  records: ExamPerformanceRecordDto[];
}

export class ActiveExamDto {
  @ApiProperty({
    example: 'EX-2025-03',
    description: 'Mã hiển thị ngắn gọn trong UI',
  })
  publicId: string;

  @ApiProperty({
    enum: ['scheduled', 'active', 'completed'],
    example: 'active',
    description: 'Trạng thái đã normalize của bài thi',
  })
  status: 'scheduled' | 'active' | 'completed';

  @ApiProperty({
    example: '2025-11-05T08:00:00.000Z',
    description: 'Thời gian bắt đầu ở dạng ISO string',
  })
  startTime: string;
}

export class TeacherDashboardResponseDto {
  @ApiProperty({ type: DashboardStatsDto })
  stats: DashboardStatsDto;

  @ApiProperty({ type: ExamPerformanceDto })
  examPerformance: ExamPerformanceDto;

  @ApiProperty({ type: [ActiveExamDto] })
  activeExams: ActiveExamDto[];
}
