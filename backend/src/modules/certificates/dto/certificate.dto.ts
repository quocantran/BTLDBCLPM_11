import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

export class IssueCertificateDto {
  @ApiProperty({
    description: 'Student ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  studentId: string;

  @ApiProperty({
    description: 'Exam ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  examId: string;
}

export class RevokeCertificateDto {
  @ApiPropertyOptional({ description: 'Reason for revocation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Blockchain transaction hash for revocation',
  })
  @IsOptional()
  @IsString()
  transactionHash?: string;
}

export class CertificatesQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'issued', 'revoked'] })
  @IsOptional()
  @IsEnum(['pending', 'issued', 'revoked'])
  status?: 'pending' | 'issued' | 'revoked';

  @ApiPropertyOptional({ description: 'Filter by student ID' })
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsMongoId()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by teacher ID (via course.teacherId)',
  })
  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Filter by course name (partial match)' })
  @IsOptional()
  @IsString()
  courseName?: string;

  @ApiPropertyOptional({ description: 'Issued from date (ISO string)' })
  @IsOptional()
  @IsString()
  issuedFrom?: string;

  @ApiPropertyOptional({ description: 'Issued to date (ISO string)' })
  @IsOptional()
  @IsString()
  issuedTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
