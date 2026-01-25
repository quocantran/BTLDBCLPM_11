import { ReactNode } from 'react'

export interface StatCardProps {
  title: string
  value: string
  description?: string
  icon?: ReactNode
  accentColorClass?: string
  className?: string
}
