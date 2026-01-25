import {
  useMutation,
  type UseMutationOptions,
  type UseQueryOptions
} from '@tanstack/react-query'
import { type ApiMutationOptionsOf, ExamService } from '../index'

export interface CreateExamAnswerRequest {
  content: string
}

export interface CreateExamQuestionRequest {
  content: string
  answerQuestion: number
  answer: CreateExamAnswerRequest[]
}

export interface CreateExamRequest {
  title: string
  durationMinutes: number
  startTime: string
  endTime: string
  status: string
  courseId: string
  rateScore: number
  questions: CreateExamQuestionRequest[]
  examCode?: string
}

export interface ExamAnswerEntity {
  content: string
  isCorrect: boolean
}

export interface ExamQuestionEntity {
  id: string
  content: string
  answerQuestion: number
  answer: ExamAnswerEntity[]
}

export interface ExamEntity {
  id: string
  publicId: string
  title: string
  durationMinutes: number
  startTime: string
  endTime: string
  status: string
  courseId: string
  rateScore: number
  questions: ExamQuestionEntity[]
  createdAt: string
  updatedAt: string
}

export interface ExamSummaryEntity {
  id: string
  publicId: string
  title?: string
  status: string
  startTime: string
  endTime: string
  /** Course ID associated with this exam */
  courseId?: string
  /** Course name for display purposes */
  courseName?: string
}

export interface ExamResultEntity {
  submissionId: string
  studentId: string
  studentName: string
  studentCode: string
  grade: number
  maxGrade: number
  status: 'pass' | 'fail'
}

export interface ExamResultsExamEntity {
  title: string
  status: string
}

export interface ExamResultsResponse {
  success: boolean
  data: {
    exam: ExamResultsExamEntity
    results: ExamResultEntity[]
  }
  message: string
}

export interface CreateExamResponse {
  success: boolean
  data: {
    exam: ExamEntity
  }
  message: string
  meta?: {
    timestamp: string
  }
}

export const useCreateExam = (
  options?: ApiMutationOptionsOf<CreateExamResponse>
) => {
  return ExamService.usePost<CreateExamResponse>({ url: '/' }, options)
}

export interface GetExamResponse {
  success: boolean
  data: {
    exam: ExamEntity
  }
  message: string
}

export const useGetExam = (
  examId: string,
  options?: Omit<UseQueryOptions<GetExamResponse>, 'queryKey' | 'queryFn'>
) => {
  return ExamService.useGet<GetExamResponse>({
    url: `/${examId}`,
    options
  })
}

export interface UpdateExamRequest {
  title: string
  durationMinutes: number
  startTime: string
  endTime: string
  status: string
  courseId: string
  rateScore: number
  questions: CreateExamQuestionRequest[]
}

export interface UpdateExamResponse {
  success: boolean
  data: {
    exam: ExamEntity
  }
  message: string
}

export interface UpdateExamVariables {
  examId: string
  data: UpdateExamRequest
}

export const useUpdateExam = (
  options?: Omit<
    UseMutationOptions<
      UpdateExamResponse,
      unknown,
      UpdateExamVariables,
      unknown
    >,
    'mutationFn'
  >
) => {
  return useMutation({
    mutationFn: async ({ examId, data }: UpdateExamVariables) => {
      return ExamService.apiMethod.put<UpdateExamResponse>({
        url: `/${examId}`,
        data
      })
    },
    ...options
  })
}

export interface DeleteExamResponse {
  success: boolean
  data: null
  message: string
}

export interface DeleteExamVariables {
  examId: string
}

export const useDeleteExam = (
  options?: Omit<
    UseMutationOptions<
      DeleteExamResponse,
      unknown,
      DeleteExamVariables,
      unknown
    >,
    'mutationFn'
  >
) => {
  return useMutation({
    mutationFn: async ({ examId }: DeleteExamVariables) => {
      return ExamService.apiMethod.delete<DeleteExamResponse>({
        url: `/${examId}`
      })
    },
    ...options
  })
}

// Types for search, filter, and pagination
export type ExamStatusFilter = 'all' | 'scheduled' | 'active' | 'completed'

export interface ExamsQueryParams {
  search?: string
  status?: ExamStatusFilter
  /** Filter by course ID. Use 'all' to show exams from all courses */
  courseId?: string
  page?: number
  limit?: number
}

export interface PaginationEntity {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ExamsResponse {
  success: boolean
  data: {
    exams: ExamSummaryEntity[]
    pagination: PaginationEntity
  }
  message: string
}

export const useExams = (
  teacherId: string,
  queryParams?: ExamsQueryParams,
  options?: Omit<UseQueryOptions<ExamsResponse>, 'queryKey' | 'queryFn'>
) => {
  // Build query string from params
  const buildQueryString = (params?: ExamsQueryParams): string => {
    if (!params) return ''
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.status && params.status !== 'all')
      searchParams.set('status', params.status)
    // Add courseId filter - 'all' means no filter applied
    if (params.courseId && params.courseId !== 'all')
      searchParams.set('courseId', params.courseId)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  const queryString = buildQueryString(queryParams)

  return ExamService.useGet<ExamsResponse>({
    url: `/teacher/${teacherId}${queryString}`,
    options: {
      ...options
    }
  })
}

export const useExamResults = (
  examId: string,
  options?: Omit<UseQueryOptions<ExamResultsResponse>, 'queryKey' | 'queryFn'>
) => {
  return ExamService.useGet<ExamResultsResponse>({
    url: `/${examId}/results`,
    options
  })
}

export interface ExamResultChoiceEntity {
  option: number
  content: string
  isCorrect: boolean
}

export interface ExamResultQuestionEntity {
  questionId: string
  content: string
  studentAnswer: number | null
  correctAnswer: number
  isCorrect: boolean
  choices: ExamResultChoiceEntity[]
}

export interface ExamResultExamInfoEntity {
  examId: string
  examPublicId: string
  examTitle: string
  courseId: string
  courseName: string
  submittedAt: string
  rateScore: number
}

export interface ExamResultMetricsEntity {
  score: number
  totalQuestions: number
  correctAnswers: number
  passed: boolean
}

export interface ExamResultStudentInfoEntity {
  studentId: string
  studentName: string
  studentCode: string
  email?: string
}

export interface ExamResultDetailEntity {
  submissionId: string
  exam: ExamResultExamInfoEntity
  metrics: ExamResultMetricsEntity
  questions: ExamResultQuestionEntity[]
  student?: ExamResultStudentInfoEntity
}

export interface ExamResultDetailResponse {
  success: boolean
  data: ExamResultDetailEntity
  message: string
}

export const useStudentSubmissionDetail = (
  submissionId?: string,
  options?: Omit<
    UseQueryOptions<ExamResultDetailResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  const enabled = Boolean(submissionId) && (options?.enabled ?? true)

  return ExamService.useGet<ExamResultDetailResponse>({
    url: submissionId ? `/submissions/${submissionId}/result` : '',
    options: {
      ...options,
      enabled
    }
  })
}

export const useTeacherSubmissionDetail = (
  examId?: string,
  submissionId?: string,
  options?: Omit<
    UseQueryOptions<ExamResultDetailResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  const enabled = Boolean(examId && submissionId) && (options?.enabled ?? true)

  return ExamService.useGet<ExamResultDetailResponse>({
    url:
      examId && submissionId
        ? `/${examId}/submissions/${submissionId}/result`
        : '',
    options: {
      ...options,
      enabled
    }
  })
}
