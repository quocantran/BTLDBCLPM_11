'use client'

import { useEffect, ReactNode, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/stores/auth'
import { getAccessToken } from '@/services/utils/auth.utils'
import { useAuthHook } from '@/services/hooks/useAuthHook'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const { getUser, clearUser } = useAuth()
  const fetchingPathRef = useRef<string | null>(null)

  useAuthHook()

  useEffect(() => {
    const token = getAccessToken()

    if (!token) {
      clearUser()
      fetchingPathRef.current = null
      return
    }

    if (fetchingPathRef.current === pathname) {
      return
    }

    fetchingPathRef.current = pathname

    const fetchUser = async (path: string) => {
      try {
        await getUser()
      } finally {
        if (fetchingPathRef.current === path) {
          fetchingPathRef.current = null
        }
      }
    }

    fetchUser(pathname)
  }, [pathname, clearUser, getUser])

  return <>{children}</>
}
