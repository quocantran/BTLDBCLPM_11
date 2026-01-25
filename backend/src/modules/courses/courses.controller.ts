import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateBasicCourseDto, UpdateCourseNameDto } from './dto/course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { ResponseHelper } from '../../common/dto/response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course (teachers only)' })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
    schema: {
      example: {
        success: true,
        data: {
          course: {
            id: '652fd6a7e5a69c0012345678',
            publicId: 'C123456',
            courseName: 'Algebra Basics',
            teacherId: '652fd6a7e5a69c0012344321',
            enrollmentCount: 0,
            createdAt: '2025-10-11T04:20:31.123Z',
            updatedAt: '2025-10-11T04:20:31.123Z',
          },
        },
        message: 'Course created successfully',
      },
    },
  })
  async createCourse(@Body() createCourseDto: CreateBasicCourseDto) {
    const course = await this.coursesService.createCourse(createCourseDto);
    return ResponseHelper.success({ course }, 'Course created successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Get('teacher/:teacherId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List courses created by a teacher' })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID (Mongo ObjectId)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by course name or publicId',
  })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          courses: [
            {
              id: '652fd6a7e5a69c0012345678',
              publicId: 'C123456',
              courseName: 'Algebra Basics',
              teacherId: '652fd6a7e5a69c0012344321',
              enrollmentCount: 42,
              createdAt: '2025-10-11T04:20:31.123Z',
              updatedAt: '2025-10-11T04:20:31.123Z',
              teacherName: 'John Doe',
            },
          ],
        },
        message: 'Courses retrieved successfully',
      },
    },
  })
  async getCoursesByTeacher(
    @Param('teacherId') teacherId: string,
    @Query() query: ListCoursesQueryDto,
  ) {
    const courses = await this.coursesService.getCoursesByTeacher(
      teacherId,
      query,
    );
    return ResponseHelper.success(
      { courses },
      'Courses retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a course by its ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID (Mongo ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'Course deleted successfully',
  })
  async deleteCourse(@Param('courseId') courseId: string) {
    await this.coursesService.deleteCourse(courseId);
    return ResponseHelper.success({}, 'Course deleted successfully');
  }

  /**
   * Update course name endpoint
   * PATCH /courses/:courseId/name
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':courseId/name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update the name of a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID (Mongo ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'Course name updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          course: {
            id: '652fd6a7e5a69c0012345678',
            publicId: 'C123456',
            courseName: 'Updated Course Name',
            teacherId: '652fd6a7e5a69c0012344321',
            enrollmentCount: 42,
            createdAt: '2025-10-11T04:20:31.123Z',
            updatedAt: '2025-10-11T04:20:31.123Z',
            teacherName: 'John Doe',
          },
        },
        message: 'Course name updated successfully',
      },
    },
  })
  async updateCourseName(
    @Param('courseId') courseId: string,
    @Body() updateDto: UpdateCourseNameDto,
  ) {
    const course = await this.coursesService.updateCourseName(
      courseId,
      updateDto,
    );
    return ResponseHelper.success(
      { course },
      'Course name updated successfully',
    );
  }
}
