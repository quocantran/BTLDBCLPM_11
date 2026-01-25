'use client'

import { useMemo, useState } from 'react'
import { Empty, Pagination, Spin } from 'antd'
import { Button } from '@/components/atoms'
import {
  type NotificationCategory,
  type NotificationListParams,
  useMarkAllNotificationsRead,
  useNotifications
} from '@/services/api/notification.api'
import { useRouter } from 'next/navigation'

const categoryFilters: Array<{
  label: string
  value: 'all' | NotificationCategory
}> = [
  { label: 'All', value: 'all' },
  { label: 'Exams', value: 'exam' },
  { label: 'Certificates', value: 'certificate' },
  { label: 'System', value: 'system' }
]

const statusFilters = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' }
] as const

const PAGE_SIZE = 10

const formatDateTime = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso))
  } catch (error) {
    void error
    return iso
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<'all' | NotificationCategory>('all')
  const [status, setStatus] =
    useState<(typeof statusFilters)[number]['value']>('all')

  const queryParams: NotificationListParams = useMemo(() => {
    return {
      page,
      limit: PAGE_SIZE,
      ...(category !== 'all' ? { category } : {}),
      ...(status !== 'all'
        ? {
            isRead: status === 'read'
          }
        : {})
    }
  }, [category, page, status])

  const { data, isLoading, isFetching, isError, refetch } = useNotifications(
    queryParams,
    {
      staleTime: 15_000,
      refetchOnMount: 'always'
    }
  )

  const notifications = data?.data.notifications ?? []
  const total = data?.data.total ?? 0

  const markAllRead = useMarkAllNotificationsRead({
    onSuccess: async () => {
      await refetch()
    }
  })

  const handleCategoryChange = (value: 'all' | NotificationCategory) => {
    setCategory(value)
    setPage(1)
  }

  const handleStatusChange = (
    value: (typeof statusFilters)[number]['value']
  ) => {
    setStatus(value)
    setPage(1)
  }

  const handleViewNotification = (
    notificationId: string,
    notificationCategory: NotificationCategory
  ) => {
    router.push(
      `/dashboard/notifications/${notificationCategory}/${notificationId}`
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">Inbox</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-semibold text-slate-900">
            Notifications
          </h1>
          <Button
            size="small"
            variant="outline"
            disabled={!notifications.length || markAllRead.isPending}
            onClick={() => markAllRead.mutateAsync()}
          >
            Mark all as read
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          Stay up to date with exam lifecycle updates, certificate issuance, and
          system alerts delivered in real-time.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {categoryFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleCategoryChange(filter.value)}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    category === filter.value
                      ? 'border-slate-900 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleStatusChange(filter.value)}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    status === filter.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading || isFetching ? (
            <div className="flex h-40 items-center justify-center">
              <Spin />
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
              <p className="font-medium">Unable to load notifications.</p>
              <button
                type="button"
                className="mt-2 text-indigo-600 underline"
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10">
              <Empty
                description="No notifications in this view"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Notification</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        notification.isRead ? 'bg-white' : 'bg-indigo-50/40'
                      }`}
                      onClick={() =>
                        handleViewNotification(
                          notification.id,
                          notification.category
                        )
                      }
                    >
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium capitalize text-slate-600">
                            {notification.category}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                            {notification.type.replace(/_/g, ' ')}
                          </span>
                          {!notification.isRead && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-600">
                          {notification.message}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {notification.isRead ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            Read
                          </span>
                        ) : (
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                            Unread
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDateTime(notification.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleViewNotification(
                              notification.id,
                              notification.category
                            )
                          }}
                        >
                          View details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="mt-6 flex justify-end">
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                showSizeChanger={false}
                onChange={(value) => setPage(value)}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
