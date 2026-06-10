'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { ContentPost } from '@/types'
import { lt } from '@/lib/i18n/lt'

export default function ClientReportsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)
      const { data } = await supabase.from('content_posts').select('*').eq('client_id', p.client_id)
      setPosts(data || [])
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  const now = new Date()
  const thisMonth = posts.filter(p => {
    if (!p.published_at) return false
    const d = new Date(p.published_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const stats = [
    { label: lt.clientDetail.reports.published, value: posts.filter(p => p.status === 'published').length, color: '#4F46E5' },
    { label: lt.clientDetail.reports.pendingApproval, value: posts.filter(p => p.status === 'review').length, color: '#D97706' },
    { label: lt.clientDetail.reports.drafts, value: posts.filter(p => p.status === 'draft').length, color: '#6B7280' },
    { label: lt.clientDetail.reports.thisMonth, value: thisMonth.length, color: '#16A34A' },
  ]

  const byPlatform: Record<string, number> = {}
  posts.filter(p => p.status === 'published').forEach(p => {
    byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1
  })

  const byMonth: Record<string, number> = {}
  posts.filter(p => p.published_at).forEach(p => {
    const key = new Date(p.published_at!).toLocaleDateString('lt-LT', { year: 'numeric', month: 'long' })
    byMonth[key] = (byMonth[key] || 0) + 1
  })

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '1.5rem' }}>{lt.clientReports.title}</h1>

        {/* KPI kortelės */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {stats.map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Pagal platformą */}
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: 15 }}>Pagal platformą</h3>
            {Object.keys(byPlatform).length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>{lt.common.noData}</p>
            ) : (
              Object.entries(byPlatform).map(([platform, count]) => (
                <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 14 }}>{platform}</div>
                  <div style={{ width: 120, background: '#f0f0f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round((count / posts.filter(p => p.status === 'published').length) * 100)}%`,
                      background: 'var(--brand-600)',
                      borderRadius: 99,
                    }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#444', minWidth: 20, textAlign: 'right' }}>{count}</div>
                </div>
              ))
            )}
          </div>

          {/* Pagal mėnesį */}
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: 15 }}>Paskelbta per mėnesius</h3>
            {Object.keys(byMonth).length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>{lt.common.noData}</p>
            ) : (
              Object.entries(byMonth).map(([month, count]) => (
                <div key={month} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14 }}>
                  <span style={{ color: '#555' }}>{month}</span>
                  <span style={{ fontWeight: 600 }}>{count} įrašai</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
