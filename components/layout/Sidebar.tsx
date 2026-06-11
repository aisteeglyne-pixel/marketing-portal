'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { UserRole, Client } from '@/types'
import { lt } from '@/lib/i18n/lt'

const clientNav = [
  { href: '/client-home', label: lt.nav.clientHome, icon: '⊞' },
  { href: '/client-content', label: lt.nav.content, icon: '📋' },
  { href: '/client-tasks', label: lt.nav.tasks, icon: '✓' },
  { href: '/client-reports', label: lt.nav.reports, icon: '📊' },
  { href: '/client-files', label: lt.nav.files, icon: '📁' },
  { href: '/client-goals', label: lt.nav.goals, icon: '🎯' },
]

interface SidebarProps {
  role: UserRole
  agencyName?: string
  agencyLogo?: string | null
  agencyId?: string
}

export default function Sidebar({ role, agencyName, agencyLogo, agencyId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [clients, setClients] = useState<Pick<Client, 'id' | 'company_name' | 'logo_url'>[]>([])

  const isAgency = role === 'agency_admin' || role === 'agency_member'

  useEffect(() => {
    if (isAgency && agencyId) {
      supabase
        .from('clients')
        .select('id, company_name, logo_url')
        .eq('agency_id', agencyId)
        .order('company_name')
        .then(({ data }) => setClients(data || []))
    }
  }, [agencyId, role])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sidebar" style={{ position: 'fixed', top: 0, left: 0, zIndex: 10, display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Agency header */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        {agencyLogo ? (
          <img src={agencyLogo} alt={agencyName} style={{ height: 32, objectFit: 'contain' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--brand-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 14, fontWeight: 600,
            }}>
              {(agencyName || 'P')[0]}
            </div>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>
              {agencyName || 'Portalas'}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {isAgency ? (
          <>
            {/* Apžvalga */}
            <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
              <span style={{ fontSize: 16 }}>⊞</span>
              <span>{lt.nav.dashboard}</span>
            </Link>

            {/* Komandos darbai */}
            <Link href="/agency-tasks" className={`nav-item ${pathname.startsWith('/agency-tasks') ? 'active' : ''}`}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span>{lt.nav.agencyTasks}</span>
            </Link>

            {/* Klientai sekcija */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '2px 16px 6px', marginBottom: 2,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#aaa',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {lt.nav.clients}
                </span>
                {role === 'agency_admin' && (
                  <button
                    title={lt.clients.newClient}
                    onClick={() => {/* TODO: 2 etapas */}}
                    style={{
                      background: 'none', border: 'none', color: '#bbb',
                      cursor: 'pointer', fontSize: 18, lineHeight: 1,
                      padding: '0 2px', borderRadius: 4,
                    }}>
                    +
                  </button>
                )}
              </div>

              {clients.length === 0 ? (
                <div style={{ padding: '4px 16px', fontSize: 13, color: '#ccc', fontStyle: 'italic' }}>
                  {lt.clients.noClients}
                </div>
              ) : (
                clients.map(client => {
                  const isActive = pathname === `/clients/${client.id}`
                  return (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      style={{ gap: 10 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: isActive ? 'var(--brand-600)' : '#d0d0d0',
                        transition: 'background 0.15s',
                      }} />
                      <span style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontSize: 14,
                      }}>
                        {client.company_name}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Nustatymai – tik admin */}
            {role === 'agency_admin' && (
              <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
                  <span style={{ fontSize: 16 }}>⚙</span>
                  <span>{lt.nav.settings}</span>
                </Link>
              </div>
            )}
          </>
        ) : (
          clientNav.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))
        )}
      </nav>

      {/* Atsijungti */}
      <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'transparent', color: '#aaa', fontSize: 14, cursor: 'pointer',
          }}>
          <span>↩</span>
          <span>{lt.common.logout}</span>
        </button>
      </div>
    </div>
  )
}
