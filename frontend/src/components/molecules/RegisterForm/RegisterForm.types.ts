export interface RegisterFormData {
  fullName: string
  username: string
  email: string
  password: string
  confirmPassword: string
  role: 'student' | 'teacher'
  agreeToTerms: boolean
}

export interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void
  loading?: boolean
  error?: string
  className?: string
}
