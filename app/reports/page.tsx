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

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#F0F0F0',  color: '#666' },
  review:    { bg: '#FEF3C7',  color: '#92400E' },
  approved:  { bg: '#EAF3DE',  color: '#27500A' },
  rejected:  { bg: '#FCEBEB',  color: '#791F1F' },
  published: { bg: '#EEF2FF',  color: '#4338CA' },
}

export default function ReportsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [clients, setClients] = useState<Client[]>([])
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

  const published   = posts.filter(p => p.status === 'published')
  const review      = posts.filter(p => p.status === 'review')
  const drafts      = posts.filter(p => p.status === 'draft')
  const rejected    = posts.filter(p => p.status === 'rejected')
  const thisMonth   = published.filter(p => p.published_at && new Date(p.published_at) >= thisMonthStart)

  // Pagal platformą
  const byPlatform: Record<string, number> = {}
  published.forEach(p => { byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1 })
  const maxPlatform = Math.max(...Object.values(byPlatform), 1)

  // Pagal klientą
  const clientMap: Record<string, string> = {}
  clients.forEach(c => { clientMap[c.id] = c.company_name })

  const byClient: Record<string, { published: number; review: number; total: number }> = {}
  clients.forEach(c => { byClient[c.id] = { published: 0, review: 0, total: 0 } })
  posts.forEach(p => {
    if (!byClient[p.client_id]) byClient[p.client_id] = { published: 0, review: 0, total: 0 }
    byClient[p.client_id].total++
    if (p.status === 'published') byClient[p.client_id].published++
    if (p.status === 'review') byClient[p.client_id].review++
  })
  const clientsSorted = Object.entries(byClient)
    .sort((a, b) => b[1].total - a[1].total)
    .filter(([, v]) => v.total > 0)

  // Paskutiniai laukiantys tvirtinimo
  const pendingReview = review.slice(0, 8)

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '1.5rem' }}>{lt.reports.title}</h1>

        {/* KPI kortelės */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Iš viso paskelbta',   value: published.length,  color: '#4338CA' },
            { label: 'Šį mėnesį',           value: thisMonth.length,  color: '#16A34A' },
            { label: 'Laukia tvirtinimo',   value: review.length,     color: '#D97706' },
            { label: 'Juodraščiai',         value: drafts.length,     color: '#6B7280' },
            { label: 'Atmesta',             value: rejected.length,   color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem 0.75rem' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#777' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

          {/* Pagal platformą */}
          <div className="card">
            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: '1rem' }}>Paskelbta pagal platformą</h3>
            {Object.keys(byPlatform).length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>{lt.common.noData}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(byPlatform)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => (
                    <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: PLATFORM_COLORS[platform] || '#999',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                      }}>
                        {platform.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, fontSize: 13 }}>{platform}</div>
                      <div style={{ width: 100, background: '#f0f0f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          width: `${Math.round((count / maxPlatform) * 100)}%`,
                          background: PLATFORM_COLORS[platform] || 'var(--brand-600)',
                        }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#444', minWidth: 24, textAlign: 'right' }}>{count}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Aktyvumas pagal klientą */}
          <div className="card">
            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: '1rem' }}>Aktyvumas pagal klientą</h3>
            {clientsSorted.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>{lt.common.noData}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {clientsSorted.map(([clientId, v]) => (
                  <div key={clientId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {clientMap[clientId] || 'Nežinomas klientas'}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {v.published} paskelbta · {v.review} laukia
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{v.total}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Laukia tvirtinimo */}
        {pendingReview.length > 0 && (
          <div className="card">
            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: '1rem' }}>
              Laukia tvirtinimo
              <span style={{ marginLeft: 8, fontSize: 12, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                {review.length}
              </span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {pendingReview.map(post => (
                <div key={post.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', borderRadius: 8, background: '#fffbf0',
                  border: '1px solid #FDE68A',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: PLATFORM_COLORS[post.platform] || '#999',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      {clientMap[post.client_id] || '—'} · {post.platform}
                      {post.publish_date && ` · ${new Date(post.publish_date).toLocaleDateString('lt-LT')}`}
                    </div>
                  </div>
                  <a href={`/clients/${post.client_id}#turinys`}
                    style={{ fontSize: 12, color: '#D97706', textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    Peržiūrėti →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
