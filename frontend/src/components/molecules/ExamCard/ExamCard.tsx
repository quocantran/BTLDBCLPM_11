// src/components/molecules/ExamCard.tsx
import type { Exam } from '@/app/(privateLayout)/dashboard/student/exams/types/exam.types'
import { Button, Icon } from '@/components/atoms'

interface ExamCardProps {
  exam: Exam
  onStartClick: (exam: Exam) => void
  isActive: boolean
}

export const ExamCard = ({ exam, isActive, onStartClick }: ExamCardProps) => {
  const formattedStartTime = exam.startTime.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-grow">
        <h3 className="text-xl font-semibold text-[var(--dark-text)]">
          {exam.title}
        </h3>
        <p className="text-sm text-[var(--medium-text)] mt-1">
          {exam.courseCode}
        </p>
        <div className="flex items-center gap-6 mt-4 text-sm text-[var(--medium-text)]">
          <div className="flex items-center gap-2">
            {/* <span className="material-symbols-outlined text-lg">schedule</span> */}
            <span>{exam.durationInMinutes} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            {/* <span className="material-symbols-outlined text-lg">calendar_today</span> */}
            <span>Starts: {formattedStartTime}</span>
          </div>
        </div>
      </div>
      <Button
        variant="primary"
        size="medium"
        disabled={!isActive}
        onClick={() => onStartClick(exam)}
        className="w-full sm:w-auto"
      >
        Start Exam
      </Button>
    </div>
  )
}
