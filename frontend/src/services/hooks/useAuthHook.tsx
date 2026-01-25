import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/stores/auth'
import { clearAuth } from '@/services/utils/auth.utils'

export const useAuthHook = () => {
  const router = useRouter()
  const { clearUser } = useAuth()

  useEffect(() => {
    const handleSessionExpired = async () => {
      try {
        // Clear auth data
        clearAuth()
        clearUser()
      } catch (error) {
        console.error('Clear auth failed:', error)
      }

      // Redirect to login
      router.push('/login')
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-expired', handleSessionExpired)

      return () => {
        window.removeEventListener('auth:session-expired', handleSessionExpired)
      }
    }
  }, [router, clearUser])
}
