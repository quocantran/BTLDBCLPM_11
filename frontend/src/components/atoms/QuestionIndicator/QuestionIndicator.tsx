import { Badge } from 'antd'
import classNames from 'classnames'

export type QuestionStatus = 'unanswered' | 'answered' | 'current'

export interface QuestionIndicatorProps {
  /** Question number (1-indexed) */
  number: number
  /** Current status of the question */
  status: QuestionStatus
  /** Click handler */
  onClick?: () => void
  /** Additional class names */
  className?: string
}

/**
 * QuestionIndicator - Atom component
 * Displays a single question number with visual status indicator
 */
export const QuestionIndicator = ({
  number,
  status,
  onClick,
  className
}: QuestionIndicatorProps) => {
  const baseClasses = classNames(
    'w-10 h-10 flex items-center justify-center',
    'text-sm font-medium rounded-lg cursor-pointer',
    'transition-all duration-200 ease-in-out',
    'hover:scale-105 hover:shadow-md',
    {
      // Unanswered - gray outline
      'bg-white border-2 border-gray-300 text-gray-600 hover:border-gray-400':
        status === 'unanswered',
      // Answered - primary color filled
      'bg-[var(--primary-color)] border-2 border-[var(--primary-color)] text-white':
        status === 'answered',
      // Current - primary outline with background
      'bg-blue-50 border-2 border-[var(--primary-color)] text-[var(--primary-color)] ring-2 ring-blue-200':
        status === 'current'
    },
    className
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
      aria-label={`Question ${number}, ${status}`}
    >
      {number}
    </button>
  )
}

export default QuestionIndicator
