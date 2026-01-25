export interface AvatarProps {
  className?: string
  src?: string
  alt?: string
  size?: 'small' | 'medium' | 'large'
  fallback?: string
  onClick?: () => void
}
