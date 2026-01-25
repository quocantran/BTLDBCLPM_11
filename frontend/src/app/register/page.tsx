'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegisterCard } from '@/components/organisms'
import { useRegisterApi, parseApiError } from '@/services'
import type { RegisterRequest } from '@/services'

export default function RegisterPage() {
  const router = useRouter()
  const registerMutation = useRegisterApi()
  const [errorMessage, setErrorMessage] = useState<string>('')

  const handleRegister = async (
    formData: RegisterRequest & {
      confirmPassword: string
      agreeToTerms: boolean
    }
  ) => {
    try {
      // Reset error message
      setErrorMessage('')

      // Extract only needed fields for API
      const { fullName, username, email, password, role } = formData

      const response = await registerMutation.mutateAsync({
        data: { fullName, username, email, password, role }
      })

      if (response.success) {
        router.push('/login')
      } else {
        // Backend returned success: false (rare case)
        setErrorMessage(response.message || 'Registration failed')
      }
    } catch (err: any) {
      console.error('Register error:', err)

      // Parse error message from backend
      const errorMsg = parseApiError(err)
      setErrorMessage(errorMsg)
    }
  }

  return (
    <>
      <RegisterCard
        onSubmit={handleRegister}
        loading={registerMutation.isPending}
        error={errorMessage || undefined}
      />

      {/* Copyright */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          © 2025 Academix. All rights reserved.
        </p>
      </div>
    </>
  )
}
