'use client'

import type { ReactNode } from 'react'
import { App as AntdApp, ConfigProvider } from 'antd'

interface AntdProviderProps {
  children: ReactNode
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  )
}
