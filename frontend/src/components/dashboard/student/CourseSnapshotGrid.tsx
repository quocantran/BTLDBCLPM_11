import type { StudentDashboardCourseSnapshot } from '@/services/types'

interface CourseSnapshotGridProps {
  courses: StudentDashboardCourseSnapshot[]
  isLoading?: boolean
}

const formatScore = (score?: number | null) => {
  if (typeof score !== 'number') return '—'
  return `${score.toFixed(1)}%`
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric'
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

export const CourseSnapshotGrid = ({
  courses,
  isLoading
}: CourseSnapshotGridProps) => {
  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--medium-text)]">
            Courses
          </p>
          <h3 className="text-xl font-semibold text-[var(--dark-text)]">
            Snapshot
          </h3>
        </div>
        <span className="text-sm text-[var(--medium-text)]">
          {courses.length} active course{courses.length === 1 ? '' : 's'}
        </span>
      </div>

      {!courses.length ? (
        <p className="text-sm text-[var(--medium-text)] mt-6">
          Enroll in a course to see your progress snapshot here.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {courses.map((course) => (
            <article
              key={course.courseId}
              className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-3"
            >
              <div>
                <p className="text-xs text-[var(--medium-text)] uppercase">
                  {course.coursePublicId}
                </p>
                <h4 className="text-lg font-semibold text-[var(--dark-text)]">
                  {course.courseName}
                </h4>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-[var(--medium-text)]">Upcoming</p>
                  <p className="font-semibold text-[var(--dark-text)]">
                    {course.upcomingExamCount}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--medium-text)]">Completed</p>
                  <p className="font-semibold text-[var(--dark-text)]">
                    {course.completedExamCount}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--medium-text)]">Avg score</p>
                  <p className="font-semibold text-[var(--dark-text)]">
                    {formatScore(course.averageScore)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--medium-text)]">
                Last submission · {formatDate(course.lastSubmissionAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
