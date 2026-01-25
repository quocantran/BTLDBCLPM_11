import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ExamStatusTransition {
  Active = 'active',
  Completed = 'completed',
}

export class UpdateExamStatusDto {
  @ApiProperty({ enum: ExamStatusTransition })
  @IsEnum(ExamStatusTransition)
  status: ExamStatusTransition;
}
