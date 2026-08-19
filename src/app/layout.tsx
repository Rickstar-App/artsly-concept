import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { MobileNav } from '@/components/layout/MobileNav'
import { ToastHost } from '@/components/ui/Toast'
import { getViewer, viewerSummary } from '@/lib/session'

// DESIGN.md §3 — display serif, UI sans, tabular mono for money and countdowns.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
})
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'Curio — rent art from emerging artists',
    template: '%s · Curio',
  },
  description:
    'Discover, rent, and rotate original art from emerging artists — personalised to your taste and your space. Shipping included both ways.',
  openGraph: {
    title: 'Curio — your walls don’t have to stay the same',
    description: 'Discover, rent, and rotate original art from emerging artists.',
    type: 'website',
  },
  robots: { index: false }, // demo build
}

export const viewport: Viewport = {
  themeColor: '#FAF8F5',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = viewerSummary(await getViewer())

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        {/* §45 — first focusable element on every page. */}
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader viewer={viewer} />
        <main id="main" style={{ minHeight: '60vh' }}>{children}</main>
        <SiteFooter viewer={viewer} />
        <MobileNav viewer={viewer} />
        <ToastHost />
      </body>
    </html>
  )
}
