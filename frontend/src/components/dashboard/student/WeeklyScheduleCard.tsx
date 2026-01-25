import Button from '@/components/atoms/Button/Button'

interface WeeklyScheduleExam {
  examId: string
  title: string
  startTime: string
  course: {
    name: string
  }
  isActive: boolean
}

interface WeeklyScheduleCardProps {
  exams: WeeklyScheduleExam[]
  isLoading?: boolean
  onStartExam: (exam: WeeklyScheduleExam) => void
}

const formatScheduleTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

export const WeeklyScheduleCard = ({
  exams,
  isLoading,
  onStartExam
}: WeeklyScheduleCardProps) => {
  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-14 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm h-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--medium-text)]">
            This week
          </p>
          <h3 className="text-xl font-semibold text-[var(--dark-text)]">
            Upcoming exams
          </h3>
        </div>
      </div>

      {!exams.length ? (
        <p className="text-sm text-[var(--medium-text)] mt-6">
          You are all caught up. No exams scheduled in the next 7 days.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {exams.map((exam) => (
            <li
              key={exam.examId}
              className="flex flex-col lg:flex-row lg:items-center gap-4 border border-gray-100 rounded-xl p-4"
            >
              <div className="flex-1">
                <p className="text-sm text-[var(--medium-text)]">
                  {formatScheduleTime(exam.startTime)}
                </p>
                <p className="text-base font-semibold text-[var(--dark-text)]">
                  {exam.title}
                </p>
                <p className="text-sm text-[var(--medium-text)]">
                  {exam.course.name}
                </p>
              </div>
              <Button
                size="small"
                variant={exam.isActive ? 'primary' : 'outline'}
                disabled={!exam.isActive}
                onClick={() => onStartExam(exam)}
                className="w-full lg:w-auto"
              >
                {exam.isActive ? 'Start now' : 'Not active yet'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
