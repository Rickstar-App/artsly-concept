import type { Metadata, Viewport } from 'next'
import { Newsreader, Hanken_Grotesk, Spline_Sans_Mono } from 'next/font/google'
import './globals.css'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { MobileNav } from '@/components/layout/MobileNav'
import { ToastHost } from '@/components/ui/Toast'
import { getViewer, viewerSummary } from '@/lib/session'

/**
 * DESIGN.md §3 — display serif, UI sans, tabular mono for money and countdowns.
 *
 * Chosen partly for what they are NOT. Inter, Playfair, Fraunces, Poppins and
 * JetBrains Mono are the default vocabulary of generated interfaces; a site
 * built from them announces itself before you read a word. These three are
 * uncommon, and each earns its place on the page:
 *
 *   Newsreader        a low-contrast literary serif with a real optical-size
 *                     axis, so the hero and a caption are genuinely different
 *                     cuts rather than one shape scaled. Warm enough to sit
 *                     beside terracotta without going brittle.
 *   Hanken Grotesk    humanist rather than neo-grotesque — slightly open
 *                     apertures, a friendlier `a` and `g`. Reads warm where
 *                     Inter reads neutral, which is the whole brief.
 *   Spline Sans Mono  narrow, even-colour figures for prices and countdowns.
 */
const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-display-face',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
})
const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body-face',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})
const mono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-mono-face',
  display: 'swap',
  weight: ['400', '500', '600'],
})

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
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
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
