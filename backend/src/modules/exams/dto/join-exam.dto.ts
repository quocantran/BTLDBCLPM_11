// src/modules/exams/dto/join-exam.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class JoinExamDto {
  @ApiProperty({
    description: 'The unique public-facing code for the exam (e.g., "E123456")',
    example: 'E123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^E\d{6}$/, {
    message: 'Exam code must be in the format "E" followed by 6 digits.',
  })
  publicId: string;
}