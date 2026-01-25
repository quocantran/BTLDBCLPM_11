export interface SidebarProps {
  className?: string
  activeItem?: string
  onItemClick?: (itemId: string, itemHref: string) => void
  isCollapsed?: boolean
  onLogoClick?: () => void
}
