import React from 'react'
import { Logo, MenuItem, Icon } from '@/components/atoms'
import type { SidebarProps } from '@/components/molecules/Sidebar/Sidebar.types'
import { useAuth } from '@/stores/auth'
import { usePathname } from 'next/navigation'

const studentMenuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Icon name="dashboard" />,
    href: '/dashboard/student/'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Icon name="notifications" />,
    href: '/dashboard/notifications'
  },
  {
    id: 'exams',
    label: 'Exams',
    icon: <Icon name="exams" />,
    href: '/dashboard/student/exams'
  },
  {
    id: 'certificates',
    label: 'Certificates',
    icon: <Icon name="certificates" />,
    href: '/certificate'
  }
]

const teacherMenuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Icon name="dashboard" />,
    href: '/dashboard/teacher/'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Icon name="notifications" />,
    href: '/dashboard/notifications'
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: <Icon name="courses" />,
    href: '/dashboard/teacher/courses'
  },
  {
    id: 'exams',
    label: 'Exams',
    icon: <Icon name="exams" />,
    href: '/dashboard/teacher/exams/'
  },
  {
    id: 'certificates',
    label: 'Certificates',
    icon: <Icon name="certificates" />,
    href: '/dashboard/teacher/certificates'
  }
]

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem,
  onItemClick,
  className = '',
  onLogoClick,
  isCollapsed = false
}) => {
  const { user } = useAuth()

  const menuItems =
    user?.role === 'teacher' ? teacherMenuItems : studentMenuItems

  return (
    <aside className={`bg-white border-r border-gray-200 h-full ${className}`}>
      <div className="py-3 w-full flex justify-center items-center">
        <Logo collapsed={isCollapsed} onClick={onLogoClick} />
      </div>

      <nav className="px-4 pb-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <MenuItem
              key={item.id}
              icon={item.icon}
              label={isCollapsed ? '' : item.label}
              onClick={() => onItemClick?.(item.id, item.href)}
              isActive={activeItem === item.id}
            />
          ))}
        </div>
      </nav>
    </aside>
  )
}
