import Link from 'next/link'
import type { StudentDashboardExamResult } from '@/services/types'

interface CompletedExamsCardProps {
  exams: StudentDashboardExamResult[]
  isLoading?: boolean
}

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

const resultBadgeClass = (result: 'Passed' | 'Failed') =>
  result === 'Passed'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700'

export const CompletedExamsCard = ({
  exams,
  isLoading
}: CompletedExamsCardProps) => {
  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--medium-text)]">
            Completed exams
          </p>
          <h3 className="text-xl font-semibold text-[var(--dark-text)]">
            Your latest results
          </h3>
        </div>
      </div>

      {!exams.length ? (
        <p className="text-sm text-[var(--medium-text)] mt-6">
          No graded exams yet. Your results will appear here as soon as you
          submit one.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {exams.slice(0, 3).map((result) => (
            <li
              key={`${result.examPublicId}-${result.submittedAt}`}
              className="border border-gray-100 rounded-xl p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-bold text-[var(--medium-text)]">
                    Course: {result.courseName}
                  </p>
                  <p className="text-base font-semibold text-[var(--dark-text)]">
                    {result.examTitle}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${resultBadgeClass(
                      result.result
                    )}`}
                  >
                    {result.result}
                  </span>
                  <span className="text-sm font-semibold text-[var(--dark-text)]">
                    {result.score.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center sm:gap-4">
                <p className="text-xs !mb-0 text-[var(--medium-text)]">
                  Submitted {formatDate(result.submittedAt)} · Code{' '}
                  {result.examPublicId}
                </p>
                <Link
                  href={`/dashboard/student/exams/${result.examPublicId}/result?submissionId=${result.submissionId}`}
                  className="text-sm p-2 border rounded-2xl text-blue-600 inline-block"
                >
                  View Details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
