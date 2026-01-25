import React from 'react'
import { BadgeProps, BadgeVariant } from './Badge.types'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-rose-100 text-rose-600'
}

/**
 * Display a small pill-shaped badge with contextual styling.
 */
const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  className = ''
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium capitalize ${variantClasses[variant]} ${className}`.trim()}
    >
      {label}
    </span>
  )
}

export default Badge
