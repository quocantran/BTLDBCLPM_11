import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamSummaryDto {
  @ApiProperty({
    description: 'Unique identifier of the exam',
    example: '652fd6a7e5a69c0012345678',
  })
  id: string;

  @ApiProperty({
    description: 'Public exam identifier',
    example: 'E123456',
  })
  publicId: string;

  @ApiProperty({
    description: 'Title of the exam',
    example: 'Midterm Exam',
  })
  title?: string;

  @ApiProperty({
    description: 'Current status of the exam',
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    example: 'active',
  })
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';

  @ApiProperty({
    description: 'Date and time when the exam begins',
    example: '2025-11-12T01:00:00.000Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'Date and time when the exam ends',
    example: '2025-11-12T02:30:00.000Z',
  })
  endTime: Date;

  /**
   * Course ID associated with the exam
   */
  @ApiPropertyOptional({
    description: 'Course ID associated with this exam',
    example: '652fd6a7e5a69c0012345678',
  })
  courseId?: string;

  /**
   * Course name for display purposes
   */
  @ApiPropertyOptional({
    description: 'Name of the course associated with this exam',
    example: 'Algebra Basics',
  })
  courseName?: string;
}
