import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Course, CourseDocument } from '../../database/schemas/course.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  Enrollment,
  EnrollmentDocument,
} from '../../database/schemas/enrollment.schema';
import {
  CreateBasicCourseDto,
  CourseBasicResponseDto,
  UpdateCourseNameDto,
} from './dto/course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { generatePrefixedPublicId } from '../../common/utils/public-id.util';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  async createCourse(
    createCourseDto: CreateBasicCourseDto,
  ): Promise<CourseBasicResponseDto> {
    const { courseName, teacherId } = createCourseDto;

    const teacher = await this.userModel.findById(teacherId);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.role !== 'teacher') {
      throw new ForbiddenException('Only teachers can create courses');
    }

    const publicId = await generatePrefixedPublicId('C', this.courseModel);
    const course = new this.courseModel({
      courseName,
      teacherId: new Types.ObjectId(teacherId),
      publicId,
    });

    const savedCourse = await course.save();
    return this.mapCourse(savedCourse, 0, teacher.fullName);
  }

  async deleteCourse(courseId: string): Promise<void> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    await this.courseModel.deleteOne({ _id: courseId });
  }

  /**
   * Update course name
   * @param courseId - The ID of the course to update
   * @param updateDto - The DTO containing the new course name
   * @returns Updated course data
   */
  async updateCourseName(
    courseId: string,
    updateDto: UpdateCourseNameDto,
  ): Promise<CourseBasicResponseDto> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Update course name
    course.courseName = updateDto.courseName;
    const updatedCourse = await course.save();

    // Get teacher name for response
    const teacher = await this.userModel.findById(updatedCourse.teacherId);

    // Get enrollment count
    const enrollmentCount = await this.enrollmentModel.countDocuments({
      courseId: updatedCourse._id,
    });

    return this.mapCourse(updatedCourse, enrollmentCount, teacher?.fullName);
  }

  async getCoursesByTeacher(
    teacherId: string,
    queryDto?: ListCoursesQueryDto,
  ): Promise<CourseBasicResponseDto[]> {
    const teacher = await this.userModel.findById(teacherId);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.role !== 'teacher') {
      throw new ForbiddenException('Only teachers can have courses');
    }

    const { search = '' } = queryDto ?? {};

    // Build query filter
    const filter: FilterQuery<CourseDocument> = {
      teacherId: new Types.ObjectId(teacherId),
    };

    // Apply search filter if provided
    if (search) {
      filter.$or = [
        { courseName: { $regex: search, $options: 'i' } },
        { publicId: { $regex: search, $options: 'i' } },
      ];
    }

    const courses = await this.courseModel.find(filter).sort({ createdAt: -1 });

    const courseIds = courses.map((course) => course._id);
    const enrollmentCounts = await this.enrollmentModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ]);

    const countMap = enrollmentCounts.reduce<Record<string, number>>(
      (acc, { _id, count }) => {
        acc[String(_id)] = count;
        return acc;
      },
      {},
    );

    return courses.map((course) =>
      this.mapCourse(
        course,
        countMap[String(course._id)] ?? 0,
        teacher.fullName,
      ),
    );
  }

  private mapCourse(
    course: CourseDocument,
    enrollmentCount: number,
    teacherName?: string,
  ): CourseBasicResponseDto {
    return {
      id: String(course._id),
      publicId: course.publicId,
      courseName: course.courseName,
      teacherId: String(course.teacherId),
      enrollmentCount,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      teacherName,
    };
  }
}
