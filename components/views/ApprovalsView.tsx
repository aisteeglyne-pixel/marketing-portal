'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PLATFORM_COLORS } from '@/lib/portal-constants'
import { statusLabel, typeIcon, fmtDate, fmtTime, isVideoUrl } from '@/lib/portal-helpers'
import type { Client, ContentPost, Comment } from '@/types'

interface ApprovalsViewProps {
  posts: ContentPost[]
  clientMap: Record<string, Client>
  onSelectPost: (post: ContentPost) => void
  onApprove: (postId: string) => void
  onNeedsChanges: (postId: string) => void
  onSchedule: (post: ContentPost) => void
  onDuplicate: (post: ContentPost) => void
  showToast: (msg: string) => void
}

export default function ApprovalsView({ posts, clientMap, onSelectPost, onApprove, onNeedsChanges, onSchedule, onDuplicate, showToast }: ApprovalsViewProps) {
  const supabase = createClient()
  const [approvalTab, setApprovalTab] = useState<'internal' | 'client' | 'done'>('internal')
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [commentTypes, setCommentTypes] = useState<Record<string, 'internal' | 'external'>>({})
  const pendingPosts = posts.filter(p => p.status === 'review')

  const approvalPosts = approvalTab === 'done'
    ? posts.filter(p => ['published','scheduled'].includes(p.status)).slice(0, 6)
    : posts.filter(p => (approvalTab === 'internal' ? ['review'] : ['approved']).includes(p.status))

  useEffect(() => {
    async function loadComments() {
      const ids = approvalPosts.map(p => p.id)
      if (ids.length === 0) { setComments({}); return }
      const { data } = await supabase
        .from('comments')
        .select('id, content_post_id, text, created_at, comment_type, author:profiles(full_name, email)')
        .in('content_post_id', ids)
        .order('created_at', { ascending: true })
      const grouped: Record<string, Comment[]> = {}
      ;(data as any[] || []).forEach(c => {
        if (!grouped[c.content_post_id]) grouped[c.content_post_id] = []
        grouped[c.content_post_id].push(c)
      })
      setComments(grouped)
    }
    loadComments()
  }, [approvalTab, posts.length])

  async function submitComment(postId: string) {
    const text = (commentDrafts[postId] || '').trim()
    if (!text) return
    const ctype = commentTypes[postId] || 'internal'
    const { data: authData } = await supabase.auth.getUser()
    const { data } = await supabase.from('comments').insert({
      content_post_id: postId,
      author_id: authData.user?.id ?? null,
      text,
      comment_type: ctype,
    }).select('id, content_post_id, text, created_at, comment_type, author:profiles(full_name, email)').single()
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as any] }))
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
      if (ctype === 'external') showToast('📧 Klientas informuotas el. paštu')
    }
  }

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
        <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-muted)', marginTop: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700 }}>Viskas švaru!</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Šioje kategorijoje laukiančių įrašų nėra.</div>
        </div>
      ) : (
        <div className="approvals-grid" style={{ marginTop: 16 }}>
          {approvalPosts.map(post => {
            const clientName = post.client_id ? clientMap[post.client_id]?.company_name || '—' : '—'
            const postComments = comments[post.id] || []
            const ctype = commentTypes[post.id] || 'internal'
            return (
              <div key={post.id} className="approval-card">
                <div className="approval-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span>{typeIcon(post.content_type)}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{post.title}</div>
                      <div className="text-muted" style={{ marginTop: 1 }}>{clientName}</div>
                    </div>
                  </div>
                  <span className={`status-badge status-${post.status}`}><span className="status-dot"></span>{statusLabel(post.status)}</span>
                </div>
                <div className="approval-card-body">
                  {post.media_url ? (
                    isVideoUrl(post.media_url)
                      ? <video className="approval-media-img" src={post.media_url} />
                      : <img className="approval-media-img" src={post.media_url} alt={post.title} />
                  ) : (
                    <div className="approval-media-placeholder">🖼️</div>
                  )}
                  <div className="approval-preview">{(post.caption || '').substring(0, 120)}{(post.caption || '').length > 120 ? '…' : ''}</div>
                  <div className="approval-meta">
                    <span>📅 {fmtDate(post.publish_date)} {fmtTime(post.publish_date)}</span>
                    <span>{post.platform}</span>
                  </div>
                  {post.status === 'approved' ? (
                    <div style={{ background: '#D1FAE5', border: '1.5px solid #6EE7B7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>✅</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46', letterSpacing: 0.5 }}>PATVIRTINTA</div>
                          <div style={{ fontSize: 11, color: '#059669' }}>Paruošta skelbimui</div>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => onSchedule(post)}>🚀 Suplanuoti</button>
                    </div>
                  ) : approvalTab !== 'done' ? (
                    <div className="approval-actions">
                      <button className="btn btn-success btn-sm" onClick={() => onApprove(post.id)}>✓ Patvirtinti</button>
                      <button className="btn btn-warning btn-sm" onClick={() => onNeedsChanges(post.id)}>↩ Reikia pataisymų</button>
                      <button className="btn btn-outline btn-sm" onClick={() => onSelectPost(post)}>👁 Peržiūrėti</button>
                      <button className="btn btn-outline btn-sm" onClick={() => onDuplicate(post)}>📋 Dublikuoti</button>
                    </div>
                  ) : (
                    <div className="approval-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => onSelectPost(post)}>👁 Peržiūrėti įrašą</button>
                    </div>
                  )}
                </div>
                {/* Komentarų sekcija */}
                <div className="comment-section">
                  <div>
                    {postComments.map(c => (
                      <div key={c.id} className="comment" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <div className="activity-avatar" style={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}>
                          {(((c as any).author?.full_name || (c as any).author?.email || '?') as string).slice(0, 1).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{(c as any).author?.full_name || (c as any).author?.email || 'Nežinomas'}</span>
                            <span className={`comment-badge ${(c as any).comment_type === 'external' ? 'ext-badge' : 'int-badge'}`}>
                              {(c as any).comment_type === 'external' ? '🌐 External' : '🔒 Internal'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('lt-LT')}</span>
                          </div>
                          <div className="comment-bubble" style={{ fontSize: 12, marginTop: 2 }}>{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="comment-type-row">
                    <button className={`ctype-btn${ctype === 'internal' ? ' active' : ''}`} onClick={() => setCommentTypes(prev => ({ ...prev, [post.id]: 'internal' }))}>🔒 Internal</button>
                    <button className={`ctype-btn${ctype === 'external' ? ' active' : ''}`} onClick={() => setCommentTypes(prev => ({ ...prev, [post.id]: 'external' }))}>🌐 External</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <input
                      className="comment-field"
                      style={{ flex: 1, minWidth: 160 }}
                      placeholder="Komentaras…"
                      value={commentDrafts[post.id] || ''}
                      onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                    />
                    <button className="btn btn-outline btn-sm" onClick={() => submitComment(post.id)}>💬 Komentuoti</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
