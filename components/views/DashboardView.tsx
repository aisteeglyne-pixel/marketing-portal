'use client'

import { PLATFORM_COLORS, MONTHS_LT } from '@/lib/portal-constants'
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
}

export default function DashboardView({ profile, clients, posts, tasks, clientMap, onNavCalendar, onNavApprovals, onOpenClient }: DashboardViewProps) {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const publishedThisMonth = posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= thisMonthStart)
  const pendingPosts = posts.filter(p => p.status === 'review')
  const scheduledPosts = posts.filter(p => ['approved','scheduled'].includes(p.status) && p.publish_date && new Date(p.publish_date) >= thisMonthStart)

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
            {pendingPosts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>Viskas patvirtinta ✓</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingPosts.slice(0, 5).map(post => (
                  <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: '#fffbf0', border: '1px solid #FDE68A', cursor: 'pointer' }}
                    onClick={onNavApprovals}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{post.client_id ? clientMap[post.client_id]?.company_name : '—'} · {post.platform}</div>
                    </div>
                    <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="card">
            <div className="section-title">Tvirtinimo statusas</div>
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
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Naujausias aktyvumas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {clients.map(client => {
            const cp = posts.filter(p => p.client_id === client.id)
            return (
              <div key={client.id} className="card" style={{ cursor: 'pointer', padding: '14px 16px' }}
                onClick={() => onOpenClient(client)}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{client.company_name}</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--success)' }}>✓ {cp.filter(p=>p.status==='published').length}</span>
                  {cp.filter(p=>p.status==='review').length > 0 && <span style={{ color: '#D97706', fontWeight: 600 }}>⏳ {cp.filter(p=>p.status==='review').length}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
