import { Card, Typography, Divider, Badge, Progress } from 'antd'
import { QuestionIndicator, QuestionStatus } from '@/components/atoms/QuestionIndicator'

const { Title, Text } = Typography

export interface QuestionAnswer {
  questionId: string
  selectedChoiceIndex: number | null
}

export interface QuestionNavigatorProps {
  /** Total number of questions */
  totalQuestions: number
  /** Current question index (0-indexed) */
  currentQuestionIndex: number
  /** Array of student answers */
  answers: QuestionAnswer[]
  /** Callback when a question is clicked */
  onQuestionClick: (index: number) => void
  /** Optional title */
  title?: string
  /** Additional class names */
  className?: string
}

/**
 * QuestionNavigator - Molecule component
 * Displays a grid of question indicators showing answered/unanswered status
 */
export const QuestionNavigator = ({
  totalQuestions,
  currentQuestionIndex,
  answers,
  onQuestionClick,
  title = 'Question Navigator',
  className
}: QuestionNavigatorProps) => {
  // Calculate statistics
  const answeredCount = answers.filter(a => a.selectedChoiceIndex !== null).length
  const unansweredCount = totalQuestions - answeredCount
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100)

  // Determine status for each question
  const getQuestionStatus = (index: number): QuestionStatus => {
    if (index === currentQuestionIndex) return 'current'
    if (answers[index]?.selectedChoiceIndex !== null) return 'answered'
    return 'unanswered'
  }

  return (
    <Card 
      className={className}
      styles={{
        body: { padding: '16px' }
      }}
    >
      {/* Header */}
      <Title level={5} className="!mb-3 !text-[var(--dark-text)]">
        {title}
      </Title>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <Text type="secondary">Progress</Text>
          <Text strong>{answeredCount}/{totalQuestions}</Text>
        </div>
        <Progress 
          percent={progressPercent} 
          showInfo={false}
          strokeColor="var(--primary-color)"
          trailColor="#e5e7eb"
          size="small"
        />
      </div>

      <Divider className="!my-3" />

      {/* Question Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, index) => (
          <QuestionIndicator
            key={index}
            number={index + 1}
            status={getQuestionStatus(index)}
            onClick={() => onQuestionClick(index)}
          />
        ))}
      </div>

      <Divider className="!my-3" />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[var(--primary-color)]" />
          <Text type="secondary">Answered ({answeredCount})</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white" />
          <Text type="secondary">Unanswered ({unansweredCount})</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-[var(--primary-color)] bg-blue-50" />
          <Text type="secondary">Current</Text>
        </div>
      </div>
    </Card>
  )
}

export default QuestionNavigator
