import type {
  ResetPasswordFormProps,
  ResetPasswordFormValues
} from '@/components/molecules'

export interface ResetPasswordCardProps
  extends Pick<
    ResetPasswordFormProps,
    'onSubmit' | 'loading' | 'error' | 'successMessage'
  > {
  disabled?: boolean
  tokenMissingMessage?: string
  className?: string
}

export type { ResetPasswordFormValues as ResetPasswordCardFormValues }
