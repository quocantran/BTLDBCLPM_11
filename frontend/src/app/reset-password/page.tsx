'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ResetPasswordCard } from '@/components/organisms'
import { useResetPasswordApi, parseApiError } from '@/services'
import type { ResetPasswordRequest } from '@/services'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const tokenMissing = !token
  const router = useRouter()

  const resetPasswordMutation = useResetPasswordApi()
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)

  const handleResetPassword = async (
    formData: Omit<ResetPasswordRequest, 'token'>
  ) => {
    if (tokenMissing) {
      setErrorMessage('Reset link is missing or has expired.')
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')

      const response = await resetPasswordMutation.mutateAsync({
        data: {
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }
      })

      if (response?.success) {
        setSuccessMessage(
          response.message || 'Password updated successfully. Redirecting...'
        )
        setIsComplete(true)
      } else {
        setErrorMessage(
          response?.message || 'We could not update your password right now.'
        )
      }
    } catch (err: unknown) {
      const message = parseApiError(err)
      setErrorMessage(message)
    }
  }

  useEffect(() => {
    if (!isComplete) return

    const timer = setTimeout(() => {
      router.push('/login')
    }, 2000)

    return () => clearTimeout(timer)
  }, [isComplete, router])

  return (
    <>
      <ResetPasswordCard
        onSubmit={handleResetPassword}
        loading={resetPasswordMutation.isPending}
        error={errorMessage || undefined}
        successMessage={successMessage || undefined}
        disabled={tokenMissing || isComplete}
        tokenMissingMessage={
          tokenMissing ? 'The reset link is missing or has expired.' : undefined
        }
      />

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          © 2025 Academix. All rights reserved.
        </p>
      </div>
    </>
  )
}
