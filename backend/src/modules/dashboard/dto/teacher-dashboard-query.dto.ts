import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class TeacherDashboardQueryDto {
  @ApiProperty({
    description: 'ID của giáo viên (Mongo ObjectId)',
    example: '652fd6a7e5a69c0012344321',
  })
  @IsMongoId()
  teacherId: string;
}
