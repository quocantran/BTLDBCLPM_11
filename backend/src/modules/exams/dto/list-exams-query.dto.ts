import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsMongoId,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ExamStatusFilter {
  All = 'all',
  Scheduled = 'scheduled',
  Active = 'active',
  Completed = 'completed',
}

export class ListExamsQueryDto {
  @ApiPropertyOptional({
    description: 'Search by exam publicId or title',
    example: 'E123456',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by exam status',
    enum: ExamStatusFilter,
    default: ExamStatusFilter.All,
  })
  @IsOptional()
  @IsEnum(ExamStatusFilter)
  status?: ExamStatusFilter = ExamStatusFilter.All;

  /**
   * Filter exams by course ID
   * When 'all' is passed, no course filter is applied (shows all courses)
   */
  @ApiPropertyOptional({
    description:
      'Filter by course ID. Use "all" to show exams from all courses.',
    example: '652fd6a7e5a69c0012345678',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
