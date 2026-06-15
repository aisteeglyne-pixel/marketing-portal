'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { lt } from '@/lib/i18n/lt'
import { statusLabel } from '@/lib/portal-helpers'
import type { ContentPost } from '@/types'

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook:  '#1877F2',
  LinkedIn:  '#0A66C2',
  TikTok:    '#000000',
  X:         '#14171A',
  YouTube:   '#FF0000',
}

interface BufferProfile {
  id: string
  formatted_service_name: string
  service: string
  formatted_username: string
}

interface Comment {
  id: string
  text: string
  created_at: string
  author?: { full_name: string | null; email: string }
}

interface PostModalProps {
  post: ContentPost
  clientId: string
  role: 'agency_admin' | 'client'
  onClose: () => void
  onUpdate: (updatedPost: ContentPost) => void
}

export default function PostModal({ post, clientId, role, onClose, onUpdate }: PostModalProps) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)
  const [currentStatus, setCurrentStatus] = useState(post.status)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Buffer
  const [bufferProfiles, setBufferProfiles] = useState<BufferProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState('')

  // Escape uždaro langą + fokusas ant dialogo (klaviatūros prieinamumas)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    loadComments()
    if (role === 'agency_admin' && post.status === 'approved') loadBufferProfiles()
    if (post.publish_date) {
      setScheduleDate(post.publish_date.slice(0, 16))
    } else {
      const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0)
      setScheduleDate(d.toISOString().slice(0, 16))
    }
  }, [])

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('id, text, created_at, author:profiles(full_name, email)')
      .eq('content_post_id', post.id)
      .order('created_at', { ascending: true })
    setComments((data as any) || [])
  }

  async function loadBufferProfiles() {
    setLoadingProfiles(true)
    try {
      const res = await fetch(`/api/buffer/profiles?clientId=${clientId}`)
      const json = await res.json()
      setBufferProfiles(json.profiles || [])
      if (json.profiles?.length > 0) setSelectedProfile(json.profiles[0].id)
    } catch { /* silent */ }
    setLoadingProfiles(false)
  }

  async function submitComment() {
    if (!commentText.trim()) return
    setSubmittingComment(true)
    const { data: authData } = await supabase.auth.getUser()
    await supabase.from('comments').insert({
      content_post_id: post.id,
      author_id: authData.user?.id ?? null,
      text: commentText.trim(),
      // Kliento komentaras privalo būti 'external' — kitaip RLS jį blokuoja
      // (stulpelio default 'internal'), ir klientas nematytų net savo komentaro.
      comment_type: role === 'client' ? 'external' : 'internal',
    })
    setCommentText('')
    await loadComments()
    setSubmittingComment(false)
  }

  async function handleStatusChange(status: 'approved' | 'rejected') {
    setActionLoading(status === 'approved' ? 'approve' : 'reject')
    await supabase.from('content_posts').update({ status }).eq('id', post.id)
    setCurrentStatus(status)
    onUpdate({ ...post, status })
    setActionLoading(null)
    if (status === 'approved' && role === 'agency_admin') loadBufferProfiles()
  }

  async function handleSchedule() {
    if (!selectedProfile || !scheduleDate) return
    setScheduling(true)
    setScheduleMsg('')
    try {
      const res = await fetch('/api/buffer/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          profileId: selectedProfile,
          text: post.caption || post.title,
          scheduledAt: new Date(scheduleDate).toISOString(),
          postId: post.id,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setScheduleMsg(lt.postModal.scheduleSuccess)
        setCurrentStatus('published')
        onUpdate({ ...post, status: 'published' })
      } else {
        setScheduleMsg(json.error || lt.postModal.scheduleError)
      }
    } catch {
      setScheduleMsg(lt.postModal.scheduleError)
    }
    setScheduling(false)
  }

  const platformColor = PLATFORM_COLORS[post.platform] || '#999'
  const isVideo = post.media_url?.match(/\.(mp4|mov|webm)$/i)

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div ref={dialogRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={post.title} tabIndex={-1} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 900,
        maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)', outline: 'none',
      }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            {/* Platform badge */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: platformColor,
              color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {post.platform.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.title}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                <span className={`status-badge status-${currentStatus}`}>
                  <span className="status-dot"></span>{statusLabel(currentStatus)}
                </span>
                <span style={{ fontSize: 11, color: '#aaa' }}>
                  {post.publish_date
                    ? new Date(post.publish_date).toLocaleDateString('lt-LT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Data nenustatyta'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Uždaryti" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: '4px 8px', flexShrink: 0, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Body: dviejų kolonų */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Kairė: media + caption */}
          <div style={{ flex: '0 0 55%', borderRight: '1px solid #f0f0f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {post.media_url ? (
              isVideo ? (
                <video src={post.media_url} controls style={{ width: '100%', maxHeight: 360, display: 'block', background: '#000' }} />
              ) : (
                <img src={post.media_url} alt="vizualas" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} />
              )
            ) : (
              <div style={{
                height: 200, background: '#f8f8f8', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#ddd', fontSize: 40, flexShrink: 0,
              }}>
                🖼
              </div>
            )}

            {/* Caption */}
            <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Tekstas
              </div>
              <p style={{
                fontSize: 14, color: post.caption ? '#333' : '#ccc', lineHeight: 1.7,
                margin: 0, fontStyle: post.caption ? 'normal' : 'italic',
                whiteSpace: 'pre-wrap',
              }}>
                {post.caption || 'Nėra teksto'}
              </p>
            </div>
          </div>

          {/* Dešinė: veiksmai + komentarai */}
          <div style={{ flex: '0 0 45%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Kliento patvirtinimas */}
            {role === 'client' && currentStatus === 'review' && (
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Tavo sprendimas
                </div>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 1.5 }}>
                  Agentūra laukia tavo patvirtinimo šiam įrašui.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleStatusChange('approved')}
                    disabled={actionLoading !== null}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: 14 }}>
                    {actionLoading === 'approve' ? '...' : '✓ Patvirtinti'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleStatusChange('rejected')}
                    disabled={actionLoading !== null}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: 14 }}>
                    {actionLoading === 'reject' ? '...' : '✗ Atmesti'}
                  </button>
                </div>
              </div>
            )}

            {/* Patvirtinta/atmesta banner */}
            {currentStatus === 'approved' && role === 'client' && (
              <div style={{ padding: '1rem 1.5rem', background: '#EAF3DE', borderBottom: '1px solid #d4edda' }}>
                <div style={{ fontSize: 14, color: '#27500A', fontWeight: 600 }}>✓ Patvirtinta</div>
                <div style={{ fontSize: 12, color: '#4a7c32', marginTop: 2 }}>Agentūra gali planuoti šį įrašą</div>
              </div>
            )}
            {currentStatus === 'rejected' && (
              <div style={{ padding: '1rem 1.5rem', background: '#FCEBEB', borderBottom: '1px solid #fcd4d4' }}>
                <div style={{ fontSize: 14, color: '#791F1F', fontWeight: 600 }}>✗ Atmesta</div>
                <div style={{ fontSize: 12, color: '#a33030', marginTop: 2 }}>Palikite komentarą su pastabomis</div>
              </div>
            )}

            {/* Buffer planavimas */}
            {role === 'agency_admin' && currentStatus === 'approved' && (
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0', background: '#fafcff' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  📅 Suplanuoti per Buffer
                </div>
                {loadingProfiles ? (
                  <div style={{ fontSize: 13, color: '#aaa' }}>Kraunami profiliai...</div>
                ) : bufferProfiles.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#e07b39', background: '#FEF3C7', padding: '10px 12px', borderRadius: 8 }}>
                    Buffer API raktas neprijungtas šiam klientui
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)}
                      style={{ padding: '8px 10px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, background: '#fff' }}>
                      {bufferProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.formatted_service_name} — {p.formatted_username}</option>
                      ))}
                    </select>
                    <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                      style={{ padding: '8px 10px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }} />
                    <button onClick={handleSchedule} disabled={scheduling || !selectedProfile}
                      style={{ padding: '9px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {scheduling ? '⏳ Planuojama...' : '📤 Suplanuoti'}
                    </button>
                    {scheduleMsg && (
                      <div style={{
                        fontSize: 13, padding: '8px 12px', borderRadius: 8,
                        color: scheduleMsg === lt.postModal.scheduleSuccess ? '#27500A' : '#791F1F',
                        background: scheduleMsg === lt.postModal.scheduleSuccess ? '#EAF3DE' : '#FCEBEB',
                      }}>
                        {scheduleMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Agentūra gali keisti statusą iš review */}
            {role === 'agency_admin' && currentStatus === 'review' && (
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Statusas
                </div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>Laukiama kliento patvirtinimo</div>
                <button
                  className="btn btn-success"
                  onClick={() => handleStatusChange('approved')}
                  disabled={actionLoading !== null}
                  style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: 13 }}>
                  {actionLoading === 'approve' ? '...' : '✓ Patvirtinti agentūros vardu'}
                </button>
              </div>
            )}

            {/* Komentarai */}
            <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Komentarai {comments.length > 0 && `(${comments.length})`}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#ccc', fontStyle: 'italic', margin: 0 }}>Komentarų dar nėra</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#FCE3F6',
                        color: '#55111D', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {((c.author as any)?.full_name || (c.author as any)?.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>
                            {(c.author as any)?.full_name || (c.author as any)?.email || 'Nežinomas'}
                          </span>
                          <span style={{ fontSize: 11, color: '#bbb' }}>
                            {new Date(c.created_at).toLocaleDateString('lt-LT')}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5, background: '#f8f8f8', padding: '6px 10px', borderRadius: 8 }}>
                          {c.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={commentText}
                  rows={2}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment() }}
                  placeholder="Rašyti komentarą… (⌘/Ctrl+Enter — siųsti)"
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
                <button
                  onClick={submitComment}
                  aria-label="Siųsti komentarą"
                  disabled={submittingComment || !commentText.trim()}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
