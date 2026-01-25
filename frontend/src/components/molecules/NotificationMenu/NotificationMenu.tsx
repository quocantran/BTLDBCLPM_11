'use client'

import { useCallback, useMemo, useState } from 'react'
import { Dropdown, Empty, Spin } from 'antd'
import { useRouter } from 'next/navigation'
import { Notification } from '@/components/atoms'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationUnreadCount,
  useNotifications,
  type NotificationEntity
} from '@/services/api/notification.api'
import { useNotificationSocket } from '@/providers/NotificationProvider'

const formatRelativeTime = (isoDate: string): string => {
  const timestamp = Date.parse(isoDate)
  if (Number.isNaN(timestamp)) {
    return isoDate
  }

  const diffMs = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) {
    return 'Just now'
  }
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute)
    return `${minutes}m ago`
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour)
    return `${hours}h ago`
  }
  const days = Math.floor(diffMs / day)
  if (days < 7) {
    return `${days}d ago`
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit'
  }).format(timestamp)
}

const resolveNotificationTarget = (
  notification: NotificationEntity
): string => {
  const categoryPath = notification.category ?? 'system'
  return `/dashboard/notifications/${categoryPath}/${notification.id}`
}

const ITEM_LIMIT = 5

export const NotificationMenu = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { isConnected } = useNotificationSocket()

  const { data: unreadResponse } = useNotificationUnreadCount({
    staleTime: 30_000
  })
  const unreadCount = unreadResponse?.data.unread ?? 0

  const {
    data: listResponse,
    isLoading,
    isFetching,
    refetch
  } = useNotifications(
    { page: 1, limit: ITEM_LIMIT },
    {
      enabled: open,
      staleTime: 15_000
    }
  )

  const notifications = listResponse?.data.notifications ?? []

  const markReadMutation = useMarkNotificationRead({
    onSuccess: async () => {
      if (open) {
        await refetch()
      }
    }
  })

  const markAllReadMutation = useMarkAllNotificationsRead({
    onSuccess: async () => {
      await refetch()
    }
  })

  const handleNotificationClick = useCallback(
    async (notification: NotificationEntity) => {
      try {
        if (!notification.isRead) {
          await markReadMutation.mutateAsync({ id: notification.id })
        }
      } finally {
        setOpen(false)
        router.push(resolveNotificationTarget(notification))
      }
    },
    [markReadMutation, router]
  )

  const handleMarkAllRead = useCallback(() => {
    if (!notifications.length) return
    markAllReadMutation.mutateAsync()
  }, [markAllReadMutation, notifications.length])

  const handleViewAll = useCallback(() => {
    setOpen(false)
    router.push('/dashboard/notifications')
  }, [router])

  const dropdownOverlay = useMemo(() => {
    return (
      <div className="w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Notifications
            </p>
            <p className="text-xs text-slate-500">
              {isConnected ? 'Live updates enabled' : 'Realtime paused'}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:text-slate-300"
            disabled={!notifications.length || markAllReadMutation.isPending}
            onClick={handleMarkAllRead}
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-10">
              <Spin size="small" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8">
              <Empty
                description="No notifications yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100" role="list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      notification.isRead ? 'bg-white' : 'bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium capitalize">
                        {notification.category}
                      </span>
                      <span>{formatRelativeTime(notification.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {notification.message}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          className="w-full rounded-b-2xl border-t border-slate-100 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-slate-50"
          onClick={handleViewAll}
        >
          View all notifications
        </button>
      </div>
    )
  }, [
    handleMarkAllRead,
    handleNotificationClick,
    handleViewAll,
    isConnected,
    isFetching,
    isLoading,
    markAllReadMutation.isPending,
    notifications
  ])

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          void refetch()
        }
      }}
      dropdownRender={() => dropdownOverlay}
    >
      <div>
        <Notification count={unreadCount} isConnected={isConnected} />
      </div>
    </Dropdown>
  )
}
