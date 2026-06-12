'use client'

import { useState } from 'react'
import { PLATFORM_COLORS, MONTHS_LT } from '@/lib/portal-constants'
import { statusLabel, typeIcon, fmtDate, fmtTime, isVideoUrl } from '@/lib/portal-helpers'
import type { Client, ContentPost, Task } from '@/types'

interface DashboardViewProps {
  profile: any
  clients: Client[]
  posts: ContentPost[]
  tasks: Task[]
  clientMap: Record<string, Client>
  onNavCalendar: () => void
  onNavApprovals: () => void
  onOpenClient: (client: Client) => void
  onSelectPost: (post: ContentPost) => void
  onApprove: (postId: string) => void
}

export default function DashboardView({ profile, clients, posts, tasks, clientMap, onNavCalendar, onNavApprovals, onOpenClient, onSelectPost, onApprove }: DashboardViewProps) {
  const [showAllActivity, setShowAllActivity] = useState(false)
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const publishedThisMonth = posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= thisMonthStart)
  const pendingPosts = posts.filter(p => p.status === 'review')
  const scheduledPosts = posts.filter(p => ['approved','scheduled'].includes(p.status) && p.publish_date && new Date(p.publish_date) >= thisMonthStart)

  const upcoming = posts
    .filter(p => ['scheduled','approved'].includes(p.status))
    .sort((a, b) => (a.publish_date || '9999').localeCompare(b.publish_date || '9999'))
    .slice(0, 5)

  // Aktyvumo srautas iš įrašų istorijos
  const activity = [...posts]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, showAllActivity ? 12 : 5)

  const activityText = (p: ContentPost) => {
    const cl = p.client_id ? clientMap[p.client_id]?.company_name : '—'
    if (p.status === 'published') return `✅ Paskelbta: „${p.title}" · ${cl}`
    if (p.status === 'approved') return `👍 Patvirtinta: „${p.title}" · ${cl}`
    if (p.status === 'review') return `🔎 Peržiūrai pateikta: „${p.title}" · ${cl}`
    if (p.status === 'scheduled') return `🚀 Suplanuota: „${p.title}" · ${cl}`
    if (p.status === 'rejected') return `↩ Grąžinta taisymui: „${p.title}" · ${cl}`
    return `✍️ Sukurtas juodraštis: „${p.title}" · ${cl}`
  }

  return (
    <div className="view active">
      <div className="welcome-banner">
        <h2>Laba diena, {profile.full_name?.split(' ')[0] || profile.email}! 👋</h2>
        <p>{pendingPosts.length > 0
          ? `${pendingPosts.length} įrašai laukia tvirtinimo · ${scheduledPosts.length} suplanuota šį mėnesį`
          : `Viskas patvirtinta ✓ · ${MONTHS_LT[now.getMonth()]} ${now.getFullYear()}`}
        </p>
      </div>
      <div className="stats-grid">
        {[
          { icon: '📅', bg: 'var(--primary-light)', value: scheduledPosts.length, label: 'Suplanuota šį mėn.', change: `${posts.filter(p=>p.status==='published').length} viso paskelbta`, up: true },
          { icon: '⏳', bg: '#FFF3E0', value: pendingPosts.length, label: 'Laukia tvirtinimo', change: 'Reikia peržiūros', up: false },
          { icon: '✅', bg: '#E8F5E9', value: publishedThisMonth.length, label: 'Paskelbta šį mėn.', change: '↑ 92% laiku', up: true },
          { icon: '👥', bg: '#E8EAFD', value: clients.length, label: 'Aktyvūs klientai', change: `${tasks.filter(t=>t.status!=='done').length} aktyvių užduočių`, up: true },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.up ? 'var(--primary)' : '#E65100' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-change${s.up ? ' stat-up' : ''}`}>{s.change}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div>
          <div className="card">
            <div className="section-title">
              Artėjantys įrašai
              <button className="btn btn-outline btn-sm" onClick={onNavCalendar}>Žiūrėti kalendorių →</button>
            </div>
            {upcoming.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>Suplanuotų įrašų nėra</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(post => {
                  const pColor = PLATFORM_COLORS[post.platform] || '#999'
                  return (
                    <div key={post.id} className="upcoming-post" style={{ cursor: 'pointer' }} onClick={() => onSelectPost(post)}>
                      {post.media_url && !isVideoUrl(post.media_url)
                        ? <img className="post-img-thumb" src={post.media_url} alt="" style={{ width: 44, height: 44 }} />
                        : <div className="post-thumb" style={{ background: `${pColor}22` }}>{typeIcon(post.content_type)}</div>}
                      <div className="post-info">
                        <div className="post-title">{post.title}</div>
                        <div className="post-meta">{post.client_id ? clientMap[post.client_id]?.company_name : '—'} · {fmtDate(post.publish_date)} {fmtTime(post.publish_date)}</div>
                      </div>
                      <div className="platform-pills">
                        <div className="platform-pill" style={{ background: pColor }}>{post.platform.slice(0, 2).toUpperCase()}</div>
                      </div>
                      <span className={`status-badge status-${post.status}`} style={{ marginLeft: 8 }}>{statusLabel(post.status)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="section-title">Naujausias aktyvumas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {activity.map(p => (
                <div key={p.id} className="activity-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', cursor: 'pointer' }} onClick={() => onSelectPost(p)}>
                  <div className="activity-text" style={{ flex: 1, fontSize: 12.5 }}>{activityText(p)}</div>
                  <div className="activity-time" style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(p.created_at)}</div>
                </div>
              ))}
            </div>
            {posts.length > 5 && (
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowAllActivity(v => !v)}>
                {showAllActivity ? 'Rodyti mažiau ↑' : 'Rodyti daugiau ↓'}
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="card">
            <div className="section-title">Tvirtinimo statusas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingPosts.slice(0, 3).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--bg)', borderRadius: 8 }}>
                  <span>{typeIcon(p.content_type)}</span>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-success btn-sm" onClick={() => onApprove(p.id)}>✓</button>
                    <button className="btn btn-outline btn-sm" onClick={onNavApprovals}>Žiūrėti</button>
                  </div>
                </div>
              ))}
              {pendingPosts.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>Viskas patvirtinta ✓</div>}
            </div>
            <div className="section-title" style={{ marginTop: 18 }}>Klientų progresas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clients.slice(0, 5).map(client => {
                const cp = posts.filter(p => p.client_id === client.id)
                const pub = cp.filter(p => p.status === 'published').length
                const pct = cp.length > 0 ? Math.round(pub / cp.length * 100) : 0
                const pend = cp.filter(p => p.status === 'review').length
                return (
                  <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => onOpenClient(client)}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--primary-dark)', flexShrink: 0 }}>
                      {client.company_name.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.company_name}</div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 2 }} />
                      </div>
                    </div>
                    {pend > 0 && <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>{pend}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
