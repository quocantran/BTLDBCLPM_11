export interface ForgotPasswordFormValues {
  email: string
}

export interface ForgotPasswordFormProps {
  onSubmit: (values: ForgotPasswordFormValues) => void
  loading?: boolean
  error?: string
  successMessage?: string
  className?: string
}
