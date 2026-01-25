'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Empty, Spin } from 'antd'
import { useParams, useRouter } from 'next/navigation'
import { Button, Icon } from '@/components/atoms'
import {
  type NotificationCategory,
  useMarkNotificationRead,
  useNotification
} from '@/services/api/notification.api'

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

const normalizeCategory = (value?: string): NotificationCategory => {
  if (value === 'exam' || value === 'certificate' || value === 'system') {
    return value
  }
  return 'system'
}

export default function NotificationDetailPage() {
  const params = useParams<{ category: string; notificationId: string }>()
  const router = useRouter()
  const notificationId = Array.isArray(params?.notificationId)
    ? params?.notificationId[0]
    : params?.notificationId
  const categoryParam = Array.isArray(params?.category)
    ? params?.category[0]
    : params?.category

  const category = normalizeCategory(categoryParam)

  const { data, isLoading, isFetching, isError } = useNotification(
    notificationId ?? '',
    {
      enabled: Boolean(notificationId)
    }
  )

  const notification = data?.data.notification

  const markRead = useMarkNotificationRead()
  const markedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!notification?.id || notification.isRead) {
      return
    }

    if (markedRef.current === notification.id) {
      return
    }

    markedRef.current = notification.id
    void markRead.mutateAsync({ id: notification.id })
  }, [markRead, notification?.id, notification?.isRead])

  const metadataEntries = useMemo(() => {
    if (!notification?.metadata || typeof notification.metadata !== 'object') {
      return []
    }

    return Object.entries(notification.metadata)
      .filter(([key]) => key !== '__v')
      .map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      }))
  }, [notification?.metadata])

  const renderCategoryPanel = () => {
    if (!notification) return null

    const metadata = (notification.metadata ?? {}) as Record<string, unknown>

    if (category === 'exam') {
      const fromStatus = String(metadata.fromStatus ?? 'scheduled')
      const toStatus = String(metadata.toStatus ?? 'active')
      const examTitle = String(metadata.examTitle ?? 'Exam update')
      const triggeredAt = String(metadata.triggeredAt ?? notification.createdAt)
      return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Exam status change
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {examTitle}
          </h3>
          <dl className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                From status
              </dt>
              <dd className="mt-1 capitalize">
                {fromStatus.replace(/_/g, ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                To status
              </dt>
              <dd className="mt-1 capitalize">{toStatus.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Triggered at
              </dt>
              <dd className="mt-1">{formatDateTime(triggeredAt)}</dd>
            </div>
          </dl>
        </div>
      )
    }

    if (category === 'certificate') {
      const courseName = String(metadata.courseName ?? 'Course')
      const examTitle = String(metadata.examTitle ?? 'Exam')
      const issuedAt = String(metadata.issuedAt ?? notification.createdAt)
      return (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Certificate issued
          </p>
          <h3 className="mt-2 text-lg font-semibold text-emerald-900">
            {courseName}
          </h3>
          <dl className="mt-4 grid gap-4 text-sm text-emerald-900 md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Exam
              </dt>
              <dd className="mt-1">{examTitle}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Certificate ID
              </dt>
              <dd className="mt-1 font-mono text-xs">
                {notification.certificateId ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Issued at
              </dt>
              <dd className="mt-1">{formatDateTime(issuedAt)}</dd>
            </div>
          </dl>
        </div>
      )
    }

    if (metadataEntries.length > 0) {
      return (
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Additional context
          </p>
          <dl className="mt-3 grid gap-4 text-sm md:grid-cols-2">
            {metadataEntries.map((entry) => (
              <div key={entry.key}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {entry.key}
                </dt>
                <dd className="mt-1 break-all text-slate-700">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )
    }

    return null
  }

  if (isLoading || isFetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    )
  }

  if (isError || !notification) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <Empty description="Notification not found" />
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/notifications')}
        >
          Back to notifications
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        onClick={() => router.push('/dashboard/notifications')}
      >
        <Icon name="arrow-left" className="text-slate-500" size="small" />
        Back to notifications
      </button>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {category} update
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              {notification.title}
            </h1>
            <p className="text-sm text-slate-500">
              Received {formatDateTime(notification.createdAt)}
            </p>
          </div>
          <span
            className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${
              notification.isRead
                ? 'bg-slate-100 text-slate-600'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {notification.isRead ? 'Read' : 'Unread'}
          </span>
        </div>

        <div className="space-y-6 p-6">
          <p className="text-base text-slate-700">{notification.message}</p>
          {renderCategoryPanel()}

          {notification.actionUrl ? (
            <Button
              variant="primary"
              size="medium"
              onClick={() =>
                router.push(notification.actionUrl ?? '/dashboard')
              }
              className="w-full md:w-auto"
            >
              Open related view
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  )
}
