import { type ReactNode } from 'react'
import { type ColProps } from 'antd'

export interface FilterOption {
  key: string
  content: ReactNode
  colProps?: ColProps
}

export interface FilterBarProps {
  options: FilterOption[]
  className?: string
}
