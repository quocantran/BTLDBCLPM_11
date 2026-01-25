import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExamStatus {
  Scheduled = 'scheduled',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

class CreateExamChoiceDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  isCorrect?: boolean;
}

export class CreateExamQuestionDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  answerQuestion: number;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateExamChoiceDto)
  answer: CreateExamChoiceDto[];
}

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsMongoId()
  courseId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExamQuestionDto)
  questions: CreateExamQuestionDto[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rateScore: number;
}
