'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'
import type { Client, ContentPost, Task } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  draft:     '#9CA3AF',
  review:    '#D97706',
  approved:  '#16A34A',
  rejected:  '#DC2626',
  published: '#4F46E5',
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook:  '#1877F2',
  LinkedIn:  '#0A66C2',
  TikTok:    '#000000',
  X:         '#14171A',
  YouTube:   '#FF0000',
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  high:   { bg: '#FCEBEB', color: '#791F1F' },
  medium: { bg: '#FEF3C7', color: '#92400E' },
  low:    { bg: '#F0F0F0', color: '#666' },
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [pendingPosts, setPendingPosts] = useState<ContentPost[]>([])
  const [activeTasks, setActiveTasks] = useState<Task[]>([])
  const [allPosts, setAllPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role !== 'agency_admin') { router.push('/client-home'); return }
      setProfile(p)

      const [
        { data: clientsData },
        { data: reviewPosts },
        { data: tasksData },
        { data: postsData },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', p.agency_id).order('company_name'),
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id).eq('status', 'review').order('created_at', { ascending: false }).limit(6),
        supabase.from('tasks').select('*').eq('agency_id', p.agency_id).neq('status', 'done').order('created_at', { ascending: false }).limit(6),
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id),
      ])

      setClients(clientsData || [])
      setPendingPosts(reviewPosts || [])
      setActiveTasks(tasksData || [])
      setAllPosts(postsData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  const clientMap: Record<string, string> = {}
  clients.forEach(c => { clientMap[c.id] = c.company_name })

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const publishedThisMonth = allPosts.filter(p =>
    p.status === 'published' && p.published_at && new Date(p.published_at) >= thisMonthStart
  ).length
  const totalPublished = allPosts.filter(p => p.status === 'published').length

  const scheduledThisMonth = allPosts.filter(p =>
    ['approved','scheduled'].includes(p.status) && p.publish_date && new Date(p.publish_date) >= thisMonthStart
  ).length

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        {/* Welcome banner */}
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
          border: '1px solid #C7D2FE', borderRadius: 14,
          padding: '20px 24px', marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Laba diena, {profile.full_name?.split(' ')[0] || profile.email}! 👋
          </h2>
          <p style={{ color: '#6366F1', fontSize: 13 }}>
            {pendingPosts.length > 0
              ? `${pendingPosts.length} įrašai laukia tvirtinimo ir ${activeTasks.length} aktyvios užduotys. Pirmyn!`
              : `Viskas patvirtinta ✓ · ${now.toLocaleDateString('lt-LT', { weekday: 'long', month: 'long', day: 'numeric' })}`
            }
          </p>
        </div>

        {/* Stat kortelės — DAR stilius */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { icon: '📅', iconBg: '#EEF2FF', value: scheduledThisMonth, label: 'Suplanuota šį mėn.',   change: `${totalPublished} viso paskelbta`, up: true,  href: '/content' },
            { icon: '⏳', iconBg: '#FFF3E0', value: pendingPosts.length,  label: 'Laukia tvirtinimo', change: 'Vidinis + kliento',                up: false, href: '/content' },
            { icon: '✅', iconBg: '#E8F5E9', value: publishedThisMonth,  label: 'Paskelbta šį mėn.',  change: '↑ 92% laiku',                      up: true,  href: '/reports' },
            { icon: '👥', iconBg: '#EEF2FF', value: clients.length,       label: 'Aktyvūs klientai',  change: `${activeTasks.length} aktyvių užduočių`, up: true,  href: '/clients' },
          ].map(s => (
            <a key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#777', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: s.up ? '#16A34A' : '#888', fontWeight: 500 }}>{s.change}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Dashboard grid: artėjantys įrašai + approval status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', marginBottom: '1rem' }}>

          {/* Artėjantys įrašai */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>
                Artėjantys įrašai
                {pendingPosts.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                    {pendingPosts.length}
                  </span>
                )}
              </h2>
              <a href="/content" style={{ fontSize: 12, color: '#6c63ff', textDecoration: 'none', fontWeight: 600 }}>Žiūrėti turinį →</a>
            </div>
            {pendingPosts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Viskas patvirtinta ✓</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {pendingPosts.map(post => (
                  <a key={post.id} href={`/clients/${post.client_id}#turinys`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8,
                      background: '#fffbf0', border: '1px solid #FDE68A',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FEF3C7')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fffbf0')}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: PLATFORM_COLORS[post.platform] || '#999' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#333' }}>
                          {post.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>
                          {post.client_id ? (clientMap[post.client_id] || '—') : '—'} · {post.platform}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600, whiteSpace: 'nowrap' }}>Peržiūrėti →</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Approval status mini */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>Tvirtinimo statusas</h2>
              <a href="/content" style={{ fontSize: 12, color: '#6c63ff', textDecoration: 'none', fontWeight: 600 }}>Visos →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clients.slice(0, 5).map(client => {
                const clientPosts = allPosts.filter(p => p.client_id === client.id)
                const pending = clientPosts.filter(p => p.status === 'review').length
                const published = clientPosts.filter(p => p.status === 'published').length
                const total = clientPosts.length
                const pct = total > 0 ? Math.round((published / total) * 100) : 0
                return (
                  <a key={client.id} href={`/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#4338CA', flexShrink: 0 }}>
                        {client.company_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.company_name}</div>
                        <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#6c63ff', borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      {pending > 0 && (
                        <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>{pending}</span>
                      )}
                    </div>
                  </a>
                )
              })}
              {clients.length === 0 && <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Klientų nėra</p>}
            </div>
          </div>
        </div>

        {/* Aktyvumas — full width */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>Naujausias aktyvumas</h2>
            <a href="/clients" className="btn-primary" style={{ textDecoration: 'none', fontSize: 11, padding: '4px 12px' }}>+ Naujas klientas</a>
          </div>
          {clients.length === 0 ? (
            <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Dar nėra klientų.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {clients.map(client => {
                const clientPosts = allPosts.filter(p => p.client_id === client.id)
                const clientPending = clientPosts.filter(p => p.status === 'review').length
                const clientPublished = clientPosts.filter(p => p.status === 'published').length
                return (
                  <a key={client.id} href={`/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '14px 16px', borderRadius: 10, border: '1px solid #f0f0f0',
                      background: '#fafafa', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.background = '#F5F3FF' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.background = '#fafafa' }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#222' }}>{client.company_name}</div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#888' }}>
                        <span style={{ color: '#16A34A' }}>✓ {clientPublished}</span>
                        {clientPending > 0 && <span style={{ color: '#D97706', fontWeight: 600 }}>⏳ {clientPending}</span>}
                      </div>
                      {client.social_channels && client.social_channels.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap' }}>
                          {client.social_channels.slice(0, 4).map(ch => (
                            <span key={ch} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: (PLATFORM_COLORS[ch] || '#999') + '18', color: PLATFORM_COLORS[ch] || '#999', fontWeight: 700 }}>
                              {ch.slice(0, 2).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
