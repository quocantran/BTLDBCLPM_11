export interface InputProps {
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number'
  value?: string
  onChange?: (value: string) => void
  error?: string
  disabled?: boolean
  className?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  name?: string
  id?: string
  required?: boolean
  min?: number
  max?: number
}
