import React from 'react'
import { MenuItemProps } from './MenuItem.types'

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex cursor-pointer items-center ${
          !label ? 'justify-center' : ''
        } space-x-3 px-4 py-3 rounded-lg transition-colors
        ${
          isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-900 hover:bg-gray-50 hover:text-gray-900'
        }
        ${className}
      `}
    >
      <div className={`w-5 h-5 flex items-center justify-between`}>{icon}</div>
      {label && (
        <span
          className={`text-base ${isActive ? 'font-semibold' : 'font-normal'}`}
        >
          {label}
        </span>
      )}
    </button>
  )
}
