'use client'

import { PLATFORM_COLORS, STATUS_META } from '@/lib/portal-constants'
import type { Client, ContentPost, Task } from '@/types'

interface ClientWorkspaceViewProps {
  client: Client
  posts: ContentPost[]
  tasks: Task[]
  onNewPost: () => void
  onSelectPost: (post: ContentPost) => void
  onApprove: (postId: string) => void
  onReject: (postId: string) => void
  onTaskDone: (taskId: string) => void
}

export default function ClientWorkspaceView({ client, posts, tasks, onNewPost, onSelectPost, onApprove, onReject, onTaskDone }: ClientWorkspaceViewProps) {
  const clientPosts = posts.filter(p => p.client_id === client.id)
  const clientTasks = tasks.filter(t => t.client_id === client.id)

  return (
    <div className="view active">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: 'var(--primary-light)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
          {client.company_name.slice(0,2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{client.company_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {clientPosts.filter(p=>p.status==='published').length} paskelbta · {clientPosts.filter(p=>p.status==='review').length} laukia
          </div>
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={onNewPost}>+ Naujas įrašas</button>
      </div>

      {/* Client stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { icon: '📝', label: 'Visi įrašai', value: clientPosts.length },
          { icon: '✅', label: 'Paskelbta', value: clientPosts.filter(p=>p.status==='published').length },
          { icon: '⏳', label: 'Laukia', value: clientPosts.filter(p=>p.status==='review').length },
          { icon: '📋', label: 'Užduotys', value: clientTasks.filter(t=>t.status!=='done').length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>{s.icon}</div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Client posts */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">
          Turinio įrašai
          <button className="btn btn-outline btn-sm" onClick={onNewPost}>+ Naujas</button>
        </div>
        {clientPosts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>Įrašų nėra</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clientPosts.slice(0, 8).map(post => {
              const sm = STATUS_META[post.status] || STATUS_META.draft
              return (
                <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }} onClick={() => onSelectPost(post)}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title || '(Be pavadinimo)'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{post.platform} {post.publish_date && `· ${new Date(post.publish_date).toLocaleDateString('lt-LT')}`}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: sm.bg, color: sm.color }}>{sm.label}</span>
                  {post.status === 'review' && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); onApprove(post.id) }}>✓</button>
                      <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onReject(post.id) }}>✕</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Client tasks */}
      <div className="card">
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
                {task.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(task.due_date).toLocaleDateString('lt-LT')}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
