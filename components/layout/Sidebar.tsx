'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { UserRole } from '@/types'

const agencyNav = [
  { href: '/dashboard', label: 'Apžvalga', icon: '⊞' },
  { href: '/clients', label: 'Klientai', icon: '👥' },
  { href: '/content', label: 'Turinys', icon: '📋' },
  { href: '/tasks', label: 'Užduotys', icon: '✓' },
  { href: '/reports', label: 'Ataskaitos', icon: '📊' },
  { href: '/files', label: 'Failai', icon: '📁' },
  { href: '/goals', label: 'Tikslai', icon: '🎯' },
  { href: '/settings', label: 'Nustatymai', icon: '⚙' },
]

const clientNav = [
  { href: '/client-home', label: 'Pradžia', icon: '⊞' },
  { href: '/client-content', label: 'Turinys', icon: '📋' },
  { href: '/client-tasks', label: 'Užduotys', icon: '✓' },
  { href: '/client-reports', label: 'Ataskaitos', icon: '📊' },
  { href: '/client-files', label: 'Failai', icon: '📁' },
  { href: '/client-goals', label: 'Tikslai', icon: '🎯' },
]

interface SidebarProps {
  role: UserRole
  agencyName?: string
  agencyLogo?: string | null
}

export default function Sidebar({ role, agencyName, agencyLogo }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const nav = role === 'agency_admin' ? agencyNav : clientNav

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sidebar" style={{ position: 'fixed', top: 0, left: 0, zIndex: 10 }}>
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
        {agencyLogo ? (
          <img src={agencyLogo} alt={agencyName} style={{ height: 32, objectFit: 'contain' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--brand-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 14, fontWeight: 600
            }}>
              {(agencyName || 'P')[0]}
            </div>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>
              {agencyName || 'Portalas'}
            </span>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid #f0f0f0' }}>
        <button onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'transparent', color: '#888', fontSize: 14, cursor: 'pointer'
          }}>
          <span>↩</span>
          <span>Atsijungti</span>
        </button>
      </div>
    </div>
  )
}
