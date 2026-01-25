// src/modules/exams/dto/completed-exam.dto.ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO trả về cho mỗi card trong tab "Completed"
 */
export class CompletedExamResponseDto {
  @ApiProperty()
  submissionId: string;

  @ApiProperty()
  examPublicId: string;

  @ApiProperty()
  examTitle: string;

  @ApiProperty()
  courseName: string;

  @ApiProperty({ description: 'Score (0-100)' })
  score: number;

  @ApiProperty({ example: 'Passed' })
  result: 'Passed' | 'Failed';

  @ApiProperty()
  submittedAt: Date;
}