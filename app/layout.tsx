import type { Metadata } from 'next'
import { Work_Sans } from 'next/font/google'
import './globals.css'

const workSans = Work_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DAR CONTENT — Marketing Portal',
  description: 'Klientų turinio valdymo platforma',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body className={workSans.className} style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
