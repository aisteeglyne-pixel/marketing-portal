'use client'

import { fmtDate } from '@/lib/portal-helpers'
import type { Client, ContentPost, Task, Goal } from '@/types'

interface Props {
  profile: any
  client: Client | null
  posts: ContentPost[]
  tasks: Task[]
  goals: Goal[]
  onNav: (view: 'content' | 'tasks' | 'files' | 'goals' | 'reports') => void
  onSelectPost: (p: ContentPost) => void
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C', Facebook: '#1877F2', LinkedIn: '#0A66C2', TikTok: '#000000', X: '#14171A', YouTube: '#FF0000',
}

export default function ClientOverviewView({ profile, client, posts, tasks, goals, onNav, onSelectPost }: Props) {
  const pending = posts.filter(p => p.status === 'review')
  const activeTasks = tasks.filter(t => t.status !== 'done')
  const name = client?.company_name || profile.full_name || profile.email

  const stats = [
    { label: 'Laukia tavo patvirtinimo', value: pending.length, icon: '⏳', view: 'content' as const, accent: '#F59E0B' },
    { label: 'Aktyvios užduotys', value: activeTasks.length, icon: '✅', view: 'tasks' as const, accent: 'var(--primary)' },
    { label: 'Tikslai', value: goals.length, icon: '🎯', view: 'goals' as const, accent: '#10B981' },
  ]

  return (
    <div className="view active">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E181C, #2d2530)', borderRadius: 16, padding: '26px 30px', color: '#fff', marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Sveiki, {name}! 👋</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
          {pending.length > 0 ? `${pending.length} įraš${pending.length === 1 ? 'as laukia' : 'ai laukia'} tavo patvirtinimo` : 'Viskas patvirtinta — puiku!'}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: 22, cursor: 'pointer' }} onClick={() => onNav(s.view)}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: s.accent, fontFamily: 'Neuething Sans, sans-serif', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Laukia patvirtinimo */}
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Laukia tavo patvirtinimo</div>
          {pending.length > 0 && <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }} onClick={() => onNav('content')}>Visi →</span>}
        </div>
        {pending.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Nieko nelaukia — visi įrašai peržiūrėti.</div>
        ) : (
          pending.slice(0, 5).map(p => (
            <div key={p.id} onClick={() => onSelectPost(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: PLATFORM_COLORS[p.platform] || '#999', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <div className="text-muted" style={{ fontSize: 11.5 }}>{p.platform} · {fmtDate(p.publish_date || p.created_at)}</div>
              </div>
              <span className="btn btn-primary btn-sm">Peržiūrėti</span>
            </div>
          ))
        )}
      </div>

      {/* Greitos nuorodos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Failai', icon: '📁', view: 'files' as const },
          { label: 'Tikslai', icon: '🎯', view: 'goals' as const },
          { label: 'Ataskaitos', icon: '📊', view: 'reports' as const },
        ].map(q => (
          <div key={q.view} className="card" style={{ padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => onNav(q.view)}>
            <span style={{ fontSize: 20 }}>{q.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{q.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
