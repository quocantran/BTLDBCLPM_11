import React from 'react'
import { NotificationProps } from './Notification.types'

export const Notification: React.FC<NotificationProps> = ({
  className = '',
  hasNotification = false,
  count,
  isConnected = true,
  onClick
}) => {
  const hasCount = typeof count === 'number' && count > 0
  const displayLabel = hasCount ? (count > 99 ? '99+' : String(count)) : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
      aria-label="Notifications"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-gray-600"
        aria-hidden="true"
      >
        <path
          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.73 21a2 2 0 0 1-3.46 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {displayLabel ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] px-1 h-5 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center">
          {displayLabel}
        </span>
      ) : hasNotification ? (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full" />
      ) : null}

      <span
        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
          isConnected ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
        aria-hidden="true"
      />
    </button>
  )
}
