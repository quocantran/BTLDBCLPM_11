export interface MainLayoutProps {
  children: React.ReactNode
  className?: string
  initialActiveItem?: string
  onSidebarItemClick?: (itemId: string) => void
}
