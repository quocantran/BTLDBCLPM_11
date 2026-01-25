'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { Button, Icon } from '@/components/atoms'
import {
  ExamPerformanceChart,
  type ExamPerformanceRecord,
  type ExamPerformanceSummary,
  StatCard
} from '@/components/molecules'
import {
  useTeacherDashboard,
  type TeacherDashboardData
} from '@/services/api/dashboard.api'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/stores/auth'

type ExamStatus = 'active' | 'scheduled' | 'completed'

const numberFormatter = new Intl.NumberFormat()
const MAX_VISIBLE_EXAMS = 10

const normalizeStatus = (status: string): ExamStatus => {
  const normalized = status?.toLowerCase() as ExamStatus
  if (
    normalized === 'active' ||
    normalized === 'scheduled' ||
    normalized === 'completed'
  ) {
    return normalized
  }
  return 'scheduled'
}

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const teacherId = user?.id ?? ''
  const { data: dashboardResponse } = useTeacherDashboard(teacherId, {
    refetchOnWindowFocus: false
  })

  const dashboardData = dashboardResponse?.data
  const statsData = dashboardData?.stats
  const activeExams = dashboardData?.activeExams ?? []
  const examPerformanceData = dashboardData?.examPerformance
  const totalStudents =
    statsData?.totalStudents ?? examPerformanceData?.summary?.totalStudents ?? 0
  const certificatesIssued = statsData?.certificatesIssued

  const [showAllExams, setShowAllExams] = useState(false)

  const normalizedExamRecords = useMemo<ExamPerformanceRecord[]>(() => {
    return (examPerformanceData?.records ?? []).map(
      ({ examId, examName, passCount, failCount }) => ({
        examId: examId ?? '',
        examName: examName ?? '',
        passCount:
          typeof passCount === 'number' && !isNaN(passCount) ? passCount : 0,
        failCount:
          typeof failCount === 'number' && !isNaN(failCount) ? failCount : 0
      })
    )
  }, [examPerformanceData?.records])

  const aggregatedExamRecords = useMemo<ExamPerformanceRecord[]>(() => {
    const order: ExamPerformanceRecord[] = []
    const totals = new Map<string, ExamPerformanceRecord>()

    normalizedExamRecords.forEach((record) => {
      const key = record.examId || record.examName
      if (!key) {
        order.push({ ...record })
        return
      }

      if (!totals.has(key)) {
        const cloned = { ...record }
        totals.set(key, cloned)
        order.push(cloned)
        return
      }

      const existing = totals.get(key)
      if (existing) {
        existing.passCount += record.passCount
        existing.failCount += record.failCount
      }
    })

    return order
  }, [normalizedExamRecords])

  const totalExamCount = aggregatedExamRecords.length
  const hasInteractiveExamData = totalExamCount > 0

  useEffect(() => {
    if (totalExamCount <= MAX_VISIBLE_EXAMS && showAllExams) {
      setShowAllExams(false)
    }
  }, [showAllExams, totalExamCount])

  const examPerformanceRecords = useMemo<ExamPerformanceRecord[]>(() => {
    if (!totalExamCount) {
      return []
    }

    if (showAllExams) {
      return aggregatedExamRecords
    }

    return aggregatedExamRecords.slice(0, MAX_VISIBLE_EXAMS)
  }, [aggregatedExamRecords, showAllExams, totalExamCount])

  const examPerformanceSummary = useMemo<ExamPerformanceSummary>(() => {
    const aggregationSource = totalExamCount ? aggregatedExamRecords : []

    const aggregated = aggregationSource.reduce(
      (acc, record) => {
        const total = record.passCount + record.failCount
        return {
          totalStudents: acc.totalStudents + total,
          passTotal: acc.passTotal + record.passCount
        }
      },
      { totalStudents: 0, passTotal: 0 }
    )

    const apiSummary = examPerformanceData?.summary

    const summaryTotalStudents =
      apiSummary?.totalStudents ?? aggregated.totalStudents
    const summaryPassRate =
      apiSummary?.passRate ??
      (aggregated.totalStudents
        ? (aggregated.passTotal / aggregated.totalStudents) * 100
        : 0)

    return {
      totalStudents: summaryTotalStudents,
      passRate: summaryPassRate
    }
  }, [examPerformanceData?.summary, aggregatedExamRecords, totalExamCount])

  const activeExamsCount = useMemo(() => {
    if (typeof statsData?.activeExams === 'number') {
      return statsData.activeExams
    }

    return activeExams.reduce((count, exam) => {
      return normalizeStatus(exam.status) === 'active' ? count + 1 : count
    }, 0)
  }, [activeExams, statsData?.activeExams])

  const stats = useMemo(
    () => [
      {
        title: 'Total Students',
        value: numberFormatter.format(totalStudents),
        description: 'Across all enrolled cohorts',
        accentColorClass: 'bg-blue-50 text-blue-600',
        icon: <Icon name="students" className="text-blue-600" size="large" />
      },
      {
        title: 'Active Exams',
        value: numberFormatter.format(activeExamsCount),
        description: 'Currently in progress',
        accentColorClass: 'bg-violet-50 text-violet-600',
        icon: <Icon name="exams" className="text-violet-600" size="large" />
      },
      {
        title: 'Certificates Issued',
        value: numberFormatter.format(certificatesIssued ?? 0),
        description: 'Issued in the last 12 months',
        accentColorClass: 'bg-emerald-50 text-emerald-600',
        icon: (
          <Icon name="certificates" className="text-emerald-600" size="large" />
        )
      }
    ],
    [activeExamsCount, certificatesIssued, totalStudents]
  )

  const shouldShowExamToggle = totalExamCount > MAX_VISIBLE_EXAMS

  const handleToggleVisibleExams = useCallback(() => {
    setShowAllExams((prev) => !prev)
  }, [])

  const handleExamSelect = useCallback(
    (exam: ExamPerformanceRecord) => {
      if (!hasInteractiveExamData) {
        return
      }

      if (!exam.examId || exam.examId.startsWith('placeholder')) {
        return
      }

      router.push(`/dashboard/teacher/exams/${exam.examId}/results`)
    },
    [hasInteractiveExamData, router]
  )

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section>
        <ExamPerformanceChart
          records={examPerformanceRecords}
          summary={examPerformanceSummary}
          headerActions={
            shouldShowExamToggle ? (
              <Button
                variant="outline"
                size="small"
                onClick={handleToggleVisibleExams}
              >
                {showAllExams
                  ? 'Show latest 10 exams'
                  : `View all ${totalExamCount} exams`}
              </Button>
            ) : null
          }
          onExamSelect={hasInteractiveExamData ? handleExamSelect : undefined}
        />
      </section>
    </div>
  )
}
