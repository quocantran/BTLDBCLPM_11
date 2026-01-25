export interface QuestionPreviewChoice {
  id: string
  label: string
  isCorrect: boolean
}

export interface QuestionPreviewItemProps {
  index: number
  question: string
  choices: QuestionPreviewChoice[]
  onEdit?: () => void
  onDelete?: () => void
  onToggleCollapse?: () => void
  isExpanded?: boolean
}
