import React from 'react'
import { Input } from 'antd'
import type { TextareaProps } from './Textarea.types'

const { TextArea } = Input

/**
 * Textarea atom built on top of Ant Design's TextArea. Keeps spacing consistent across forms.
 */
const Textarea: React.FC<TextareaProps> = ({
  id,
  name,
  value,
  placeholder,
  rows = 4,
  maxLength,
  disabled = false,
  required = false,
  className = '',
  onChange
}) => {
  return (
    <TextArea
      id={id}
      name={name}
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      onChange={(event) => onChange?.(event.target.value)}
      className={`
        rounded-xl border border-slate-200 px-4 py-3 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60
        ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-900'}
        ${className}
      `.trim()}
    />
  )
}

export default Textarea
