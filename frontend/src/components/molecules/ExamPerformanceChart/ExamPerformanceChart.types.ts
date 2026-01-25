import { type ReactNode } from 'react'

export interface ExamPerformanceRecord {
  examId: string
  examName: string
  passCount: number
  failCount: number
}

export interface ExamPerformanceSummary {
  totalStudents: number
  passRate: number
}

export interface ExamPerformanceChartProps {
  title?: string
  subtitle?: string
  records: ExamPerformanceRecord[]
  summary?: ExamPerformanceSummary
  className?: string
  onExamSelect?: (exam: ExamPerformanceRecord) => void
  headerActions?: ReactNode
}
