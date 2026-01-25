export type Exam = {
  id: string
  title: string
  courseCode: string
  status: string
  durationInMinutes: number
  startTime: Date
}

/**
 * DTO cho một lựa chọn câu hỏi (đã lọc đáp án)
 * Khớp với TakeExamChoiceDto
 */
export interface TakeExamChoice {
  content: string
}

/**
 * DTO cho một câu hỏi (đã lọc đáp án)
 * Khớp với TakeExamQuestionDto
 */
export interface TakeExamQuestion {
  questionId: string
  content: string
  choices: TakeExamChoice[]
}
/**
 * DTO response cho API "GET /exams/:publicId/take"
 * Khớp với TakeExamResponseDto
 */
export interface TakeExamResponse {
  publicId: string
  title: string
  durationMinutes: number
  endTime: string
  questions: TakeExamQuestion[]
}

/**
 * DTO cho body của request nộp bài
 * (Khớp với SubmitExamDto)
 */
export interface SubmitExamPayload {
  answers: {
    questionId: string
    answerNumber: number // 1-4
  }[]
}

/**
 * DTO trả về kết quả sau khi nộp bài
 * (Khớp với SubmissionResultDto)
 */
export interface SubmissionResult {
  examTitle: string
  courseName: string
  dateTaken: string
  totalQuestions: number
  correctAnswers: number
  score: number
  result: 'Passed' | 'Failed'
  submissionId: string
}
