import { Button as AntButton } from 'antd'
import { ButtonProps } from './Button.types'

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  htmlType = 'button',
  className = '',
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return '!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600 focus:ring-blue-500'
      case 'secondary':
        return '!bg-gray-600 hover:!bg-gray-700 !text-white !border-gray-600 focus:ring-gray-500'
      case 'outline':
        return '!bg-transparent hover:!bg-gray-50 !text-gray-700 !border-gray-300 focus:ring-gray-500'
      case 'consensus':
        return '!bg-green-600 hover:!bg-green-700 !text-white !border-green-600 focus:ring-green-500'
      case 'link':
        return '!bg-transparent !border-0 !text-blue-600 hover:!text-blue-700 hover:!bg-transparent'
      default:
        return '!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600 focus:ring-blue-500'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return '!h-8 px-3 text-sm'
      case 'medium':
        return '!h-10 px-4 text-base'
      case 'large':
        return '!h-12 py-2 px-6 !text-lg !font-bold'
      default:
        return '!h-10 px-4 text-base'
    }
  }

  return (
    <AntButton
      type={variant === 'primary' ? 'primary' : 'default'}
      htmlType={htmlType}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${fullWidth ? 'w-full' : ''}
        rounded-lg font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </AntButton>
  )
}

export default Button
