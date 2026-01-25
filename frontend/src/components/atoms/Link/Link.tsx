import Link from 'next/link'
import { LinkProps } from './Link.types'

const CustomLink: React.FC<LinkProps> = ({
  href,
  children,
  className = '',
  target = '_self',
  onClick,
  ...props
}) => {
  return (
    <Link
      href={href}
      target={target}
      onClick={onClick}
      className={`
        text-blue-600 hover:text-blue-800 transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      {...props}
    >
      {children}
    </Link>
  )
}

export default CustomLink
