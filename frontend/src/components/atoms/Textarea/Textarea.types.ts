export interface TextareaProps {
  id?: string
  name?: string
  value?: string
  placeholder?: string
  rows?: number
  maxLength?: number
  disabled?: boolean
  required?: boolean
  className?: string
  onChange?: (value: string) => void
}
