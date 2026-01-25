import React from 'react'
import { StatCardProps } from './StatCard.types'

/**
 * Compact summary card used for dashboard metrics.
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  accentColorClass = 'bg-blue-100 text-blue-600',
  className = ''
}) => {
  return (
    <article
      className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm transition-colors duration-200 hover:border-blue-200 hover:shadow-md ${className}`.trim()}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-3xl font-semibold text-slate-900">{value}</h3>
        {description && (
          <p className="text-sm text-slate-500 !mb-0">{description}</p>
        )}
      </div>
      {icon && (
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${accentColorClass}`.trim()}
        >
          {icon}
        </div>
      )}
    </article>
  )
}

export default StatCard
