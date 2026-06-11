import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DAR CONTENT — Marketing Portal',
  description: 'Klientų turinio valdymo platforma',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt" className={sora.variable}>
      <body>{children}</body>
    </html>
  )
}
