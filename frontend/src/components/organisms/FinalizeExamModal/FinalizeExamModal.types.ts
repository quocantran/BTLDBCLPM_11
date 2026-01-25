import type { Dayjs } from 'dayjs'
import type { SelectOption } from '@/components/atoms'

export interface FinalizeExamFormValues {
  courseId?: string
  durationMinutes?: number
  startTime?: Dayjs | null
  endTime?: Dayjs | null
  rateScore?: number
}

export interface FinalizeExamModalProps {
  open: boolean
  loading?: boolean
  courseOptions: SelectOption[]
  initialValues?: Partial<FinalizeExamFormValues>
  onClose: () => void
  onSubmit: (values: FinalizeExamFormValues) => void
}
