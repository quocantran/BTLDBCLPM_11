import { type UseQueryOptions } from '@tanstack/react-query'
import { DashboardService } from '../index'
import type { StudentDashboardSummary } from '../types'

export interface TeacherDashboardStats {
  totalStudents: number
  activeExams: number
  certificatesIssued?: number
}

export interface TeacherDashboardExamPerformanceRecord {
  examId: string
  examName: string
  examDate?: string
  passCount: number
  failCount: number
}

export interface TeacherDashboardExamPerformanceSummary {
  totalStudents?: number
  passRate?: number
}

export interface TeacherDashboardExamPerformance {
  summary?: TeacherDashboardExamPerformanceSummary
  records: TeacherDashboardExamPerformanceRecord[]
}

export interface TeacherDashboardActiveExam {
  examId?: string
  publicId: string
  status: string
  startTime: string
}

export interface TeacherDashboardData {
  stats: TeacherDashboardStats
  examPerformance: TeacherDashboardExamPerformance
  activeExams: TeacherDashboardActiveExam[]
}

export interface TeacherDashboardResponse {
  success: boolean
  data: TeacherDashboardData
  message: string
  meta?: {
    timestamp: string
  }
}

export interface StudentDashboardResponse {
  success: boolean
  data: StudentDashboardSummary
  message: string
  meta?: {
    timestamp: string
  }
}

type UseTeacherDashboardOptions = Omit<
  UseQueryOptions<TeacherDashboardResponse>,
  'queryKey' | 'queryFn'
>

export const useTeacherDashboard = (
  teacherId: string | null | undefined,
  options?: UseTeacherDashboardOptions
) => {
  const mergedOptions: UseTeacherDashboardOptions = {
    ...options,
    enabled: Boolean(teacherId) && (options?.enabled ?? true)
  }

  return DashboardService.useGet<TeacherDashboardResponse>({
    url: '/teacher',
    params: teacherId ? { teacherId } : undefined,
    options: mergedOptions
  })
}

type UseStudentDashboardOptions = Omit<
  UseQueryOptions<StudentDashboardResponse>,
  'queryKey' | 'queryFn'
>

export const useStudentDashboard = (options?: UseStudentDashboardOptions) => {
  return DashboardService.useGet<StudentDashboardResponse>({
    url: '/student',
    options
  })
}
