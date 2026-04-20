import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'OffScript — Train the ability to speak under uncertainty',
    template: '%s · OffScript',
  },
  description:
    'OffScript trains you to keep speaking when you blank. Build freeze resilience, recover from pauses, and think aloud under pressure.',
  keywords: ['public speaking', 'presentation training', 'communication', 'freeze resilience', 'speaking anxiety'],
  openGraph: {
    title: 'OffScript',
    description: 'Train the ability to speak under uncertainty.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
