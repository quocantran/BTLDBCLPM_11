import type { Dayjs } from 'dayjs'

export interface DateTimePickerProps {
  value?: Dayjs | null
  placeholder?: string
  disabled?: boolean
  className?: string
  onChange?: (value: Dayjs | null, dateString: string | string[]) => void
}
