'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLink({
  href, children, className, ...rest
}: { href: string; children: React.ReactNode; className?: string } & React.ComponentProps<'a'>) {
  const pathname = usePathname()
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`nav-link ${active ? 'is-active' : ''} ${className ?? ''}`}
      aria-current={active ? 'page' : undefined}
      {...rest}
    >
      {children}
    </Link>
  )
}
