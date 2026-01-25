'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/stores/auth'
import { getAccessToken } from '@/services/utils/auth.utils'
import type {
  NotificationEntity,
  NotificationUnreadCountResponse
} from '@/services/api/notification.api'

interface NotificationSocketContextValue {
  isConnected: boolean
  lastNotification: NotificationEntity | null
}

const NotificationSocketContext = createContext<NotificationSocketContextValue>(
  {
    isConnected: false,
    lastNotification: null
  }
)

const deriveSocketBaseUrl = (): string => {
  const explicitUrl =
    process.env.NEXT_PUBLIC_NOTIFICATIONS_WS_ENDPOINT ??
    process.env.NEXT_PUBLIC_SOCKET_ENDPOINT

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '')
  }

  const restEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT
  if (restEndpoint) {
    return restEndpoint.replace(/\/api\/v?\d*$/i, '').replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

export const NotificationSocketProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastNotification, setLastNotification] =
    useState<NotificationEntity | null>(null)

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect()
      }
      setSocket(null)
      setIsConnected(false)
      setLastNotification(null)
      return
    }

    const token = getAccessToken()
    if (!token) {
      return
    }

    const baseUrl = deriveSocketBaseUrl()
    if (!baseUrl) {
      console.warn('Missing websocket endpoint for notifications')
      return
    }

    const client = io(`${baseUrl}/notifications`, {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    })

    const handleConnect = () => setIsConnected(true)
    const handleDisconnect = () => setIsConnected(false)

    const handleNewNotification = (notification: NotificationEntity) => {
      setLastNotification(notification)
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          Array.isArray(queryKey) &&
          queryKey[0] === 'notifications' &&
          queryKey[1] === 'list'
      })
    }

    const handleUnreadUpdate = ({ unread }: { unread: number }) => {
      queryClient.setQueryData<NotificationUnreadCountResponse>(
        ['notifications', 'unread-count'],
        (previous) => ({
          success: previous?.success ?? true,
          message: previous?.message ?? 'Unread notification count',
          data: { unread }
        })
      )
    }

    client.on('connect', handleConnect)
    client.on('disconnect', handleDisconnect)
    client.on('notifications:new', handleNewNotification)
    client.on('notifications:unread', handleUnreadUpdate)

    setSocket(client)

    return () => {
      client.off('connect', handleConnect)
      client.off('disconnect', handleDisconnect)
      client.off('notifications:new', handleNewNotification)
      client.off('notifications:unread', handleUnreadUpdate)
      client.disconnect()
    }
  }, [user?.id])

  const value = useMemo(
    () => ({
      isConnected,
      lastNotification
    }),
    [isConnected, lastNotification]
  )

  return (
    <NotificationSocketContext.Provider value={value}>
      {children}
    </NotificationSocketContext.Provider>
  )
}

export const useNotificationSocket = () => useContext(NotificationSocketContext)
