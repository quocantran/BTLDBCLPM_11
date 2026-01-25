import { Input as AntInput } from 'antd'
import { InputProps } from './Input.types'

const Input: React.FC<InputProps> = ({
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  disabled = false,
  className = '',
  prefix,
  suffix,
  name,
  id,
  required = false,
  ...props
}) => {
  return (
    <div className="w-full">
      <AntInput
        id={id}
        name={name}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        prefix={prefix}
        suffix={suffix}
        required={required}
        className={`
          h-10 px-4 rounded-lg border transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default Input
