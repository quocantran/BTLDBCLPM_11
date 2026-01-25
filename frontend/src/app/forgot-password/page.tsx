'use client'

import { useState } from 'react'
import { ForgotPasswordCard } from '@/components/organisms'
import { useForgotPasswordApi, parseApiError } from '@/services'
import type { ForgotPasswordRequest } from '@/services'

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPasswordApi()
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  const handleForgotPassword = async (formData: ForgotPasswordRequest) => {
    try {
      setErrorMessage('')
      setSuccessMessage('')

      const response = await forgotPasswordMutation.mutateAsync({
        data: { email: formData.email.trim() }
      })

      if (response?.success) {
        setSuccessMessage(
          response.message ||
            'If an account exists for that email, we just sent you reset instructions.'
        )
      } else {
        setErrorMessage(
          response?.message || 'We could not process your request right now.'
        )
      }
    } catch (err: unknown) {
      const errorMsg = parseApiError(err)
      setErrorMessage(errorMsg)
    }
  }

  return (
    <>
      <ForgotPasswordCard
        onSubmit={handleForgotPassword}
        loading={forgotPasswordMutation.isPending}
        error={errorMessage || undefined}
        successMessage={successMessage || undefined}
      />

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          © 2025 Academix. All rights reserved.
        </p>
      </div>
    </>
  )
}
