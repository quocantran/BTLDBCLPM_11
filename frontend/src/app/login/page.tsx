'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginCard } from '@/components/organisms'
import { useLoginApi, saveTokens, parseApiError } from '@/services'
import type { LoginRequest } from '@/services'
import { useAuth } from '@/stores/auth'

export default function LoginPage() {
  const router = useRouter()
  const loginMutation = useLoginApi()
  const [errorMessage, setErrorMessage] = useState<string>('')
  const { setUser } = useAuth()

  const handleLogin = async (
    formData: LoginRequest & { rememberMe: boolean }
  ) => {
    try {
      // Reset error message
      setErrorMessage('')

      // Extract only needed fields for API
      const { identifier, password } = formData

      const response = await loginMutation.mutateAsync({
        data: { identifier, password }
      })

      if (response.success) {
        // Persist tokens
        saveTokens(response.data.accessToken, response.data.refreshToken)
        setUser(response.data.user)

        // Redirect based on role
        const dashboardUrl =
          response.data.user.role === 'teacher'
            ? '/dashboard/teacher'
            : '/dashboard/student'
        router.push(dashboardUrl)
      } else {
        // Backend returned success: false (rare case)
        setErrorMessage(response.message || 'Login failed')
      }
    } catch (err: any) {
      console.error('Login error:', err)

      // Parse error message from backend
      const errorMsg = parseApiError(err)
      setErrorMessage(errorMsg)
    }
  }

  return (
    <>
      <LoginCard
        onSubmit={handleLogin}
        loading={loginMutation.isPending}
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
