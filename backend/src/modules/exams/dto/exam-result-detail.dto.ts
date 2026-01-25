import { ApiProperty } from '@nestjs/swagger';

export class ExamResultQuestionChoiceDto {
  @ApiProperty({ example: 1 })
  option: number;

  @ApiProperty({ example: 'Blockchain helps prevent double spending by...' })
  content: string;

  @ApiProperty({ example: false })
  isCorrect: boolean;
}

export class ExamResultQuestionDto {
  @ApiProperty({ example: '675a1b1e98c7a2d6f3b12345' })
  questionId: string;

  @ApiProperty({ example: 'What is a hash function used for?' })
  content: string;

  @ApiProperty({ example: 2, nullable: true })
  studentAnswer: number | null;

  @ApiProperty({ example: 3 })
  correctAnswer: number;

  @ApiProperty({ example: true })
  isCorrect: boolean;

  @ApiProperty({ type: [ExamResultQuestionChoiceDto] })
  choices: ExamResultQuestionChoiceDto[];
}

export class ExamResultExamInfoDto {
  @ApiProperty({ example: '675a1b1e98c7a2d6f3b99999' })
  examId: string;

  @ApiProperty({ example: 'E123456' })
  examPublicId: string;

  @ApiProperty({ example: 'Midterm Assessment' })
  examTitle: string;

  @ApiProperty({ example: '675a1b1e98c7a2d6f3b88888' })
  courseId: string;

  @ApiProperty({ example: 'Blockchain Fundamentals' })
  courseName: string;

  @ApiProperty({ example: '2025-11-02T10:00:00.000Z' })
  submittedAt: Date;

  @ApiProperty({ example: 80 })
  rateScore: number;
}

export class ExamResultMetricsDto {
  @ApiProperty({ example: 78 })
  score: number;

  @ApiProperty({ example: 25 })
  totalQuestions: number;

  @ApiProperty({ example: 19 })
  correctAnswers: number;

  @ApiProperty({ example: true })
  passed: boolean;
}

export class ExamResultStudentInfoDto {
  @ApiProperty({ example: '675a1b1e98c7a2d6f3b77777' })
  studentId: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  studentName: string;

  @ApiProperty({ example: 'SV001' })
  studentCode: string;

  @ApiProperty({ example: 'student@example.com', required: false })
  email?: string;
}

export class ExamResultDetailDto {
  @ApiProperty({ example: '675a1b1e98c7a2d6f3b66666' })
  submissionId: string;

  @ApiProperty({ type: ExamResultExamInfoDto })
  exam: ExamResultExamInfoDto;

  @ApiProperty({ type: ExamResultMetricsDto })
  metrics: ExamResultMetricsDto;

  @ApiProperty({ type: [ExamResultQuestionDto] })
  questions: ExamResultQuestionDto[];

  @ApiProperty({ type: ExamResultStudentInfoDto, required: false })
  student?: ExamResultStudentInfoDto;
}
