'use client'

import { useState } from 'react'
import { PLATFORM_COLORS, STATUS_META } from '@/lib/portal-constants'
import { statusLabel, typeIcon, fmtDate, fmtTime, isVideoUrl } from '@/lib/portal-helpers'
import type { Client, ContentPost } from '@/types'

interface PostsViewProps {
  posts: ContentPost[]
  clients: Client[]
  clientMap: Record<string, Client>
  onNewPost: () => void
  onSelectPost: (post: ContentPost) => void
  onEdit: (post: ContentPost) => void
  onDuplicate: (post: ContentPost) => void
  onDelete: (post: ContentPost) => void
}

export default function PostsView({ posts, clients, clientMap, onNewPost, onSelectPost, onEdit, onDuplicate, onDelete }: PostsViewProps) {
  const [postFilter, setPostFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')

  const filteredPosts = posts
    .filter(p => postFilter === 'all' || p.status === postFilter)
    .filter(p => platformFilter === 'all' || p.platform === platformFilter)
    .filter(p => clientFilter === 'all' || p.client_id === clientFilter)

  const typeOf = (p: ContentPost) => p.content_type || 'post'

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
            const pColor = PLATFORM_COLORS[post.platform] || '#999'
            const t = typeOf(post)
            return (
              <div key={post.id} className="table-row" style={{ cursor: 'pointer' }} onClick={() => onSelectPost(post)}>
                <div className="td" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {post.media_url ? (
                    isVideoUrl(post.media_url)
                      ? <video className="post-img-thumb" src={post.media_url} />
                      : <img className="post-img-thumb" src={post.media_url} alt="" />
                  ) : (
                    <div className="post-img-placeholder" style={{ background: `${pColor}18` }}>{typeIcon(t)}</div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="post-row-title">{post.title || '(Be pavadinimo)'}</div>
                      <span className={`type-badge type-${t}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    </div>
                    {post.caption && <div className="post-row-preview">{post.caption.substring(0, 55)}…</div>}
                  </div>
                </div>
                <div className="td">
                  <div className="platform-pills">
                    <div className="platform-pill" style={{ background: pColor }} title={post.platform}>{post.platform.slice(0, 2).toUpperCase()}</div>
                  </div>
                </div>
                <div className="td" style={{ fontSize: 12, fontWeight: 600 }}>{post.client_id ? clientMap[post.client_id]?.company_name || '—' : '—'}</div>
                <div className="td"><span className={`status-badge status-${post.status}`}><span className="status-dot"></span>{statusLabel(post.status)}</span></div>
                <div className="td" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(post.publish_date)} {fmtTime(post.publish_date)}</div>
                <div className="td">
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" title="Koreguoti" onClick={e => { e.stopPropagation(); onEdit(post) }}>✏️</button>
                    <button className="btn btn-ghost btn-sm" title="Dublikuoti" onClick={e => { e.stopPropagation(); onDuplicate(post) }}>📋</button>
                    <button className="btn btn-ghost btn-sm" title="Ištrinti" onClick={e => { e.stopPropagation(); onDelete(post) }}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
