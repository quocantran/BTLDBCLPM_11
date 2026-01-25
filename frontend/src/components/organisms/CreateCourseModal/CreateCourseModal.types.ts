import type { Dayjs } from 'dayjs'
import type { SelectOption } from '@/components/atoms'

export interface CreateCourseFormValues {
  title: string
  code: string
  category?: string
  level?: string
  startDate: Dayjs | null
  endDate: Dayjs | null
  instructor?: string
  description?: string
}

export interface CreateCourseModalProps {
  open: boolean
  loading?: boolean
  categoryOptions: SelectOption[]
  levelOptions: SelectOption[]
  initialValues?: Partial<CreateCourseFormValues>
  onClose: () => void
  onSubmit: (values: CreateCourseFormValues) => void | Promise<void>
}
