export interface LinkProps {
  href: string
  children: React.ReactNode
  className?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  onClick?: () => void
}
