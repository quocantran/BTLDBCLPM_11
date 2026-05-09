import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { CoursesService } from 'src/modules/courses/courses.service';
import { Course } from 'src/database/schemas/course.schema';
import { User } from 'src/database/schemas/user.schema';
import { Enrollment } from 'src/database/schemas/enrollment.schema';

// Mock generatePrefixedPublicId
jest.mock('src/common/utils/public-id.util', () => ({
  generatePrefixedPublicId: jest.fn().mockResolvedValue('C123456'),
}));

describe('TestCourseService - CoursesService business logic', () => {
  let service: CoursesService;
  let courseModel: any;
  let userModel: any;
  let enrollmentModel: any;

  const TEACHER_ID = '507f1f77bcf86cd799439011';
  const COURSE_ID = '507f1f77bcf86cd799439022';
  const STUDENT_ID = '507f1f77bcf86cd799439033';

  const createMockTeacher = (overrides: Partial<any> = {}) => ({
    _id: TEACHER_ID,
    username: 'teacher01',
    email: 'teacher01@test.com',
    fullName: 'Teacher One',
    role: 'teacher',
    ...overrides,
  });

  const createMockCourse = (overrides: Partial<any> = {}) => ({
    _id: COURSE_ID,
    publicId: 'C123456',
    courseName: 'Lập trình Python cơ bản',
    teacherId: new Types.ObjectId(TEACHER_ID),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    save: jest.fn().mockImplementation(function (this: any) { return Promise.resolve(this); }),
    ...overrides,
  });

  beforeAll(async () => {
    const mockCourseModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: COURSE_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockImplementation(function (this: any) { return Promise.resolve(this); }),
    }));
    mockCourseModel.findById = jest.fn();
    mockCourseModel.find = jest.fn();
    mockCourseModel.findOne = jest.fn();
    mockCourseModel.deleteOne = jest.fn();
    mockCourseModel.exists = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getModelToken(Course.name), useValue: mockCourseModel },
        { provide: getModelToken(User.name), useValue: { findById: jest.fn() } },
        {
          provide: getModelToken(Enrollment.name),
          useValue: {
            countDocuments: jest.fn().mockResolvedValue(0),
            aggregate: jest.fn().mockResolvedValue([]),
            deleteMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    courseModel = module.get(getModelToken(Course.name));
    userModel = module.get(getModelToken(User.name));
    enrollmentModel = module.get(getModelToken(Enrollment.name));
  });

  beforeEach(() => jest.clearAllMocks());

  // ==================== CREATE COURSE ====================

  it('MC-001 — should_create_course_successfully_with_valid_data', async () => {
    // MC-001: Tạo khóa học thành công (MC-01-050).
    // Mô tả: Teacher hợp lệ tạo course với tên hợp lệ → lưu DB, sinh publicId.
    // Expected: Trả CourseBasicResponseDto với publicId dạng C + 6 số.
    userModel.findById.mockResolvedValue(createMockTeacher());

    const result = await service.createCourse({
      courseName: 'Lập trình Python cơ bản',
      teacherId: TEACHER_ID,
    });

    expect(result.courseName).toBe('Lập trình Python cơ bản');
    expect(result.publicId).toMatch(/^C\d{6}$/);
    expect(result.enrollmentCount).toBe(0);
  });

  it('MC-002 — should_throw_not_found_when_teacher_does_not_exist', async () => {
    // MC-002: teacherId không tồn tại → 404 (MC-01-053).
    // Mô tả: Kiểm tra nhánh teacher == null.
    // Expected: NotFoundException('Teacher not found').
    userModel.findById.mockResolvedValue(null);

    await expect(
      service.createCourse({ courseName: 'Test', teacherId: '000000000000000000000000' }),
    ).rejects.toThrow('Teacher not found');
  });

  it('MC-003 — should_throw_forbidden_when_student_tries_to_create_course', async () => {
    // MC-003: Student gọi API tạo khóa học → 403 (MC-01-054 Fail).
    // Mô tả: Kiểm tra role !== 'teacher' → ForbiddenException.
    // Expected: ForbiddenException('Only teachers can create courses').
    userModel.findById.mockResolvedValue(createMockTeacher({ role: 'student', _id: STUDENT_ID }));

    await expect(
      service.createCourse({ courseName: 'Hacked Course', teacherId: STUDENT_ID }),
    ).rejects.toThrow('Only teachers can create courses');
  });

  it('MC-004 — should_reject_course_name_shorter_than_6_chars', async () => {
    // MC-004: Tạo course tên < 6 ký tự → PHẢI bị reject (MC-01-046 Fail).
    // Mô tả: Theo nghiệp vụ tên khóa học >= 6 ký tự, backend nên validate.
    // Expected: Throw BadRequestException vì tên quá ngắn.
    userModel.findById.mockResolvedValue(createMockTeacher());

    await expect(
      service.createCourse({ courseName: 'ABC', teacherId: TEACHER_ID }),
    ).rejects.toThrow();
  });

  it('MC-005 — should_reject_course_name_over_100_chars', async () => {
    // MC-005: Tạo course tên > 100 ký tự → PHẢI bị reject (MC-01-047 Fail).
    // Mô tả: Theo nghiệp vụ tên khóa học <= 100 ký tự, backend nên validate.
    // Expected: Throw BadRequestException vì tên quá dài.
    userModel.findById.mockResolvedValue(createMockTeacher());
    const longName = 'A'.repeat(250);

    await expect(
      service.createCourse({ courseName: longName, teacherId: TEACHER_ID }),
    ).rejects.toThrow();
  });

  it('MC-006 — should_verify_caller_matches_teacherId_preventing_impersonation', async () => {
    // MC-006: Teacher A tạo course với teacherId của Teacher B → PHẢI bị chặn (MC-01-055 Fail).
    // Mô tả: createCourse nên verify caller userId === teacherId từ body.
    // Expected: ForbiddenException vì caller không phải teacher B.
    const teacherB = createMockTeacher({ _id: '607f1f77bcf86cd799439099', fullName: 'Teacher B' });
    userModel.findById.mockResolvedValue(teacherB);

    // Đây PHẢI throw vì caller (teacher A) giả mạo teacherId (teacher B)
    await expect(
      service.createCourse({ courseName: 'Spoofed Course', teacherId: '607f1f77bcf86cd799439099' }),
    ).rejects.toThrow();
  });

  it('MC-007 — should_reject_duplicate_course_name', async () => {
    // MC-007: Tạo course trùng tên → PHẢI bị reject (MC-01-049 Fail).
    // Mô tả: Theo nghiệp vụ tên khóa học phải unique.
    // Expected: ConflictException('Tên khóa học đã tồn tại').
    userModel.findById.mockResolvedValue(createMockTeacher());
    courseModel.findOne.mockResolvedValue(createMockCourse());

    await expect(
      service.createCourse({ courseName: 'Lập trình Python cơ bản', teacherId: TEACHER_ID }),
    ).rejects.toThrow();
  });

  // ==================== GET COURSES BY TEACHER ====================

  it('MC-008 — should_return_courses_list_for_valid_teacher', async () => {
    // MC-008: Lấy danh sách khóa học cho teacher hợp lệ (MC-01-014).
    // Mô tả: Kiểm tra getCoursesByTeacher trả đúng cấu trúc với enrollmentCount.
    // Expected: Trả array CourseBasicResponseDto, sort by createdAt desc.
    const mockCourses = [createMockCourse()];
    userModel.findById.mockResolvedValue(createMockTeacher());
    courseModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockCourses) });
    enrollmentModel.aggregate.mockResolvedValue([{ _id: new Types.ObjectId(COURSE_ID), count: 5 }]);

    const result = await service.getCoursesByTeacher(TEACHER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].courseName).toBe('Lập trình Python cơ bản');
    expect(result[0].enrollmentCount).toBe(5);
    expect(result[0].teacherName).toBe('Teacher One');
  });

  it('MC-009 — should_throw_not_found_when_teacher_not_exist', async () => {
    // MC-009: Teacher không tồn tại khi lấy danh sách.
    // Mô tả: Kiểm tra nhánh teacher == null.
    // Expected: NotFoundException('Teacher not found').
    userModel.findById.mockResolvedValue(null);

    await expect(
      service.getCoursesByTeacher('nonexistent-id'),
    ).rejects.toThrow('Teacher not found');
  });

  it('MC-010 — should_throw_forbidden_when_student_lists_courses', async () => {
    // MC-010: Student gọi API lấy danh sách courses.
    // Mô tả: Kiểm tra role !== 'teacher' → ForbiddenException.
    // Expected: ForbiddenException('Only teachers can have courses').
    userModel.findById.mockResolvedValue(createMockTeacher({ role: 'student' }));

    await expect(
      service.getCoursesByTeacher(STUDENT_ID),
    ).rejects.toThrow('Only teachers can have courses');
  });

  it('MC-011 — should_filter_courses_by_search_keyword', async () => {
    // MC-011: Tìm khóa học bằng từ khóa (MC-01-009).
    // Mô tả: Kiểm tra search query tạo $regex filter đúng.
    // Expected: courseModel.find gọi với $or regex filter.
    userModel.findById.mockResolvedValue(createMockTeacher());
    courseModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    enrollmentModel.aggregate.mockResolvedValue([]);

    await service.getCoursesByTeacher(TEACHER_ID, { search: 'Python' });

    const filterArg = courseModel.find.mock.calls[0][0];
    expect(filterArg.$or).toBeDefined();
    expect(filterArg.$or[0].courseName.$regex).toBe('Python');
  });

  it('MC-012 — should_reject_backslash_search_with_bad_request', async () => {
    // MC-012: Tìm khóa học bằng ký tự '\' → phải trả BadRequestException (400).
    // Mô tả: Backend dùng raw search trong $regex, backslash gây regex parse error.
    // Expected: Expected: BadRequestException — nhưng hiện tại code crash 500 → BUG.
    userModel.findById.mockResolvedValue(createMockTeacher());
    courseModel.find.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('Invalid regular expression')),
    });

    await expect(
      service.getCoursesByTeacher(TEACHER_ID, { search: '\\' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('MC-013 — should_return_empty_array_when_no_courses', async () => {
    // MC-013: Teacher chưa có khóa học (MC-01-015).
    // Mô tả: Kiểm tra trả array rỗng khi không có courses.
    // Expected: Trả [] (empty array).
    userModel.findById.mockResolvedValue(createMockTeacher());
    courseModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    enrollmentModel.aggregate.mockResolvedValue([]);

    const result = await service.getCoursesByTeacher(TEACHER_ID);

    expect(result).toEqual([]);
  });

  it('MC-014 — should_return_zero_enrollment_when_course_has_no_students', async () => {
    // MC-014: Course không có student nào enroll.
    // Mô tả: Kiểm tra countMap fallback ?? 0 khi aggregate trả [].
    // Expected: enrollmentCount = 0.
    userModel.findById.mockResolvedValue(createMockTeacher());
    courseModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([createMockCourse()]) });
    enrollmentModel.aggregate.mockResolvedValue([]);

    const result = await service.getCoursesByTeacher(TEACHER_ID);

    expect(result[0].enrollmentCount).toBe(0);
  });

  // ==================== DELETE COURSE ====================

  it('MC-015 — should_delete_course_successfully', async () => {
    // MC-015: Xóa khóa học thành công (MC-01-063).
    // Mô tả: Kiểm tra findById + deleteOne gọi đúng.
    // Expected: courseModel.deleteOne gọi với courseId.
    courseModel.findById.mockResolvedValue(createMockCourse());
    courseModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await service.deleteCourse(COURSE_ID);

    expect(courseModel.deleteOne).toHaveBeenCalledWith({ _id: COURSE_ID });
  });

  it('MC-016 — should_throw_not_found_when_deleting_nonexistent_course', async () => {
    // MC-016: Xóa course không tồn tại.
    // Mô tả: Kiểm tra nhánh course == null.
    // Expected: NotFoundException('Course not found').
    courseModel.findById.mockResolvedValue(null);

    await expect(
      service.deleteCourse('nonexistent-id'),
    ).rejects.toThrow('Course not found');
  });

  it('MC-017 — should_cascade_delete_enrollments_when_deleting_course', async () => {
    // MC-017: Xóa course PHẢI xóa enrollments liên quan (MC-01-067 Fail).
    // Mô tả: Theo nghiệp vụ xóa course phải xóa enrollments/exams/submissions.
    // Expected: enrollmentModel.deleteMany gọi với courseId.
    courseModel.findById.mockResolvedValue(createMockCourse());
    courseModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await service.deleteCourse(COURSE_ID);

    // CHECKDB: phải gọi deleteMany cho dữ liệu liên quan
    expect(enrollmentModel.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: expect.anything() }),
    );
  });

  it('MC-018 — should_check_ownership_when_deleting_course', async () => {
    // MC-018: Bất kỳ user nào xóa course phải là owner (MC-01-064 Fail).
    // Mô tả: deleteCourse nên verify caller === course.teacherId.
    // Expected: ForbiddenException khi caller không phải owner.
    const courseOfTeacherB = createMockCourse({
      teacherId: new Types.ObjectId('607f1f77bcf86cd799439099'),
    });
    courseModel.findById.mockResolvedValue(courseOfTeacherB);

    // Caller là Teacher A (TEACHER_ID) nhưng course thuộc Teacher B → phải reject
    await expect(
      service.deleteCourse(COURSE_ID),
    ).rejects.toThrow();
  });

  // ==================== UPDATE COURSE NAME ====================

  it('MC-019 — should_update_course_name_successfully', async () => {
    // MC-019: Cập nhật tên khóa học thành công (MC-01-034).
    // Mô tả: Kiểm tra course.courseName được update và save.
    // Expected: Trả course với tên mới.
    const mockCourse = createMockCourse();
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(createMockTeacher());
    enrollmentModel.countDocuments.mockResolvedValue(5);

    const result = await service.updateCourseName(COURSE_ID, {
      courseName: 'Updated Course Name',
    });

    expect(result.courseName).toBe('Updated Course Name');
    expect(result.enrollmentCount).toBe(5);
    expect(result.teacherName).toBe('Teacher One');
  });

  it('MC-020 — should_throw_not_found_when_updating_nonexistent_course', async () => {
    // MC-020: Cập nhật course không tồn tại.
    // Mô tả: Kiểm tra nhánh course == null.
    // Expected: NotFoundException('Course not found').
    courseModel.findById.mockResolvedValue(null);

    await expect(
      service.updateCourseName('nonexistent', { courseName: 'New Name' }),
    ).rejects.toThrow('Course not found');
  });

  it('MC-021 — should_check_ownership_when_updating_course_name', async () => {
    // MC-021: Teacher A cập nhật course của Teacher B → PHẢI bị chặn (MC-01-036 Fail).
    // Mô tả: updateCourseName nên verify caller === course.teacherId.
    // Expected: ForbiddenException vì caller không phải owner.
    const courseOfTeacherB = createMockCourse({
      teacherId: new Types.ObjectId('607f1f77bcf86cd799439099'),
    });
    courseModel.findById.mockResolvedValue(courseOfTeacherB);

    await expect(
      service.updateCourseName(COURSE_ID, { courseName: 'Hacked Name' }),
    ).rejects.toThrow();
  });

  it('MC-022 — should_reject_duplicate_name_on_update', async () => {
    // MC-022: Cập nhật tên trùng course khác → PHẢI bị reject (MC-01-037 Fail).
    // Mô tả: updateCourseName nên kiểm tra courseName unique.
    // Expected: ConflictException vì tên đã tồn tại.
    const mockCourse = createMockCourse();
    courseModel.findById.mockResolvedValue(mockCourse);
    courseModel.findOne.mockResolvedValue(createMockCourse({ _id: 'other-course-id-000000000' }));

    await expect(
      service.updateCourseName(COURSE_ID, { courseName: 'Existing Course Name' }),
    ).rejects.toThrow();
  });

  it('MC-023 — should_handle_teacher_deleted_after_course_created', async () => {
    // MC-023: Teacher bị xóa sau khi tạo course, update → teacherName undefined.
    // Mô tả: Kiểm tra nhánh teacher == null trong mapCourse.
    // Expected: teacherName undefined, không crash.
    const mockCourse = createMockCourse();
    courseModel.findById.mockResolvedValue(mockCourse);
    userModel.findById.mockResolvedValue(null);
    enrollmentModel.countDocuments.mockResolvedValue(0);

    const result = await service.updateCourseName(COURSE_ID, {
      courseName: 'Orphan Course',
    });

    expect(result.teacherName).toBeUndefined();
  });

  it('MC-024 — should_reject_special_chars_in_course_name', async () => {
    // MC-024: Tên khóa học chứa ký tự đặc biệt → PHẢI bị reject (MC-01-048 Fail).
    // Mô tả: Theo nghiệp vụ, tên chỉ được chữ cái, số, khoảng trắng.
    // Expected: Throw BadRequestException vì chứa @#$%.
    userModel.findById.mockResolvedValue(createMockTeacher());

    await expect(
      service.createCourse({ courseName: 'Khóa học @#$%', teacherId: TEACHER_ID }),
    ).rejects.toThrow();
  });

  it('MC-025 — should_paginate_courses_list', async () => {
    // MC-025: getCoursesByTeacher trả toàn bộ courses, thiếu pagination (MC-01-008 Fail).
    // Mô tả: Theo nghiệp vụ, danh sách phải phân trang khi dữ liệu lớn.
    // Expected: getCoursesByTeacher nhận page/limit params và trả kết quả phân trang.
    userModel.findById.mockResolvedValue(createMockTeacher());
    const manyCourses = Array.from({ length: 100 }, (_, i) =>
      createMockCourse({ _id: `507f1f77bcf86cd79943${String(i).padStart(4, '0')}`, courseName: `Course ${i}` }),
    );
    courseModel.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(manyCourses) });
    enrollmentModel.aggregate.mockResolvedValue([]);

    const result = await service.getCoursesByTeacher(TEACHER_ID, { search: '' });

    // Nếu trả hết 100 → BUG: thiếu pagination
    expect(result.length).toBeLessThanOrEqual(20);
  });
});
