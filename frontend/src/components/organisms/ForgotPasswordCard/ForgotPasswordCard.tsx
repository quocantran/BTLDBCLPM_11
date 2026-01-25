import { ForgotPasswordForm } from '@/components/molecules'
import { Link } from '@/components/atoms'
import { ForgotPasswordCardProps } from './ForgotPasswordCard.types'
import Image from 'next/image'

const ForgotPasswordCard: React.FC<ForgotPasswordCardProps> = ({
  onSubmit,
  loading = false,
  error,
  successMessage,
  className = ''
}) => {
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
          Forgot your password?
        </h1>
        <p className="text-gray-500 text-sm lg:text-base">
          Enter the email associated with your account and we will send reset
          instructions.
        </p>
      </div>

      <ForgotPasswordForm
        onSubmit={onSubmit}
        loading={loading}
        error={error}
        successMessage={successMessage}
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

export default ForgotPasswordCard
