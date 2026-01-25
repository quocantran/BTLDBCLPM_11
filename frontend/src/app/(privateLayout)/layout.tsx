// app/(privateLayout)/layout.tsx
'use client'

import React from 'react'
import { MainLayout } from '@/components/organisms'

export default function MainLayoutWrapper({
  children
}: {
  children: React.ReactNode
}) {
  return <MainLayout initialActiveItem="dashboard">{children}</MainLayout>
}
