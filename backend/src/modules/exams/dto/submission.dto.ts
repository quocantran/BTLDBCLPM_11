// src/modules/exams/dto/submission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO cho một câu trả lời của student
 * (Khớp với `Answer` schema)
 */
export class SubmitExamAnswerDto {
  @ApiProperty({ description: 'Question ObjectId', example: '60c72b2f9b1d8c001f8e4a9e' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'Selected answer number (1-4)', example: 3 })
  @IsNumber()
  @Min(1)
  @Max(4)
  answerNumber: number;
}

/**
 * DTO cho body của request nộp bài
 */
export class SubmitExamDto {
  @ApiProperty({ type: [SubmitExamAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitExamAnswerDto)
  answers: SubmitExamAnswerDto[];
}

/**
 * DTO trả về kết quả sau khi nộp bài
 * (Khớp với design trang kết quả)
 */
export class SubmissionResultDto {
  @ApiProperty({ example: 'Advanced Calculus Final' })
  examTitle: string;

  @ApiProperty({ example: 'Mathematics 201' })
  courseName: string;

  @ApiProperty({ example: '2025-05-15T12:00:00.000Z' })
  dateTaken: Date;

  @ApiProperty({ example: 20 })
  totalQuestions: number;

  @ApiProperty({ example: 17 })
  correctAnswers: number;

  @ApiProperty({ example: 85 })
  score: number; // Điểm số % (0-100)

  @ApiProperty({ example: 'Passed' })
  result: 'Passed' | 'Failed';

  // ID của submission để sau này xem lại
  @ApiProperty({ example: '60c72b2f9b1d8c001f8e4a9f' })
  submissionId: string;
}
