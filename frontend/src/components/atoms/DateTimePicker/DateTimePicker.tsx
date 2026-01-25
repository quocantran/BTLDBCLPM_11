import React from 'react'
import { DatePicker } from 'antd'
import type { DateTimePickerProps } from './DateTimePicker.types'

/**
 * Wrapper around Ant Design's DatePicker with sensible defaults for date-time selection.
 */
const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  placeholder,
  disabled = false,
  className = '',
  onChange
}) => {
  return (
    <DatePicker
      value={value}
      onChange={(nextValue, dateString) => onChange?.(nextValue, dateString)}
      showTime
      format="MM/DD/YYYY HH:mm"
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full h-12 [&_.ant-picker-input>input]:text-sm ${className}`.trim()}
    />
  )
}

export default DateTimePicker
