/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export interface ExamChoiceResponseDto {
  content: string;
  isCorrect: boolean;
}

export interface ExamQuestionResponseDto {
  id: string;
  content: string;
  answerQuestion: number;
  answer: ExamChoiceResponseDto[];
}

export interface ExamResponseDto {
  id: string;
  publicId: string;
  title: string;
  durationMinutes: number;
  startTime: Date;
  endTime: Date;
  status: string;
  courseId: string;
  rateScore: number;
  questions: ExamQuestionResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { CourseDocument } from '../../../database/schemas/course.schema';
import { QuestionDocument } from 'src/database/schemas/question.schema';
import { ExamDocument } from 'src/database/schemas/exam.schema';
import { Types } from 'mongoose';
import { computeExamStatus } from '../../../common/utils/exam.util';

/**
 * Type utility cho ExamDocument đã được populate('questions')
 * Sau khi populate, questions sẽ là QuestionDocument[] thay vì Types.ObjectId[]
 */
export type ExamWithPopulatedQuestions = Omit<ExamDocument, 'questions'> & {
  questions: QuestionDocument[];
};

/**
 * Type utility cho ExamDocument đã được populate cả 'questions' và 'courseId'
 * Dùng cho các method như submitExam
 */
export type ExamWithPopulatedRelations = Omit<
  ExamDocument,
  'questions' | 'courseId'
> & {
  questions: QuestionDocument[];
  courseId: CourseDocument;
};

class CourseInfoForJoinDto {
  @ApiProperty({ example: 'C123456' })
  publicId: string;

  @ApiProperty({ example: 'Introduction to Computer Science' })
  courseName: string;
}

/**
 * DTO cho một lựa chọn câu hỏi (ĐÃ LOẠI BỎ isCorrect)
 */
export class TakeExamChoiceDto {
  @ApiProperty()
  content: string;

  constructor(choice: any) {
    this.content = choice.content;
  }
}

/**
 * DTO response cho API "Join Exam",
 * chỉ chứa thông tin cần thiết cho ExamCard.
 */
export class JoinExamResponseDto {
  @ApiProperty({ example: 'E123456' })
  publicId: string;

  @ApiProperty({ example: 'Final Exam' })
  title: string;

  @ApiProperty({ example: 90 })
  durationMinutes: number;

  @ApiProperty({ example: '2025-12-25T10:00:00.000Z' })
  startTime: Date;

  @ApiProperty({
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    example: 'scheduled',
    description: 'Status of the exam',
  })
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';

  @ApiProperty({ type: CourseInfoForJoinDto })
  course: CourseInfoForJoinDto;

  constructor(exam: any) {
    // 'exam' là object đã được populate('courseId')
    const course = exam.courseId as CourseDocument;
    const now = new Date();

    this.publicId = exam.publicId;
    this.title = exam.title;
    this.durationMinutes = exam.durationMinutes;
    this.startTime = exam.startTime;
    this.status = computeExamStatus(
      now,
      exam.startTime as Date,
      exam.endTime as Date,
      exam.status as string,
    );

    this.course = {
      publicId: course?.publicId || 'N/A',
      courseName: course?.courseName || 'N/A',
    };
  }
}

/**
 * DTO cho một câu hỏi (ĐÃ LOẠI BỎ isCorrect)
 */
export class TakeExamQuestionDto {
  @ApiProperty({ description: 'Question ID (MongoDB ObjectId)' })
  questionId: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: [TakeExamChoiceDto] })
  choices: TakeExamChoiceDto[];

  constructor(question: QuestionDocument) {
    this.questionId = (question._id as Types.ObjectId).toHexString();
    this.content = question.content;
    // Chỉ map 'content', loại bỏ 'isCorrect'
    this.choices = question.answer.map(
      (choice) => new TakeExamChoiceDto(choice),
    );
  }
}
/**
 * DTO response cho API "GET /exams/:publicId/take"
 * Chứa toàn bộ thông tin bài thi (đã lọc đáp án)
 */
export class TakeExamResponseDto {
  @ApiProperty({ example: 'E123456' })
  publicId: string;

  @ApiProperty({ example: 'Final Exam' })
  title: string;

  @ApiProperty({ example: 90 })
  durationMinutes: number;

  @ApiProperty({
    example: '2025-12-25T12:00:00.000Z',
    description: 'Thời gian kết thúc (để frontend làm đồng hồ đếm ngược)',
  })
  endTime: Date;

  @ApiProperty({ type: [TakeExamQuestionDto] })
  questions: TakeExamQuestionDto[];

  constructor(exam: ExamWithPopulatedQuestions) {
    this.publicId = exam.publicId;
    this.title = exam.title;
    this.durationMinutes = exam.durationMinutes;
    this.endTime = exam.endTime;
    // Map các câu hỏi đã được populate - type-safe vì đã định nghĩa ExamWithPopulatedQuestions
    this.questions = exam.questions.map((q) => new TakeExamQuestionDto(q));
  }
}
