import { Checkbox as AntCheckbox } from 'antd'
import { CheckboxProps } from './Checkbox.types'

const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  name,
  id,
  ...props
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <AntCheckbox
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
        {...props}
      />
      {label && (
        <label
          htmlFor={id}
          className="ml-2 text-xs sm:text-sm text-gray-700 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  )
}

export default Checkbox
