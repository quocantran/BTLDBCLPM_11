import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  IsMongoId,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CourseMaterialDto {
  @ApiProperty({
    enum: ['document', 'video', 'link', 'image'],
    description: 'Type of the material',
  })
  @IsEnum(['document', 'video', 'link', 'image'])
  type: 'document' | 'video' | 'link' | 'image';

  @ApiProperty({ description: 'Title of the material' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'URL or path to the material' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Description of the material' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CourseModuleDto {
  @ApiProperty({ description: 'Title of the module' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the module' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Order of the module in the course' })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiPropertyOptional({
    type: [CourseMaterialDto],
    description: 'Materials in this module',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseMaterialDto)
  materials?: CourseMaterialDto[];
}

export class CourseSettingsDto {
  @ApiPropertyOptional({
    description: 'Maximum number of students (null for unlimited)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStudents?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of prerequisite course IDs',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Tags associated with the course',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: ['beginner', 'intermediate', 'advanced'],
    description: 'Difficulty level of the course',
  })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export class CreateCourseDto {
  @ApiProperty({ description: 'Title of the course' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  title: string;

  @ApiProperty({ description: 'Description of the course' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Unique course code (e.g., CS101)' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code: string;

  @ApiProperty({ description: 'Number of credits for the course' })
  @IsNumber()
  @Min(0)
  credits: number;

  @ApiPropertyOptional({ description: 'Course start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Course end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    type: [CourseModuleDto],
    description: 'Course modules',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseModuleDto)
  modules?: CourseModuleDto[];

  @ApiPropertyOptional({
    type: CourseSettingsDto,
    description: 'Course settings',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseSettingsDto)
  settings?: CourseSettingsDto;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @ApiPropertyOptional({
    enum: ['draft', 'active', 'archived', 'suspended'],
    description: 'Status of the course',
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'archived', 'suspended'])
  status?: 'draft' | 'active' | 'archived' | 'suspended';
}

export class CourseResponseDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Public course identifier', example: 'C123456' })
  publicId: string;

  @ApiProperty({ description: 'Title of the course' })
  title: string;

  @ApiProperty({ description: 'Description of the course' })
  description: string;

  @ApiProperty({ description: 'Course code' })
  code: string;

  @ApiProperty({ description: 'Instructor information' })
  instructor: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };

  @ApiProperty({ description: 'Number of credits' })
  credits: number;

  @ApiProperty({
    enum: ['draft', 'active', 'archived', 'suspended'],
    description: 'Course status',
  })
  status: string;

  @ApiPropertyOptional({ description: 'Course start date' })
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Course end date' })
  endDate?: Date;

  @ApiProperty({ description: 'Number of enrolled students' })
  enrolledStudentsCount: number;

  @ApiProperty({ description: 'Course modules' })
  modules: CourseModuleDto[];

  @ApiProperty({ description: 'Course settings' })
  settings: CourseSettingsDto;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class EnrollStudentDto {
  @ApiProperty({ description: 'Student ID to enroll' })
  @IsMongoId()
  studentId: string;
}

export class CreateBasicCourseDto {
  @ApiProperty({ description: 'Name of the course' })
  @IsString()
  @IsNotEmpty()
  courseName: string;

  @ApiProperty({
    description: 'Teacher ID (must belong to a user with teacher role)',
  })
  @IsMongoId()
  teacherId: string;
}

export class CourseBasicResponseDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Public course identifier', example: 'C123456' })
  publicId: string;

  @ApiProperty({ description: 'Name of the course' })
  courseName: string;

  @ApiProperty({ description: 'Teacher ID associated with the course' })
  teacherId: string;

  @ApiPropertyOptional({ description: 'Teacher name' })
  teacherName?: string;

  @ApiProperty({ description: 'Number of enrollments for the course' })
  enrollmentCount: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

/**
 * DTO for updating course name
 * Only allows updating the course name field
 */
export class UpdateCourseNameDto {
  @ApiProperty({ description: 'New name for the course' })
  @IsString()
  @IsNotEmpty()
  courseName: string;
}
