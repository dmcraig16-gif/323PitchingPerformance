import type { Metadata } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'
import './globals.css'

const heading = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading-family',
})

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body-family',
})

export const metadata: Metadata = {
  title: '323 Training App',
  description: 'For the Lord, not for man. Colossians 3:23',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable}`}>{children}</body>
    </html>
  )
}
