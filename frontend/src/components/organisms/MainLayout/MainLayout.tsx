// src/components/organisms/MainLayout/MainLayout.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { Navbar, Sidebar } from '@/components/molecules'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/stores/auth'
import type { MainLayoutProps } from '@/components/organisms/MainLayout/MainLayout.types'
import { resolveActiveSidebarItem } from '@/utils/navigation'

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className = '',
  initialActiveItem = 'dashboard'
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const [activeItem, setActiveItem] = useState<string | null>(() => {
    return resolveActiveSidebarItem(pathname) ?? initialActiveItem ?? null
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    const resolvedItem = resolveActiveSidebarItem(pathname)
    setActiveItem(resolvedItem ?? null)
  }, [pathname])

  const handleLogoClick = () => {
    router.push('/')
  }

  const handleSidebarItemClick = (itemId: string, itemHref: string) => {
    setActiveItem(itemId)
    router.push(itemHref)
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <div
      className={`flex h-screen w-full overflow-hidden bg-gray-50 ${className}`}
    >
      {/* ... Mobile Sidebar Toggle & Overlay ... */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-4 left-4 z-40 p-2 cursor-pointer bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-600"
        >
          <path
            d="M3 12h18M3 6h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`
        ${isSidebarCollapsed ? 'w-16' : 'w-60'} 
        transition-all duration-300 ease-in-out
        fixed lg:relative z-30 h-screen
        ${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}
        
      `}
      >
        <Sidebar
          activeItem={activeItem ?? ''}
          onItemClick={handleSidebarItemClick}
          isCollapsed={isSidebarCollapsed}
          onLogoClick={handleLogoClick}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex h-screen flex-1 flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
