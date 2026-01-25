import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cho một kết quả thi của một học sinh
 */
export class ExamResultDto {
  @ApiProperty({
    description: 'Submission ID (MongoDB ObjectId)',
    example: '652fd6a7e5a69c0012345600',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Student ID (MongoDB ObjectId)',
    example: '652fd6a7e5a69c0012345678',
  })
  studentId: string;

  @ApiProperty({
    description: 'Tên đầy đủ của học sinh',
    example: 'Nguyễn Văn A',
  })
  studentName: string;

  @ApiProperty({
    description: 'Mã số học sinh (username)',
    example: 'SV001',
  })
  studentCode: string;

  @ApiProperty({
    description: 'Điểm số đạt được (0-100)',
    example: 85.5,
  })
  grade: number;

  @ApiProperty({
    description: 'Điểm tối đa',
    example: 100,
  })
  maxGrade: number;

  @ApiProperty({
    description: 'Trạng thái đậu/rớt',
    enum: ['pass', 'fail'],
    example: 'pass',
  })
  status: 'pass' | 'fail';
}

/**
 * DTO cho thông tin exam trong kết quả
 */
export class ExamInfoDto {
  @ApiProperty({
    description: 'Tiêu đề bài thi',
    example: 'Midterm Exam',
  })
  title: string;

  @ApiProperty({
    description: 'Trạng thái bài thi',
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    example: 'completed',
  })
  status: string;
}

/**
 * DTO cho response của API lấy kết quả thi
 */
export class ExamResultsResponseDto {
  @ApiProperty({ type: ExamInfoDto })
  exam: ExamInfoDto;

  @ApiProperty({ type: [ExamResultDto] })
  results: ExamResultDto[];
}
