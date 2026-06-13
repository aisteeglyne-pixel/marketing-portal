'use client'

import { useState } from 'react'
import ContentCalendar from '@/components/ContentCalendar'
import PostModal from '@/components/PostModal'
import { fmtDate } from '@/lib/portal-helpers'
import type { ContentPost } from '@/types'

interface Props {
  clientId: string
  agencyId: string
  posts: ContentPost[]
  onPostsChange: (posts: ContentPost[]) => void
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Juodraštis',  bg: '#F0F0F0', color: '#666' },
  review:    { label: 'Tau peržiūrai', bg: '#FEF3C7', color: '#92400E' },
  approved:  { label: 'Patvirtinta', bg: '#EAF3DE', color: '#27500A' },
  rejected:  { label: 'Grąžinta',    bg: '#FCEBEB', color: '#791F1F' },
  scheduled: { label: 'Suplanuota',  bg: '#EEF2FF', color: '#4338CA' },
  published: { label: 'Paskelbta',   bg: '#EEF2FF', color: '#4338CA' },
}
const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C', Facebook: '#1877F2', LinkedIn: '#0A66C2', TikTok: '#000000', X: '#14171A', YouTube: '#FF0000',
}

export default function ClientContentView({ clientId, agencyId, posts, onPostsChange }: Props) {
  const [mode, setMode] = useState<'pending' | 'calendar' | 'all'>('pending')
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)

  const pending = posts.filter(p => p.status === 'review')
  const listPosts = mode === 'pending' ? pending : posts

  function updatePost(updated: ContentPost) {
    onPostsChange(posts.map(p => p.id === updated.id ? updated : p))
  }

  return (
    <div className="view active">
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {[
          ['pending', `⏳ Laukia (${pending.length})`],
          ['calendar', '📅 Kalendorius'],
          ['all', 'Visi įrašai'],
        ].map(([id, label]) => (
          <div key={id} onClick={() => setMode(id as any)}
            style={{ padding: '10px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', color: mode === id ? 'var(--text)' : 'var(--text-muted)', borderBottom: mode === id ? '2.5px solid var(--primary)' : '2.5px solid transparent' }}>
            {label}
          </div>
        ))}
      </div>

      {mode === 'calendar' ? (
        <div className="card" style={{ padding: 18 }}>
          <ContentCalendar posts={posts} clientId={clientId} agencyId={agencyId} role="client" onPostsChange={onPostsChange} />
        </div>
      ) : listPosts.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          {mode === 'pending' ? 'Nieko nelaukia patvirtinimo.' : 'Įrašų dar nėra.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {listPosts.map(p => {
            const st = STATUS_META[p.status] || STATUS_META.draft
            return (
              <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => setSelectedPost(p)}>
                {p.media_url ? (
                  <div style={{ height: 150, background: `#f2f2f5 url(${p.media_url}) center/cover` }} />
                ) : (
                  <div style={{ height: 150, background: '#f2f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>📝</div>
                )}
                <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{p.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: PLATFORM_COLORS[p.platform] || '#999' }} />
                    <span className="text-muted" style={{ fontSize: 11.5 }}>{p.platform} · {fmtDate(p.publish_date || p.created_at)}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          clientId={clientId}
          role="client"
          onClose={() => setSelectedPost(null)}
          onUpdate={updated => { updatePost(updated); setSelectedPost(updated) }}
        />
      )}
    </div>
  )
}
