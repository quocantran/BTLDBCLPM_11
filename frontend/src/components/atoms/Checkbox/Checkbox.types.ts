export interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: string | React.ReactNode
  disabled?: boolean
  className?: string
  name?: string
  id?: string
}
