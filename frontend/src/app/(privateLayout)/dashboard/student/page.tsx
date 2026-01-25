'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/atoms/Button/Button'
import {
  CompletedExamsCard,
  ResultsTrendCard
} from '@/components/dashboard/student'
import { useStudentDashboard } from '@/services/api/dashboard.api'

const StudentDashboardPage = () => {
  const router = useRouter()

  const { data, isLoading, isError, refetch, isFetching } = useStudentDashboard(
    {
      staleTime: 60 * 1000
    }
  )

  const dashboard = data?.data

  const handleOpenSchedule = useCallback(() => {
    router.push('/dashboard/student/exams')
  }, [router])

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--dark-text)]">
            Student dashboard
          </h1>
          <p className="text-sm text-[var(--medium-text)] mt-1">
            Review your performance history and completed exams.
          </p>
        </div>
        <Button variant="primary" size="medium" onClick={handleOpenSchedule}>
          Go to exams
        </Button>
      </header>

      {isError ? (
        <section className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-700">
            Unable to load dashboard data
          </h2>
          <p className="text-sm text-red-600 mt-2">
            Please refresh to try again. If the issue persists, contact support.
          </p>
          <Button
            variant="secondary"
            size="small"
            className="mt-4"
            onClick={() => refetch()}
            loading={isFetching}
          >
            Retry
          </Button>
        </section>
      ) : null}

      <ResultsTrendCard
        performance={dashboard?.performance}
        isLoading={isLoading}
      />

      <CompletedExamsCard
        exams={dashboard?.completedExams ?? []}
        isLoading={isLoading}
      />
    </div>
  )
}

export default StudentDashboardPage
