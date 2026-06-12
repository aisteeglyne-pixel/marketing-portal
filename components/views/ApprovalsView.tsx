'use client'

import { useState } from 'react'
import { PLATFORM_COLORS, STATUS_META } from '@/lib/portal-constants'
import type { Client, ContentPost } from '@/types'

interface ApprovalsViewProps {
  posts: ContentPost[]
  clientMap: Record<string, Client>
  onSelectPost: (post: ContentPost) => void
  onApprove: (postId: string) => void
  onReject: (postId: string) => void
}

export default function ApprovalsView({ posts, clientMap, onSelectPost, onApprove, onReject }: ApprovalsViewProps) {
  const [approvalTab, setApprovalTab] = useState<'internal' | 'client' | 'done'>('internal')
  const pendingPosts = posts.filter(p => p.status === 'review')

  const approvalPosts = posts.filter(p => {
    if (approvalTab === 'internal') return p.status === 'review'
    if (approvalTab === 'client') return p.status === 'approved'
    return ['published','rejected'].includes(p.status)
  })

  return (
    <div className="view active">
      <div className="approvals-tabs">
        {([['internal','Vidinė peržiūra'],['client','Kliento tvirtinimas'],['done','Išspręsta']] as const).map(([key, label]) => (
          <div key={key} className={`approval-tab${approvalTab === key ? ' active' : ''}`} onClick={() => setApprovalTab(key)}>
            {label}
            {key === 'internal' && pendingPosts.length > 0 && <span style={{ marginLeft: 6, background: 'var(--primary)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{pendingPosts.length}</span>}
          </div>
        ))}
      </div>
      {approvalPosts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', marginTop: 16 }}>
          {approvalTab === 'internal' ? '✅ Nėra įrašų, laukiančių peržiūros' : approvalTab === 'client' ? 'Nėra patvirtintų įrašų' : 'Nėra išspręstų įrašų'}
        </div>
      ) : (
        <div className="approvals-grid" style={{ marginTop: 16 }}>
          {approvalPosts.map(post => {
            const sm = STATUS_META[post.status] || STATUS_META.draft
            return (
              <div key={post.id} className="approval-card">
                <div className="approval-card-header" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc' }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{post.platform}</span>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: sm.bg, color: sm.color }}>{sm.label}</span>
                </div>
                <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => onSelectPost(post)}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{post.title}</div>
                  {post.caption && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{post.caption}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {post.client_id ? clientMap[post.client_id]?.company_name : '—'}
                    {post.publish_date && ` · ${new Date(post.publish_date).toLocaleDateString('lt-LT')}`}
                  </div>
                  {post.status === 'review' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); onApprove(post.id) }}>✓ Patvirtinti</button>
                      <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); onReject(post.id) }}>✕ Atmesti</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
