import { ResetPasswordForm } from '@/components/molecules'
import { Link } from '@/components/atoms'
import { ResetPasswordCardProps } from './ResetPasswordCard.types'
import Image from 'next/image'

const ResetPasswordCard: React.FC<ResetPasswordCardProps> = ({
  onSubmit,
  loading = false,
  error,
  successMessage,
  disabled = false,
  tokenMissingMessage,
  className = ''
}) => {
  const isFormDisabled = disabled || Boolean(tokenMissingMessage)

  return (
    <div
      className={`
      bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-auto
      ${className}
    `}
    >
      <div className="text-center mb-8">
        <Image
          src="/academix-logo-white.png"
          alt="Academix Logo"
          width={64}
          height={64}
          className="mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Reset your password
        </h1>
        <p className="text-gray-500 text-sm lg:text-base">
          Choose a strong password to secure your Academix account.
        </p>
      </div>

      {tokenMissingMessage && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
          {tokenMissingMessage}{' '}
          <Link href="/forgot-password" className="font-medium text-yellow-900">
            Request a new link
          </Link>
          .
        </div>
      )}

      <ResetPasswordForm
        onSubmit={onSubmit}
        loading={loading}
        error={error}
        successMessage={successMessage}
        disabled={isFormDisabled}
      />

      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm lg:text-base">
          Remembered your password?{' '}
          <Link href="/login" className="font-medium">
            Return to login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordCard
