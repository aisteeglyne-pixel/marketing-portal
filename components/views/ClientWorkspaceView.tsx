'use client'

import { PLATFORM_COLORS } from '@/lib/portal-constants'
import { statusLabel, typeIcon, fmtDate, fmtTime, isVideoUrl, clientColor, clientInitials } from '@/lib/portal-helpers'
import type { Client, ContentPost, Task } from '@/types'

interface ClientWorkspaceViewProps {
  client: Client
  posts: ContentPost[]
  tasks: Task[]
  team: any[]
  onNewPost: () => void
  onSelectPost: (post: ContentPost) => void
  onApprove: (postId: string) => void
  onNeedsChanges: (postId: string) => void
  onTaskDone: (taskId: string) => void
  showToast: (msg: string) => void
}

export default function ClientWorkspaceView({ client, posts, tasks, team, onNewPost, onSelectPost, onApprove, onNeedsChanges, onTaskDone, showToast }: ClientWorkspaceViewProps) {
  const clientPosts = posts.filter(p => p.client_id === client.id)
  const clientTasks = tasks.filter(t => t.client_id === client.id)
  const color = clientColor(client.company_name)
  const now = new Date()
  const thisMonthPosts = clientPosts.filter(p => {
    const d = p.publish_date || p.created_at
    return d && new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear()
  })
  const pending = clientPosts.filter(p => p.status === 'review')
  const inviteLink = `https://marketing-portal-g3je.vercel.app/login?client=${client.id.slice(0, 8)}`

  return (
    <div className="view active">
      {/* Gradientinė antraštė */}
      <div className="client-header-card" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, color: '#fff' }}>
        <div className="client-logo-big" style={{ width: 52, height: 52, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
          {clientInitials(client.company_name)}
        </div>
        <div className="client-header-info" style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{client.company_name}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.85 }}>{(client.social_channels || []).join(' · ') || 'Klientas'}</p>
        </div>
        <div className="client-header-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => showToast('📊 Ataskaitų eksportas — 2 etapas (Analitika)')}>↓ Eksportuoti ataskaitą</button>
          <button className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => showToast('✉️ Klientas informuotas')}>📤 Informuoti klientą</button>
        </div>
      </div>

      {/* Socialiniai profiliai */}
      <div className="social-profiles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
        {(client.social_channels || []).map(ch => (
          <div key={ch} className="social-profile-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div className="social-icon" style={{ width: 34, height: 34, borderRadius: 9, background: PLATFORM_COLORS[ch] || '#999', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ch.slice(0, 2).toUpperCase()}</div>
            <div className="social-info" style={{ flex: 1 }}>
              <div className="social-handle" style={{ fontSize: 13, fontWeight: 700 }}>@{client.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}</div>
              <div className="social-status social-connected" style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>● Prijungta</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast(`⚙️ ${ch} nustatymai — netrukus`)}>⚙️</button>
          </div>
        ))}
        <div className="social-profile-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 14px', border: '2px dashed var(--border)', borderRadius: 10, cursor: 'pointer' }} onClick={() => showToast('🔗 Profilių prijungimas — 2 etapas (API integracijos)')}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>+</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Prijungti profilį</div>
          </div>
        </div>
      </div>

      {/* Statistikos */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { icon: '📝', bg: `${color}22`, valColor: color, label: 'Įrašai šį mėnesį', value: String(thisMonthPosts.length) },
          { icon: '⏳', bg: '#FFF3E0', valColor: '#E65100', label: 'Laukia tvirtinimo', value: String(pending.length) },
          { icon: '📣', bg: '#FBEAF6', valColor: 'var(--primary)', label: 'Mėnesio pasiekiamumas', value: '—' },
          { icon: '💬', bg: '#E8F5E9', valColor: 'var(--success)', label: 'Vid. įsitraukimas', value: '—' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.valColor }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Įrašų peržiūra */}
        <div className="card">
          <div className="section-title">
            Šio mėnesio įrašai
            <button className="btn btn-outline btn-sm" onClick={onNewPost}>+ Naujas</button>
          </div>
          {clientPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28 }}>0</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Įrašų šį mėnesį dar nėra</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {clientPosts.slice(0, 5).map(post => {
                const pColor = PLATFORM_COLORS[post.platform] || '#999'
                return (
                  <div key={post.id} className="upcoming-post" style={{ cursor: 'pointer' }} onClick={() => onSelectPost(post)}>
                    {post.media_url && !isVideoUrl(post.media_url)
                      ? <img className="post-img-thumb" src={post.media_url} alt="" style={{ width: 44, height: 44 }} />
                      : <div className="post-thumb" style={{ background: `${pColor}22` }}>{typeIcon(post.content_type)}</div>}
                    <div className="post-info">
                      <div className="post-title" style={{ fontSize: 12.5 }}>{post.title || '(Be pavadinimo)'}</div>
                      <div className="post-meta">{fmtDate(post.publish_date)} · {post.platform}</div>
                    </div>
                    <span className={`status-badge status-${post.status}`} style={{ fontSize: 10 }}>{statusLabel(post.status)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Laukiantys tvirtinimai */}
        <div className="card">
          <div className="section-title">Laukia tvirtinimo {pending.length > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{pending.length}</span>}</div>
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 24 }}>🎉</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Viskas patvirtinta!</div>
            </div>
          ) : (
            pending.map(p => (
              <div key={p.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{typeIcon(p.content_type)} {p.title}</div>
                <div className="text-muted" style={{ marginBottom: 8, fontSize: 11 }}>{p.platform} · {fmtDate(p.publish_date)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-success btn-sm" onClick={() => onApprove(p.id)}>✓ Patvirtinti</button>
                  <button className="btn btn-warning btn-sm" onClick={() => onNeedsChanges(p.id)}>↩ Reikia pataisymų</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Užduotys */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Užduotys</div>
        {clientTasks.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>Užduočių nėra</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clientTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: task.status === 'done' ? 'var(--bg)' : 'var(--surface)' }}>
                <button onClick={() => onTaskDone(task.id)}
                  style={{ width: 18, height: 18, borderRadius: '50%', border: task.status === 'done' ? '2px solid var(--success)' : '2px solid var(--border)', background: task.status === 'done' ? 'var(--success)' : 'transparent', color: '#fff', fontSize: 10, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {task.status === 'done' && '✓'}
                </button>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)' }}>{task.title}</span>
                {task.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(task.due_date)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prieigos valdymas */}
      <div className="card access-control-section" style={{ marginBottom: 16 }}>
        <div className="section-title">Prieigos valdymas <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>— kas mato ir redaguoja šio kliento turinį</span></div>
        {team.filter(m => m.role !== 'client').map(m => (
          <div key={m.id} className="access-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div className="user-avatar" style={{ width: 30, height: 30, fontSize: 11, background: clientColor(m.email || ''), borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {(m.full_name || m.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="access-name" style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.full_name || m.email}</div>
            <span className={`access-role-tag role-${m.role === 'agency_admin' ? 'admin' : 'manager'}`}>{m.role === 'agency_admin' ? 'Admin' : 'Manager'}</span>
            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>● Turi prieigą</span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🔗 Kliento pakvietimo nuoroda</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontSize: 11, background: 'var(--bg)', padding: '8px 10px', borderRadius: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteLink}</code>
            <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard?.writeText(inviteLink); showToast('📋 Nuoroda nukopijuota') }}>Kopijuoti</button>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>Klientas atsidaro nuorodą → susikuria slaptažodį → mato tik savo workspace</div>
        </div>
      </div>

      {/* Simulate client view */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>👁️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Simuliuoti kliento vaizdą</div>
          <div className="text-muted" style={{ fontSize: 12 }}>Pamatyk tiksliai, ką mato klientas prisijungęs — tik jo turinį</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => showToast('👁️ Kliento režimo simuliacija — netrukus')}>👁️ Simuliuoti {client.company_name}</button>
      </div>
    </div>
  )
}
