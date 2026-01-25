// src/app/(privateLayout)/exams/types/api.types.ts
export type Exam = {
  id: string
  title: string
  courseCode: string
  status: string
  durationInMinutes: number
  startTime: Date
}

export interface JoinExamResponseDto {
  publicId: string
  title: string
  status: string
  durationMinutes: number
  startTime: string
  course: {
    publicId: string
    courseName: string
  }
}

/**
 * DTO trả về cho mỗi card trong tab "Completed"
 * (Khớp với CompletedExamResponseDto)
 */
export interface CompletedExamResponse {
  submissionId: string
  examPublicId: string
  examTitle: string
  courseName: string
  score: number
  result: 'Passed' | 'Failed'
  submittedAt: string
}

export interface StudentDashboardExamResult {
  submissionId: string
  examPublicId: string
  examTitle: string
  courseName: string
  score: number
  result: 'Passed' | 'Failed'
  submittedAt: string
}

export interface StudentDashboardPerformancePoint {
  submittedAt: string
  score: number
  examTitle: string
  result: 'Passed' | 'Failed'
}

export interface StudentDashboardPerformance {
  points: StudentDashboardPerformancePoint[]
  averageScore: number
  passRate: number
}

export interface StudentDashboardSummary {
  performance: StudentDashboardPerformance
  completedExams: StudentDashboardExamResult[]
}

export interface StudentDashboardCourseSnapshot {
  courseId: string
  coursePublicId: string
  courseName: string
  upcomingExamCount: number
  completedExamCount: number
  averageScore?: number | null
  lastSubmissionAt?: string | null
}

export interface StudentDashboardPendingActions {
  pendingCertificateCount: number
  examsThisWeek: number
  hasActiveExam: boolean
}
