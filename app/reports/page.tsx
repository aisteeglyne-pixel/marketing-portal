'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'
import type { ContentPost, Client } from '@/types'

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook:  '#1877F2',
  LinkedIn:  '#0A66C2',
  TikTok:    '#000000',
  X:         '#14171A',
  YouTube:   '#FF0000',
}

const PERIODS = [
  { key: '7d',  label: '7 dienos' },
  { key: '30d', label: '30 dienų' },
  { key: '90d', label: '3 mėn.' },
  { key: 'all', label: 'Visas laikas' },
]

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export default function ReportsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
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
      const [{ data: postsData }, { data: clientsData }] = await Promise.all([
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id),
        supabase.from('clients').select('*').eq('agency_id', p.agency_id),
      ])
      setPosts(postsData || [])
      setClients(clientsData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // Period filter
  const cutoff = period === 'all' ? null
    : period === '7d'  ? daysAgo(7)
    : period === '30d' ? daysAgo(30)
    : daysAgo(90)

  const inPeriod = (post: ContentPost) => {
    if (!cutoff) return true
    const date = post.published_at || post.publish_date || post.created_at
    return date ? new Date(date) >= cutoff : false
  }

  const allPublished = posts.filter(p => p.status === 'published')
  const periodPosts  = posts.filter(inPeriod)
  const review       = posts.filter(p => p.status === 'review')
  const drafts       = posts.filter(p => p.status === 'draft')
  const rejected     = posts.filter(p => p.status === 'rejected')
  const thisMonth    = allPublished.filter(p => p.published_at && new Date(p.published_at) >= thisMonthStart)
  const prevMonth    = allPublished.filter(p => p.published_at && new Date(p.published_at) >= prevMonthStart && new Date(p.published_at) < thisMonthStart)
  const monthDelta   = prevMonth.length > 0 ? Math.round(((thisMonth.length - prevMonth.length) / prevMonth.length) * 100) : 0

  // By platform (period)
  const byPlatform: Record<string, number> = {}
  periodPosts.filter(p => p.status === 'published').forEach(p => {
    byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1
  })
  const maxPlatform = Math.max(...Object.values(byPlatform), 1)
  const platformTotal = Object.values(byPlatform).reduce((a, b) => a + b, 0)

  // By client
  const clientMap: Record<string, string> = {}
  clients.forEach(c => { clientMap[c.id] = c.company_name })

  const byClient: Record<string, { published: number; review: number; total: number }> = {}
  clients.forEach(c => { byClient[c.id] = { published: 0, review: 0, total: 0 } })
  posts.forEach(p => {
    if (!p.client_id) return
    if (!byClient[p.client_id]) byClient[p.client_id] = { published: 0, review: 0, total: 0 }
    byClient[p.client_id].total++
    if (p.status === 'published') byClient[p.client_id].published++
    if (p.status === 'review') byClient[p.client_id].review++
  })
  const clientsSorted = Object.entries(byClient)
    .sort((a, b) => b[1].total - a[1].total)
    .filter(([, v]) => v.total > 0)

  const pendingReview = review.slice(0, 8)

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        {/* Header + period selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Ataskaitos ir analitika</h1>
            <p style={{ fontSize: 13, color: '#888' }}>Turinio publikavimo apžvalga</p>
          </div>
          <div style={{ display: 'flex', gap: 2, background: '#f4f4f4', borderRadius: 10, padding: 3 }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none', fontSize: 12,
                  cursor: 'pointer', fontWeight: period === p.key ? 700 : 400,
                  background: period === p.key ? '#fff' : 'transparent',
                  color: period === p.key ? '#6c63ff' : '#666',
                  boxShadow: period === p.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat kortelės — DAR stilius */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { icon: '✅', iconBg: '#E8F5E9', value: allPublished.length, label: 'Iš viso paskelbta',   change: `↑${monthDelta}% nuo praėjusio mėn.`,   up: monthDelta >= 0 },
            { icon: '📅', iconBg: '#EEF2FF', value: thisMonth.length,    label: 'Paskelbta šį mėn.',  change: `praeitas: ${prevMonth.length}`,           up: thisMonth.length >= prevMonth.length },
            { icon: '⏳', iconBg: '#FFF3E0', value: review.length,       label: 'Laukia tvirtinimo',  change: 'Reikia peržiūros',                         up: false },
            { icon: '📝', iconBg: '#F3F4F6', value: drafts.length,       label: 'Juodraščiai',        change: 'Dar nepasirengę',                          up: false },
            { icon: '❌', iconBg: '#FEE2E2', value: rejected.length,     label: 'Atmesta',            change: 'Reikia taisymų',                           up: false },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 10 }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#777', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: s.up ? '#16A34A' : '#888', fontWeight: 500 }}>{s.change}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

          {/* Pagal platformą */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: '1rem' }}>
              Paskelbta pagal platformą
              <span style={{ marginLeft: 8, fontSize: 12, color: '#aaa', fontWeight: 400 }}>({platformTotal} viso)</span>
            </h3>
            {Object.keys(byPlatform).length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>Duomenų nėra</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(byPlatform)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => {
                    const pct = platformTotal > 0 ? Math.round((count / platformTotal) * 100) : 0
                    return (
                      <div key={platform}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: PLATFORM_COLORS[platform] || '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                            {platform.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, flex: 1 }}>{platform}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                          <span style={{ fontSize: 11, color: '#aaa', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.round((count / maxPlatform) * 100)}%`,
                            background: PLATFORM_COLORS[platform] || '#6c63ff',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Aktyvumas pagal klientą */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: '1rem' }}>Aktyvumas pagal klientą</h3>
            {clientsSorted.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>Duomenų nėra</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {clientsSorted.map(([clientId, v]) => {
                  const pct = v.total > 0 ? Math.round((v.published / v.total) * 100) : 0
                  return (
                    <a key={clientId} href={`/clients/${clientId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #f5f5f5', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#4338CA', flexShrink: 0 }}>
                          {(clientMap[clientId] || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {clientMap[clientId] || 'Nežinomas'}
                          </div>
                          <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#6c63ff', borderRadius: 2, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{v.total}</div>
                          <div style={{ fontSize: 10, color: '#16A34A' }}>✓ {v.published}</div>
                        </div>
                        {v.review > 0 && (
                          <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>{v.review}</span>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Laukia tvirtinimo */}
        {pendingReview.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: 14 }}>
                Laukia tvirtinimo
                <span style={{ marginLeft: 8, fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {review.length}
                </span>
              </h3>
              <a href="/content" style={{ fontSize: 12, color: '#6c63ff', textDecoration: 'none', fontWeight: 600 }}>Žiūrėti viską →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {pendingReview.map(post => (
                <a key={post.id} href={`/clients/${post.client_id}#turinys`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: '#fffbf0', border: '1px solid #FDE68A' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FEF3C7')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fffbf0')}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: PLATFORM_COLORS[post.platform] || '#999' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>
                        {clientMap[post.client_id] || '—'} · {post.platform}
                        {post.publish_date && ` · ${new Date(post.publish_date).toLocaleDateString('lt-LT')}`}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600, whiteSpace: 'nowrap' }}>Peržiūrėti →</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
