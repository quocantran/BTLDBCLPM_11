export type BadgeVariant =
  | 'default'
  | 'active'
  | 'scheduled'
  | 'completed'
  | 'success'
  | 'danger'

export interface BadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}
