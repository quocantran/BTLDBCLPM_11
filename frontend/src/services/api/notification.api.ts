import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions
} from '@tanstack/react-query'
import { type ApiParamsProps, NotificationService } from '../index'

export type NotificationAudience = 'student' | 'teacher' | 'admin'
export type NotificationCategory = 'exam' | 'certificate' | 'system'
export type NotificationType =
  | 'exam_scheduled_to_active'
  | 'exam_active_to_completed'
  | 'certificate_issued'
  | 'generic'

export interface NotificationEntity {
  id: string
  recipientId: string
  audience: NotificationAudience
  category: NotificationCategory
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  examId?: string
  certificateId?: string
  metadata?: Record<string, unknown>
  isRead: boolean
  readAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationListResponse {
  success: boolean
  data: {
    notifications: NotificationEntity[]
    total: number
    page: number
    limit: number
  }
  message: string
}

export interface NotificationDetailResponse {
  success: boolean
  data: {
    notification: NotificationEntity
  }
  message: string
}

export interface NotificationListParams extends ApiParamsProps {
  page?: number
  limit?: number
  category?: NotificationCategory
  type?: NotificationType
  isRead?: boolean
}

export const useNotifications = (
  params: NotificationListParams,
  options?: Omit<
    UseQueryOptions<NotificationListResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: ['notifications', 'list', params],
    queryFn: () =>
      NotificationService.apiMethod.get<NotificationListResponse>({
        url: '',
        params
      }),
    ...options
  })
}

export const useNotification = (
  id: string,
  options?: Omit<
    UseQueryOptions<NotificationDetailResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: ['notifications', 'detail', id],
    queryFn: () =>
      NotificationService.apiMethod.get<NotificationDetailResponse>({
        url: `/${id}`
      }),
    enabled: Boolean(id),
    ...options
  })
}

export interface NotificationUnreadCountResponse {
  success: boolean
  data: {
    unread: number
  }
  message: string
}

export const useNotificationUnreadCount = (
  options?: Omit<
    UseQueryOptions<NotificationUnreadCountResponse>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      NotificationService.apiMethod.get<NotificationUnreadCountResponse>({
        url: '/unread-count'
      }),
    refetchOnReconnect: true,
    refetchInterval: 60000,
    ...options
  })
}

export interface MarkNotificationReadResponse {
  success: boolean
  data: {
    notification: NotificationEntity
  }
  message: string
}

export interface MarkNotificationReadVariables {
  id: string
}

export const useMarkNotificationRead = (
  options?: UseMutationOptions<
    MarkNotificationReadResponse,
    unknown,
    MarkNotificationReadVariables,
    unknown
  >
) => {
  return useMutation({
    mutationFn: async ({ id }: MarkNotificationReadVariables) => {
      return NotificationService.apiMethod.patch<MarkNotificationReadResponse>({
        url: `/${id}/read`,
        data: {}
      })
    },
    ...options
  })
}

export interface MarkAllNotificationsReadResponse {
  success: boolean
  data: {
    updated: number
  }
  message: string
}

export const useMarkAllNotificationsRead = (
  options?: UseMutationOptions<
    MarkAllNotificationsReadResponse,
    unknown,
    void,
    unknown
  >
) => {
  return useMutation({
    mutationFn: async () => {
      return NotificationService.apiMethod.patch<MarkAllNotificationsReadResponse>(
        {
          url: '/mark-all-read',
          data: {}
        }
      )
    },
    ...options
  })
}
