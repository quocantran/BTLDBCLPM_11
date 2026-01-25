export interface ResetPasswordFormValues {
  password: string
  confirmPassword: string
}

export interface ResetPasswordFormProps {
  onSubmit: (values: ResetPasswordFormValues) => void
  loading?: boolean
  error?: string
  successMessage?: string
  disabled?: boolean
  className?: string
}
