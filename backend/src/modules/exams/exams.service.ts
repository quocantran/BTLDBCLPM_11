/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Exam, ExamDocument } from '../../database/schemas/exam.schema';
import {
  Question,
  QuestionDocument,
} from '../../database/schemas/question.schema';
import { Course, CourseDocument } from '../../database/schemas/course.schema';
import { CreateExamDto, CreateExamQuestionDto } from './dto/create-exam.dto';
import { UpdateExamDto, UpdateExamQuestionDto } from './dto/update-exam.dto';
import {
  ExamResponseDto,
  JoinExamResponseDto,
  TakeExamResponseDto,
  ExamWithPopulatedQuestions,
  ExamWithPopulatedRelations,
} from './dto/exam-response.dto';
import { ExamSummaryDto } from './dto/exam-summary.dto';
import { IUser } from '../../common/interfaces';
import { generatePrefixedPublicId } from '../../common/utils/public-id.util';
import { computeExamStatus } from '../../common/utils/exam.util';

import { JoinExamDto } from './dto/join-exam.dto';
import { log } from 'console';
import {
  Submission,
  SubmissionDocument,
} from 'src/database/schemas/submission.schema';
import { SubmitExamDto, SubmissionResultDto } from './dto/submission.dto';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { ExamResultsResponseDto, ExamResultDto } from './dto/exam-results.dto';
import { CompletedExamResponseDto } from './dto/completed-exam.dto';
import { ExamResultDetailDto } from './dto/exam-result-detail.dto';
import { ExamStatusTransition } from './dto/update-exam-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ExamStatusFilter,
  ListExamsQueryDto,
} from './dto/list-exams-query.dto';
import { PaginationDto } from '../../common/dto/response.dto';
import { create } from 'axios';

type SubmissionWithExam = SubmissionDocument & {
  examId: ExamDocument & {
    courseId: CourseDocument;
    questions: QuestionDocument[];
  };
  studentId: Types.ObjectId | UserDocument;
};

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @InjectModel(Exam.name)
    private readonly examModel: Model<ExamDocument>,
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectConnection()
    private readonly connection: Connection,

    // @InjectModel(Enrollment.name)
    // private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createExam(
    createExamDto: CreateExamDto,
    teacher: IUser,
  ): Promise<ExamResponseDto> {
    if (!teacher?.id) {
      throw new ForbiddenException('Missing teacher context');
    }

    if (!Types.ObjectId.isValid(teacher.id)) {
      throw new ForbiddenException('Invalid teacher identifier');
    }

    const startTime = new Date(createExamDto.startTime);
    const endTime = new Date(createExamDto.endTime);

    this.ensureValidDates(startTime, endTime);
    this.ensureDurationWithinWindow(
      startTime,
      endTime,
      createExamDto.durationMinutes,
    );

    if (!Types.ObjectId.isValid(createExamDto.courseId)) {
      throw new BadRequestException('Invalid courseId');
    }

    const courseObjectId = new Types.ObjectId(createExamDto.courseId);

    const course = await this.courseModel.findById(courseObjectId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (String(course.teacherId) !== teacher.id) {
      throw new ForbiddenException(
        'You can only create exams for your courses',
      );
    }

    const teacherObjectId = new Types.ObjectId(teacher.id);
    const normalizedQuestions = createExamDto.questions.map(
      (questionDto, index) =>
        this.buildQuestionPayload(
          questionDto,
          courseObjectId,
          teacherObjectId,
          index,
        ),
    );

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const publicId = await generatePrefixedPublicId('E', this.examModel);
      const createdQuestions = await this.questionModel.insertMany(
        normalizedQuestions,
        { session },
      );

      const questionIds = createdQuestions.map((doc) => doc._id);

      const [examDoc] = await this.examModel.create(
        [
          {
            publicId,
            title: createExamDto.title,
            durationMinutes: createExamDto.durationMinutes,
            startTime,
            endTime,
            status: createExamDto.status ?? 'scheduled',
            courseId: courseObjectId,
            questions: questionIds,
            rateScore: createExamDto.rateScore,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      return this.mapExamResponse(examDoc, createdQuestions);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async listExamSummaries(
    teacherId?: string,
    queryDto?: ListExamsQueryDto,
  ): Promise<{ exams: ExamSummaryDto[]; pagination: PaginationDto }> {
    const now = new Date();

    const {
      search = '',
      status = ExamStatusFilter.All,
      courseId,
      page = 1,
      limit = 10,
    } = queryDto ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    // Build list of course IDs to filter by
    let courseIds: Types.ObjectId[] = [];
    let courseMap: Map<string, string> = new Map(); // Map courseId -> courseName

    // If teacherId is provided, filter exams by courses owned by that teacher
    if (teacherId) {
      if (!Types.ObjectId.isValid(teacherId)) {
        throw new BadRequestException('Invalid teacher ID');
      }

      // Find all courses owned by this teacher
      const courses = await this.courseModel
        .find({ teacherId: new Types.ObjectId(teacherId) })
        .select('_id courseName')
        .exec();

      courseIds = courses.map((course) => course._id as Types.ObjectId);

      // Build course name map for response
      courses.forEach((course) => {
        courseMap.set(String(course._id), course.courseName);
      });
    }

    // Apply course filter if specific courseId is provided (not 'all')
    if (courseId && courseId !== 'all') {
      if (!Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException('Invalid course ID');
      }

      const courseObjectId = new Types.ObjectId(courseId);

      // If teacherId was provided, verify the course belongs to teacher
      if (teacherId && !courseIds.some((id) => id.equals(courseObjectId))) {
        // Course doesn't belong to this teacher, return empty result
        return {
          exams: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      // Filter by specific course
      query.courseId = courseObjectId;

      // If we don't have the course name yet, fetch it
      if (!courseMap.has(courseId)) {
        const course = await this.courseModel
          .findById(courseObjectId)
          .select('courseName')
          .exec();
        if (course) {
          courseMap.set(courseId, course.courseName);
        }
      }
    } else if (teacherId) {
      // Filter exams by teacher's courses
      if (courseIds.length > 0) {
        // Teacher has courses, filter by their course IDs
        query.courseId = { $in: courseIds };
      } else {
        // Teacher has no courses, return empty result immediately
        return {
          exams: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    }

    // Apply search filter (publicId or title)
    if (search) {
      query.$or = [
        { publicId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    // Apply status filter
    if (status && status !== ExamStatusFilter.All) {
      query.status = status;
    }

    // Get total count for pagination
    const total = await this.examModel.countDocuments(query).exec();

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    const exams = await this.examModel
      .find(query, {
        publicId: 1,
        title: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        courseId: 1, // Include courseId for mapping
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // If we don't have course info yet, fetch it for all exams
    const missingCourseIds = exams
      .map((exam) => String(exam.courseId))
      .filter((id) => !courseMap.has(id));

    if (missingCourseIds.length > 0) {
      const uniqueIds = [...new Set(missingCourseIds)];
      const courses = await this.courseModel
        .find({ _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) } })
        .select('_id courseName')
        .exec();

      courses.forEach((course) => {
        courseMap.set(String(course._id), course.courseName);
      });
    }

    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationDto = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    // Map exams to summary DTOs including course information
    const examSummaries: ExamSummaryDto[] = exams.map((exam) => ({
      id: String(exam._id),
      publicId: exam.publicId,
      title: exam.title,
      status: computeExamStatus(now, exam.startTime, exam.endTime, exam.status),
      startTime: exam.startTime,
      endTime: exam.endTime,
      courseId: String(exam.courseId),
      courseName: courseMap.get(String(exam.courseId)) ?? 'Unknown Course',
    }));

    return { exams: examSummaries, pagination };
  }

  private ensureValidDates(startTime: Date, endTime: Date) {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid start or end time');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  private ensureDurationWithinWindow(
    startTime: Date,
    endTime: Date,
    durationMinutes: number,
  ) {
    if (durationMinutes <= 0) {
      throw new BadRequestException('durationMinutes must be greater than 0');
    }

    const diffInMinutes = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );

    if (durationMinutes > diffInMinutes) {
      throw new BadRequestException(
        'durationMinutes cannot exceed the available time window',
      );
    }
  }

  private buildQuestionPayload(
    questionDto: CreateExamQuestionDto,
    courseId: Types.ObjectId,
    teacherId: Types.ObjectId,
    index: number,
  ) {
    const normalizedChoices = this.normalizeChoices(questionDto, index);

    const payload: Partial<Question> = {
      content: questionDto.content,
      answerQuestion: questionDto.answerQuestion,
      answer: normalizedChoices,
      courseId,
      teacherId,
    };

    return payload;
  }

  private buildQuestionPayloadFromUpdate(
    questionDto: UpdateExamQuestionDto,
    courseId: Types.ObjectId,
    teacherId: Types.ObjectId,
    index: number,
  ) {
    const normalizedChoices = this.normalizeChoicesFromUpdate(
      questionDto,
      index,
    );

    const payload: Partial<Question> = {
      content: questionDto.content,
      answerQuestion: questionDto.answerQuestion,
      answer: normalizedChoices,
      courseId,
      teacherId,
    };

    return payload;
  }

  private normalizeChoices(
    questionDto: CreateExamQuestionDto,
    questionIndex: number,
  ) {
    const correctIndex = questionDto.answerQuestion - 1;

    if (!questionDto.answer[correctIndex]) {
      throw new BadRequestException(
        `answerQuestion must reference one of the provided choices (question #${questionIndex + 1})`,
      );
    }

    return questionDto.answer.map((choice, idx) => ({
      content: choice.content,
      isCorrect: idx === correctIndex,
    }));
  }

  private normalizeChoicesFromUpdate(
    questionDto: UpdateExamQuestionDto,
    questionIndex: number,
  ) {
    const correctIndex = questionDto.answerQuestion - 1;

    if (!questionDto.answer[correctIndex]) {
      throw new BadRequestException(
        `answerQuestion must reference one of the provided choices (question #${questionIndex + 1})`,
      );
    }

    return questionDto.answer.map((choice, idx) => ({
      content: choice.content,
      isCorrect: idx === correctIndex,
    }));
  }

  private mapExamResponse(
    exam: ExamDocument,
    questions: QuestionDocument[],
  ): ExamResponseDto {
    return {
      id: String(exam._id),
      publicId: exam.publicId,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      startTime: exam.startTime,
      endTime: exam.endTime,
      status: exam.status,
      courseId: String(exam.courseId),
      rateScore: exam.rateScore,
      questions: questions.map((question) => ({
        id: String(question._id),
        content: question.content,
        answerQuestion: question.answerQuestion,
        answer: question.answer.map((choice) => ({
          content: choice.content,
          isCorrect: choice.isCorrect,
        })),
      })),
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  }

  private async emitTeacherExamStatusNotification(
    previousExam: ExamDocument,
    currentExam: ExamDocument,
    course: CourseDocument,
  ): Promise<void> {
    const fromStatus = previousExam.status;
    const toStatus = currentExam.status;

    if (fromStatus === toStatus) {
      return;
    }

    let title: string;
    let message: string;
    let type: 'exam_scheduled_to_active' | 'exam_active_to_completed' | null =
      null;

    if (fromStatus === 'scheduled' && toStatus === 'active') {
      type = 'exam_scheduled_to_active';
      title = `Exam "${currentExam.title}" is now active`;
      message =
        'Your scheduled exam has started. Students can now join and submit.';
    } else if (fromStatus === 'active' && toStatus === 'completed') {
      type = 'exam_active_to_completed';
      title = `Exam "${currentExam.title}" has completed`;
      message =
        'The exam has completed. Review submissions and publish results.';
    } else {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const teacherObjectId = course.teacherId as Types.ObjectId;

    try {
      await this.notificationsService.createNotification({
        recipientId: teacherObjectId.toHexString(),
        audience: 'teacher',
        category: 'exam',
        type,
        title,
        message,
        actionUrl: `/dashboard/teacher/exams/${currentExam.publicId}`,
        examId: (currentExam._id as Types.ObjectId).toHexString(),
        metadata: {
          examPublicId: currentExam.publicId,
          fromStatus,
          toStatus,
          examTitle: currentExam.title,
          triggeredAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown notification error';
      this.logger.warn(`Failed to emit exam notification: ${reason}`);
    }
  }

  async processAutomaticStatusTransitions(): Promise<void> {
    const now = new Date();
    const candidates = await this.examModel
      .find({
        $or: [
          { status: 'scheduled', startTime: { $lte: now } },
          { status: 'active', endTime: { $lte: now } },
        ],
      })
      .lean()
      .exec();

    for (const candidate of candidates) {
      const candidateStart = new Date(candidate.startTime);
      const candidateEnd = new Date(candidate.endTime);
      const shouldActivate =
        candidate.status === 'scheduled' && candidateStart <= now;
      const shouldComplete =
        candidate.status === 'active' && candidateEnd <= now;
      const nextStatus = shouldActivate
        ? 'active'
        : shouldComplete
          ? 'completed'
          : null;

      if (!nextStatus) {
        continue;
      }

      const updatedExam = await this.examModel.findOneAndUpdate(
        { _id: candidate._id, status: candidate.status },
        { $set: { status: nextStatus, updatedAt: now } },
        { new: true },
      );

      if (!updatedExam) {
        continue;
      }

      const course = await this.courseModel.findById(updatedExam.courseId);
      if (!course) {
        continue;
      }

      const previousExam = this.examModel.hydrate(candidate);
      await this.emitTeacherExamStatusNotification(
        previousExam,
        updatedExam,
        course,
      );
    }
  }

  /**
   * Fetch full exam details including all questions and answers.
   * @param examId The MongoDB ObjectId of the exam
   * @param teacher The authenticated teacher
   * @returns The complete exam with questions
   */
  private buildExamLookupFilter(identifier: string) {
    if (Types.ObjectId.isValid(identifier)) {
      return { _id: new Types.ObjectId(identifier) };
    }
    return { publicId: identifier };
  }

  private findExamByIdOrPublicId(
    identifier: string,
  ): Promise<ExamDocument | null> {
    return this.examModel
      .findOne(this.buildExamLookupFilter(identifier))
      .exec();
  }

  async findExamById(examId: string, teacher: IUser): Promise<ExamResponseDto> {
    const filter = this.buildExamLookupFilter(examId);

    const exam = await this.examModel.findOne(filter).exec();

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Verify course ownership
    const course = await this.courseModel.findById(exam.courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (String(course.teacherId) !== teacher.id) {
      throw new ForbiddenException('You can only view exams for your courses');
    }

    // Load all questions
    const questions = await this.questionModel
      .find({ _id: { $in: exam.questions } })
      .exec();

    return this.mapExamResponse(exam, questions);
  }

  /**
   * Update an existing exam with full replacement of metadata and questions.
   * @param examId The MongoDB ObjectId of the exam
   * @param updateExamDto Complete updated exam data
   * @param teacher The authenticated teacher
   * @returns The updated exam with questions
   */
  async updateExam(
    examId: string,
    updateExamDto: UpdateExamDto,
    teacher: IUser,
  ): Promise<ExamResponseDto> {
    if (!teacher?.id) {
      throw new ForbiddenException('Missing teacher context');
    }

    if (!Types.ObjectId.isValid(teacher.id)) {
      throw new ForbiddenException('Invalid teacher identifier');
    }

    // Find existing exam
    const existingExam = await this.examModel
      .findOne(this.buildExamLookupFilter(examId))
      .exec();
    if (!existingExam) {
      throw new NotFoundException('Exam not found');
    }

    // Validate dates
    const startTime = new Date(updateExamDto.startTime);
    const endTime = new Date(updateExamDto.endTime);

    this.ensureValidDates(startTime, endTime);
    this.ensureDurationWithinWindow(
      startTime,
      endTime,
      updateExamDto.durationMinutes,
    );

    // Validate courseId
    if (!Types.ObjectId.isValid(updateExamDto.courseId)) {
      throw new BadRequestException('Invalid courseId');
    }

    const courseObjectId = new Types.ObjectId(updateExamDto.courseId);
    const course = await this.courseModel.findById(courseObjectId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (String(course.teacherId) !== teacher.id) {
      throw new ForbiddenException(
        'You can only update exams for your courses',
      );
    }

    const teacherObjectId = new Types.ObjectId(teacher.id);
    const normalizedQuestions = updateExamDto.questions.map(
      (questionDto, index) =>
        this.buildQuestionPayloadFromUpdate(
          questionDto,
          courseObjectId,
          teacherObjectId,
          index,
        ),
    );

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Delete old questions
      await this.questionModel.deleteMany(
        { _id: { $in: existingExam.questions } },
        { session },
      );

      // Create new questions
      const createdQuestions = await this.questionModel.insertMany(
        normalizedQuestions,
        { session },
      );

      const questionIds = createdQuestions.map((doc) => doc._id);

      // Update exam
      const updatedExam = await this.examModel.findByIdAndUpdate(
        examId,
        {
          title: updateExamDto.title,
          durationMinutes: updateExamDto.durationMinutes,
          startTime,
          endTime,
          status: updateExamDto.status ?? 'scheduled',
          courseId: courseObjectId,
          questions: questionIds,
          rateScore: updateExamDto.rateScore,
          updatedAt: new Date(),
        },
        { session, new: true },
      );

      if (!updatedExam) {
        throw new NotFoundException('Exam not found during update');
      }

      await this.emitTeacherExamStatusNotification(
        existingExam,
        updatedExam,
        course,
      );

      await session.commitTransaction();

      return this.mapExamResponse(updatedExam, createdQuestions);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Allows a student to join (find and validate) an exam using a public code.
   * @param joinExamDto DTO containing the publicId
   * @param user The authenticated student
   * @returns The validated exam details for the exam card
   */
  async joinExam(
    joinExamDto: JoinExamDto,
    user: IUser,
  ): Promise<JoinExamResponseDto> {
    const { publicId } = joinExamDto;
    const studentId = user.id;
    log('Student attempting to join exam:', publicId, 'User ID:', studentId);

    // --- Validation 1: Find the exam and its course ---
    const exam = await this.examModel
      .findOne({ publicId })
      .populate('courseId'); // Populate thông tin của Course

    if (!exam) {
      throw new NotFoundException('Exam with this code not found.');
    }

    // --- Validation 2: Check exam status ---
    if (exam.status !== 'active') {
      throw new BadRequestException('This exam is not active.');
    }
    if (exam.endTime < new Date()) {
      throw new BadRequestException('This exam has already ended.');
    }

    // validation 3: check if student done exam before
    const examObjectId = exam._id as Types.ObjectId;
    const studentObjectId = new Types.ObjectId(studentId);
    const existingSubmission = await this.submissionModel.findOne({
      studentId: studentObjectId,
      examId: examObjectId,
    });
    if (existingSubmission) {
      throw new ForbiddenException('You have already submitted this exam.');
    }

    // // --- Validation 3: Check if student is enrolled in the course ---
    // const enrollment = await this.enrollmentModel.findOne({
    //   studentId: studentId,
    //   courseId: (exam.courseId as unknown as CourseDocument)._id,
    // });

    // if (!enrollment) {
    //   throw new ForbiddenException(
    //     'You are not enrolled in the course required for this exam.',
    //   );
    // }

    // --- Success ---
    return new JoinExamResponseDto(exam);
  }

  /**
   * Get full exam details for a student to start taking it.
   * This performs all necessary validations.
   * @param publicId The exam's public ID
   * @param user The authenticated student
   * @returns The sanitized exam data (no correct answers)
   */
  async getExamForTaking(
    publicId: string,
    user: IUser,
  ): Promise<TakeExamResponseDto> {
    const studentId = user.id;

    // --- Validation 1: Find exam, populate course and questions ---
    const examResult = await this.examModel
      .findOne({ publicId })
      .populate('courseId') // Lấy thông tin course
      .populate('questions') // ⭐️ Lấy toàn bộ câu hỏi
      .exec();

    if (!examResult) {
      throw new NotFoundException('Exam not found.');
    }

    // Type assertion: exam đã được populate('questions') nên questions là QuestionDocument[]
    const exam = examResult as unknown as ExamWithPopulatedQuestions;

    // --- Validation 2: Check Time & Status ---
    if (exam.status !== 'active') {
      throw new BadRequestException('This exam is not active.');
    }
    const now = new Date();
    if (now < exam.startTime) {
      throw new BadRequestException('This exam has not started yet.');
    }
    if (now > exam.endTime) {
      throw new BadRequestException('This exam has already ended.');
    }

    // --- Validation 3: Check Enrollment (Student đã đăng ký course?) ---
    // const enrollment = await this.enrollmentModel.findOne({
    //   studentId: studentId,
    //   courseId: (exam.courseId as CourseDocument)._id,
    // });

    // if (!enrollment) {
    //   throw new ForbiddenException(
    //     'You are not enrolled in the course for this exam.',
    //   );
    // }

    // --- Validation 4: Check Previous Submission (Đã nộp bài chưa?) ---
    // Index unique (studentId, examId) sẽ xử lý việc này hiệu quả
    const examObjectId = exam._id as Types.ObjectId;
    const studentObjectId = new Types.ObjectId(studentId);
    const existingSubmission = await this.submissionModel.findOne({
      studentId: studentObjectId,
      examId: examObjectId,
    });

    if (existingSubmission) {
      throw new ForbiddenException('You have already submitted this exam.');
    }

    // Type assertion: exam đã được populate('questions') nên questions là QuestionDocument[]
    return new TakeExamResponseDto(exam);
  }

  /**
   * Submits a student's answers for an exam, calculates the score,
   * and saves the submission.
   * @param publicId The exam's public ID
   * @param user The authenticated student
   * @param submitDto The student's answers
   * @returns The detailed exam result
   */
  async submitExam(
    publicId: string,
    user: IUser,
    submitDto: SubmitExamDto,
  ): Promise<SubmissionResultDto> {
    const studentId = user.id;

    // Find exam (lần này populate cả 'questions' VÀ 'courseId')
    const examResult = await this.examModel
      .findOne({ publicId })
      .populate('questions')
      .populate('courseId');

    if (!examResult) {
      throw new NotFoundException('Exam not found.');
    }

    // Type assertion: exam đã được populate cả 'questions' và 'courseId'
    const exam = examResult as unknown as ExamWithPopulatedRelations;
    const examId = exam._id as Types.ObjectId;
    const studentObjectId = new Types.ObjectId(studentId);

    // Check time (không cho nộp bài khi đã hết giờ)
    if (new Date() > exam.endTime) {
      throw new BadRequestException('The time for this exam has ended.');
    }

    // Check for existing submission
    const existingSubmission = await this.submissionModel.findOne({
      studentId: studentObjectId,
      examId: examId,
    });

    if (existingSubmission) {
      throw new ForbiddenException('You have already submitted this exam.');
    }

    // Chấm điểm (Grading) - type-safe vì đã dùng ExamWithPopulatedRelations
    const questions = exam.questions;
    let correctCount = 0;

    // Tạo một Map để tra cứu câu trả lời của student O(1)
    const answerMap = new Map(
      submitDto.answers.map((ans) => [ans.questionId, ans.answerNumber]),
    );

    for (const question of questions) {
      const questionId = (question._id as Types.ObjectId).toHexString();
      const studentAnswerNumber = answerMap.get(questionId);
      // Giả định: `question.answerQuestion` là nguồn tin cậy (1-4)
      if (studentAnswerNumber === question.answerQuestion) {
        correctCount++;
      }
    }

    const totalQuestions = questions.length;
    const percentageScore =
      totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Lưu Submission vào DB ---
    const submissionDate = new Date();

    // Convert DTO answers to Schema answers
    const submissionAnswers = submitDto.answers.map((ans) => ({
      questionId: new Types.ObjectId(ans.questionId),
      answerNumber: ans.answerNumber,
    }));

    const newSubmission = new this.submissionModel({
      studentId: studentObjectId,
      examId: examId,
      score: percentageScore,
      status: 'graded', // Tự động 'graded' vì đã chấm điểm
      submittedAt: submissionDate,
      answers: submissionAnswers,
    });

    await newSubmission.save(); // Lỗi unique index (nộp 2 lần) sẽ được bắt ở đây

    // Tạo Response DTO - type-safe vì exam.courseId đã được populate
    const course = exam.courseId;

    return {
      examTitle: exam.title,
      courseName: course.courseName,
      dateTaken: submissionDate,
      totalQuestions: totalQuestions,
      correctAnswers: correctCount,
      score: percentageScore,
      result: percentageScore >= exam.rateScore ? 'Passed' : 'Failed',
      // ✅ Cast _id về Types.ObjectId trước khi convert sang string
      submissionId: (newSubmission._id as Types.ObjectId).toHexString(),
    };
  }

  /**
   * Lấy kết quả thi của tất cả học sinh cho một exam
   * @param examId The MongoDB ObjectId of the exam
   * @param teacher The authenticated teacher
   * @returns Danh sách kết quả thi của các học sinh
   */
  async getExamResults(
    examId: string,
    teacher: IUser,
  ): Promise<ExamResultsResponseDto> {
    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException('Invalid exam ID');
    }

    // Tìm exam và verify ownership
    const exam = await this.examModel.findById(examId).exec();
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Verify course ownership
    const course = await this.courseModel.findById(exam.courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (String(course.teacherId) !== teacher.id) {
      throw new ForbiddenException(
        'You can only view results for exams in your courses',
      );
    }

    // Lấy tất cả submissions cho exam này và populate thông tin student
    const examObjectId = exam._id as Types.ObjectId;

    const submissions = await this.submissionModel
      .find({ examId: examObjectId, status: 'graded' })
      .populate('studentId', 'fullName username')
      .sort({ score: -1 }) // Sắp xếp theo điểm giảm dần
      .exec();
    // Tính toán status của exam (scheduled/active/completed)
    const now = new Date();
    const examStatus = computeExamStatus(
      now,
      exam.startTime,
      exam.endTime,
      exam.status,
    );

    console.log(`Found ${submissions.length} submissions for exam ID:`, examId);

    // Map submissions thành ExamResultDto
    const results: ExamResultDto[] = [];

    for (const submission of submissions) {
      // studentId có thể đã được populate thành UserDocument hoặc vẫn là ObjectId
      let student: UserDocument | null = null;
      let studentIdStr: string;

      if (submission.studentId instanceof Types.ObjectId) {
        // Chưa được populate, cần query lại
        student = await this.userModel.findById(submission.studentId).exec();
        studentIdStr = submission.studentId.toHexString();
      } else {
        // Đã được populate
        student = submission.studentId as unknown as UserDocument;
        studentIdStr = (student._id as Types.ObjectId).toHexString();
      }

      if (!student || !student.username) {
        // Bỏ qua nếu không tìm thấy student hoặc không có username
        continue;
      }

      const grade = submission.score; // Điểm số (0-100)
      const maxGrade = 100; // Điểm tối đa luôn là 100 vì score là percentage
      const status: 'pass' | 'fail' = grade >= exam.rateScore ? 'pass' : 'fail';

      // Sử dụng fullName nếu có, nếu không thì fallback sang username
      // (Một số tài khoản cũ có thể không có fullName)
      const studentName = student.fullName?.trim() || student.username;

      results.push({
        submissionId: (submission._id as Types.ObjectId).toHexString(),
        studentId: studentIdStr,
        studentName,
        studentCode: studentIdStr,
        grade,
        maxGrade,
        status,
      });
    }

    return {
      exam: {
        title: exam.title,
        status: examStatus,
      },
      results,
    };
  }

  /**
   * Lấy danh sách các bài thi đã hoàn thành của người dùng
   * @param user The authenticated student
   * @returns Danh sách bài thi đã hoàn thành
   */
  async getMyCompletedExams(user: IUser): Promise<CompletedExamResponseDto[]> {
    console.log('Fetching completed exams for user ID:', user.id);
    let studentObjectId: Types.ObjectId;
    try {
      studentObjectId = new Types.ObjectId(user.id);
    } catch (error) {
      throw new BadRequestException('Invalid user ID format.');
    }
    console.log(
      'Converted user ID to ObjectId:',
      studentObjectId.toHexString(),
    );

    const submissions = await this.submissionModel
      .find({
        status: 'graded',
        // Khớp cả ObjectId và string
        $or: [{ studentId: studentObjectId }, { studentId: user.id }],
      })
      .populate<{ examId: ExamDocument & { courseId: CourseDocument } }>({
        path: 'examId',
        populate: {
          path: 'courseId',
          model: 'Course',
        },
      })
      .sort({ submittedAt: -1 })
      .exec();

    console.log(
      `Found ${submissions.length} completed submissions for user ID:`,
      user.id,
    );

    const results = submissions.map((sub) => {
      const exam = sub.examId;
      if (!exam || !exam.courseId) return null;

      return {
        submissionId: (sub._id as Types.ObjectId).toHexString(),
        examPublicId: exam.publicId,
        examTitle: exam.title,
        courseName: exam.courseId.courseName,
        score: sub.score,
        result: sub.score >= exam.rateScore ? 'Passed' : 'Failed',
        submittedAt: sub.submittedAt ?? sub.createdAt, // ⭐️ Fallback về createdAt
      };
    });

    return results.filter((r): r is CompletedExamResponseDto => r !== null);
  }

  async getSubmissionResult(
    submissionId: string,
    user: IUser,
  ): Promise<ExamResultDetailDto> {
    console.log(
      'Fetching submission result for submission ID:',
      submissionId,
      'User ID:',
      user.id,
    );

    const submission = await this.loadSubmissionWithExam(submissionId, {
      includeStudent: false,
    });

    const submissionStudentId =
      submission.studentId instanceof Types.ObjectId
        ? submission.studentId.toHexString()
        : (
            (submission.studentId as UserDocument)._id as Types.ObjectId
          ).toHexString();

    if (submissionStudentId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to view this result.',
      );
    }

    return this.mapSubmissionDetail(submission, { includeStudent: false });
  }

  async getSubmissionResultForTeacher(
    examId: string,
    submissionId: string,
    teacher: IUser,
  ): Promise<ExamResultDetailDto> {
    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException('Invalid exam ID');
    }

    const submission = await this.loadSubmissionWithExam(submissionId, {
      includeStudent: true,
    });

    const exam = submission.examId;
    const course = exam.courseId;

    if (!exam || !course) {
      throw new BadRequestException('Exam data is incomplete.');
    }

    if ((exam._id as Types.ObjectId).toHexString() !== examId) {
      throw new BadRequestException(
        'Submission does not belong to the specified exam',
      );
    }

    if (String(course.teacherId) !== teacher.id) {
      throw new ForbiddenException(
        'You can only view submissions for your own exams',
      );
    }

    return this.mapSubmissionDetail(submission, { includeStudent: true });
  }

  private async loadSubmissionWithExam(
    submissionId: string,
    options: { includeStudent: boolean },
  ): Promise<SubmissionWithExam> {
    if (!Types.ObjectId.isValid(submissionId)) {
      throw new BadRequestException('Invalid submission ID');
    }

    const query = this.submissionModel
      .findById(submissionId)
      .populate<SubmissionWithExam['examId']>({
        path: 'examId',
        populate: [
          { path: 'courseId', model: 'Course' },
          { path: 'questions', model: 'Question' },
        ],
      });

    if (options.includeStudent) {
      query.populate('studentId', 'fullName username email');
    }

    const submission = await query.exec();

    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }

    return submission as unknown as SubmissionWithExam;
  }

  private mapSubmissionDetail(
    submission: SubmissionWithExam,
    options: { includeStudent: boolean },
  ): ExamResultDetailDto {
    const exam = submission.examId;
    const course = exam?.courseId as CourseDocument | undefined;

    if (!exam || !course || !exam.questions) {
      throw new BadRequestException('Exam data is incomplete.');
    }

    const answerMap = new Map(
      submission.answers.map((answer) => [
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        (answer.questionId as Types.ObjectId).toHexString(),
        answer.answerNumber,
      ]),
    );

    const populatedQuestions = exam.questions as unknown as QuestionDocument[];

    const questions = populatedQuestions.map((question) => {
      const questionId = (question._id as Types.ObjectId).toHexString();
      const studentAnswer = answerMap.get(questionId) ?? null;

      return {
        questionId,
        content: question.content,
        studentAnswer,
        correctAnswer: question.answerQuestion,
        isCorrect: studentAnswer === question.answerQuestion,
        choices: question.answer.map((choice, index) => ({
          option: index + 1,
          content: choice.content,
          isCorrect: choice.isCorrect,
        })),
      };
    });

    const correctAnswers = questions.filter(
      (question) => question.isCorrect,
    ).length;

    const detail: ExamResultDetailDto = {
      submissionId: (submission._id as Types.ObjectId).toHexString(),
      exam: {
        examId: (exam._id as Types.ObjectId).toHexString(),
        examPublicId: exam.publicId,
        examTitle: exam.title,
        courseId: (course._id as Types.ObjectId).toHexString(),
        courseName: course.courseName,
        submittedAt: submission.submittedAt ?? submission.createdAt,
        rateScore: exam.rateScore,
      },
      metrics: {
        score: submission.score,
        totalQuestions: questions.length,
        correctAnswers,
        passed: submission.score >= exam.rateScore,
      },
      questions,
    };

    if (
      options.includeStudent &&
      !(submission.studentId instanceof Types.ObjectId)
    ) {
      const studentDoc = submission.studentId as UserDocument;
      detail.student = {
        studentId: (studentDoc._id as Types.ObjectId).toHexString(),
        studentName: studentDoc.fullName ?? studentDoc.username,
        studentCode: studentDoc.username,
        email: studentDoc.email,
      };
    }

    return detail;
  }

  async transitionExamStatus(
    examId: string,
    nextStatus: ExamStatusTransition,
    actor: IUser,
  ): Promise<ExamResponseDto> {
    const exam = await this.examModel
      .findOne(this.buildExamLookupFilter(examId))
      .populate('courseId')
      .populate('questions')
      .exec();

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const course = exam.courseId as unknown as CourseDocument | undefined;

    if (!course) {
      throw new BadRequestException('Exam course not found');
    }

    if (actor.role === 'teacher' && String(course.teacherId) !== actor.id) {
      throw new ForbiddenException(
        'You can only transition exams for your courses',
      );
    }

    if (exam.status === nextStatus) {
      return this.mapExamResponse(
        exam,
        exam.questions as unknown as QuestionDocument[],
      );
    }

    const isValidTransition =
      (exam.status === 'scheduled' &&
        nextStatus === ExamStatusTransition.Active) ||
      (exam.status === 'active' &&
        nextStatus === ExamStatusTransition.Completed);

    if (!isValidTransition) {
      throw new BadRequestException('Unsupported status transition');
    }

    const now = new Date();

    if (nextStatus === ExamStatusTransition.Active && now < exam.startTime) {
      throw new BadRequestException('Cannot activate before start time');
    }

    if (nextStatus === ExamStatusTransition.Completed && now < exam.endTime) {
      throw new BadRequestException('Cannot complete before end time');
    }

    const previousExam = this.examModel.hydrate(exam.toObject());
    exam.status = nextStatus;
    exam.updatedAt = now;

    await exam.save();
    await this.emitTeacherExamStatusNotification(previousExam, exam, course);

    return this.mapExamResponse(
      exam,
      exam.questions as unknown as QuestionDocument[],
    );
  }

  async deleteExam(examId: string, user: IUser): Promise<void> {
    const exam = await this.findExamByIdOrPublicId(examId);

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const course = await this.courseModel.findById(exam.courseId);

    if (!course) {
      throw new NotFoundException('Exam course not found');
    }

    if (String(course.teacherId) !== user.id) {
      throw new ForbiddenException('You can only delete exams you own');
    }

    await this.questionModel.deleteMany({ _id: { $in: exam.questions } });
    await this.submissionModel.deleteMany({ examId: exam._id });
    await this.examModel.deleteOne({ _id: exam._id });
  }
}
