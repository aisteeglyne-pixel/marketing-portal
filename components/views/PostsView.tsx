'use client'

import { useState } from 'react'
import { PLATFORM_COLORS, STATUS_META } from '@/lib/portal-constants'
import type { Client, ContentPost } from '@/types'

interface PostsViewProps {
  posts: ContentPost[]
  clients: Client[]
  clientMap: Record<string, Client>
  activeClient: Client | null
  onNewPost: () => void
  onSelectPost: (post: ContentPost) => void
  onApprove: (postId: string) => void
  onReject: (postId: string) => void
  onEdit: (post: ContentPost) => void
  onDuplicate: (post: ContentPost) => void
}

export default function PostsView({ posts, clients, clientMap, activeClient, onNewPost, onSelectPost, onApprove, onReject, onEdit, onDuplicate }: PostsViewProps) {
  const [postFilter, setPostFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')

  const filteredPosts = posts
    .filter(p => postFilter === 'all' || p.status === postFilter)
    .filter(p => platformFilter === 'all' || p.platform === platformFilter)
    .filter(p => clientFilter === 'all' || p.client_id === clientFilter)
    .filter(p => !activeClient || p.client_id === activeClient.id)

  return (
    <div className="view active">
      <div className="posts-toolbar">
        <select className="select-box" value={postFilter} onChange={e => setPostFilter(e.target.value)}>
          <option value="all">Visi statusai</option>
          {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select-box" value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
          <option value="all">Visos platformos</option>
          {Object.keys(PLATFORM_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="select-box" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="all">Visi klientai</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={onNewPost}>+ Naujas įrašas</button>
      </div>
      <div className="posts-table">
        <div className="table-header">
          <div className="th">Įrašas</div>
          <div className="th">Platforma</div>
          <div className="th">Klientas</div>
          <div className="th">Statusas</div>
          <div className="th">Data</div>
          <div className="th">Veiksmai</div>
        </div>
        {filteredPosts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Įrašų nerasta</div>
        ) : (
          filteredPosts.map(post => {
            const sm = STATUS_META[post.status] || STATUS_META.draft
            return (
              <div key={post.id} className="table-row">
                <div className="td" style={{ cursor: 'pointer' }} onClick={() => onSelectPost(post)}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{post.title || '(Be pavadinimo)'}</div>
                  {post.caption && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{post.caption}</div>}
                </div>
                <div className="td" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc' }} />
                  <span style={{ fontSize: 12 }}>{post.platform}</span>
                </div>
                <div className="td" style={{ fontSize: 12 }}>{post.client_id ? clientMap[post.client_id]?.company_name || '—' : '—'}</div>
                <div className="td">
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: sm.bg, color: sm.color }}>{sm.label}</span>
                </div>
                <div className="td" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{post.publish_date ? new Date(post.publish_date).toLocaleDateString('lt-LT') : '—'}</div>
                <div className="td" style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#D1FAE5', color: '#065F46', border: 'none', opacity: post.status === 'review' ? 1 : 0.35, cursor: post.status === 'review' ? 'pointer' : 'default' }}
                    title="Patvirtinti"
                    onClick={() => post.status === 'review' && onApprove(post.id)}>✓</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', opacity: post.status === 'review' ? 1 : 0.35, cursor: post.status === 'review' ? 'pointer' : 'default' }}
                    title="Atmesti"
                    onClick={() => post.status === 'review' && onReject(post.id)}>✕</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#EEF2FF', color: '#3730A3', border: 'none' }}
                    title="Koreguoti"
                    onClick={() => onEdit(post)}>✏️</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#F3F4F6', color: '#374151', border: 'none' }}
                    title="Dublikuoti"
                    onClick={() => onDuplicate(post)}>📋</button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
