export interface LoginFormData {
  identifier: string // Email hoặc username
  password: string
  rememberMe: boolean
}

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void
  loading?: boolean
  error?: string
  className?: string
}
