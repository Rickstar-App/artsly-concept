'use client'

/**
 * §33.2 — Mobile bottom navigation.
 *
 *   Home   Discover   Mystery   My Space   Profile
 *
 * Five slots; ARTISTS DOESN'T FIT. Rather than dropping artist discovery on
 * mobile — which would gut principle §6.5 — Artists becomes a segmented tab
 * inside Discover (`/discover?tab=artists`), and every artwork card and detail
 * page still links straight to the artist. §46 requires this be verified
 * explicitly in mobile QA.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ViewerSummary } from '@/lib/session'

const ITEMS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/discover', label: 'Discover', icon: 'grid' },
  { href: '/mystery', label: 'Mystery', icon: 'spark' },
  { href: '/my-space', label: 'My Space', icon: 'frame' },
  { href: '/profile', label: 'Profile', icon: 'person' },
] as const

export function MobileNav({ viewer }: { viewer: ViewerSummary }) {
  const pathname = usePathname()
  return (
    <nav className="mobile-nav" aria-label="Primary">
      {ITEMS.map((it) => {
        const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`mobile-nav-item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.href === '/my-space' && viewer.atHome > 0 ? (
              <span className="mobile-nav-dot" aria-hidden="true" />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

function Icon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const
  const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'home':   return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z" {...stroke} /></svg>
    case 'grid':   return <svg {...common}><path d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9-3h7v10h-7V10Z" {...stroke} /></svg>
    case 'spark':  return <svg {...common}><path d="m12 3 2.2 5.9L20 11l-5.8 2.1L12 19l-2.2-5.9L4 11l5.8-2.1L12 3Z" {...stroke} /></svg>
    case 'frame':  return <svg {...common}><path d="M4 5h16v14H4V5Zm3 11 3.5-4.5 2.5 3 2-2.5L18 16" {...stroke} /></svg>
    default:       return <svg {...common}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" {...stroke} /></svg>
  }
}
