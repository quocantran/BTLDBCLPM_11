import type {
  ForgotPasswordFormProps,
  ForgotPasswordFormValues
} from '@/components/molecules'

export interface ForgotPasswordCardProps
  extends Pick<
    ForgotPasswordFormProps,
    'onSubmit' | 'loading' | 'error' | 'successMessage'
  > {
  className?: string
}

export type { ForgotPasswordFormValues as ForgotPasswordCardFormValues }
