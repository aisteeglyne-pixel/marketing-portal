'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { lt } from '@/lib/i18n/lt'
import type { ContentPost } from '@/types'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#F0F0F0', color: '#666' },
  review:    { bg: '#FEF3C7', color: '#92400E' },
  approved:  { bg: '#EAF3DE', color: '#27500A' },
  rejected:  { bg: '#FCEBEB', color: '#791F1F' },
  published: { bg: '#EEF2FF', color: '#4338CA' },
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

  // Buffer
  const [bufferProfiles, setBufferProfiles] = useState<BufferProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState('')
  const [currentStatus, setCurrentStatus] = useState(post.status)

  useEffect(() => {
    loadComments()
    if (role === 'agency_admin' && post.status === 'approved') {
      loadBufferProfiles()
    }
    // Default schedule date = post.publish_date or next hour
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
    const { data: { user } } = await supabase.auth.getUser() as any
    await supabase.from('comments').insert({
      content_post_id: post.id,
      author_id: user?.id,
      text: commentText.trim(),
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

  const statusStyle = STATUS_COLORS[currentStatus] || STATUS_COLORS.draft

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{post.title}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ ...statusStyle, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                {lt.calendar.statuses[currentStatus as keyof typeof lt.calendar.statuses] || currentStatus}
              </span>
              <span style={{ fontSize: 13, color: '#888' }}>{lt.postModal.platform} {post.platform}</span>
              <span style={{ fontSize: 13, color: '#888' }}>
                {post.publish_date
                  ? new Date(post.publish_date).toLocaleDateString('lt-LT')
                  : lt.postModal.noDate}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa', padding: 4, flexShrink: 0 }}>
            {lt.postModal.close}
          </button>
        </div>

        {/* Caption */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            {lt.postModal.caption}
          </div>
          <p style={{ fontSize: 14, color: post.caption ? '#333' : '#ccc', lineHeight: 1.6, margin: 0, fontStyle: post.caption ? 'normal' : 'italic' }}>
            {post.caption || lt.postModal.noCaption}
          </p>
        </div>

        {/* Patvirtinimo mygtukai (klientui) */}
        {role === 'client' && currentStatus === 'review' && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleStatusChange('approved')}
              disabled={actionLoading !== null}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#EAF3DE', color: '#27500A', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {actionLoading === 'approve' ? '...' : lt.postModal.approveBtn}
            </button>
            <button
              onClick={() => handleStatusChange('rejected')}
              disabled={actionLoading !== null}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#FCEBEB', color: '#791F1F', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {actionLoading === 'reject' ? '...' : lt.postModal.rejectBtn}
            </button>
          </div>
        )}

        {/* Buffer planavimas (agentūrai, kai approved) */}
        {role === 'agency_admin' && currentStatus === 'approved' && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              {lt.postModal.scheduleSection}
            </div>
            {loadingProfiles ? (
              <div style={{ fontSize: 13, color: '#aaa' }}>{lt.postModal.loadingProfiles}</div>
            ) : bufferProfiles.length === 0 ? (
              <div style={{ fontSize: 13, color: '#e07b39' }}>{lt.postModal.noBufferToken}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  value={selectedProfile}
                  onChange={e => setSelectedProfile(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                  {bufferProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.formatted_service_name} — {p.formatted_username}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14 }}
                />
                <button
                  onClick={handleSchedule}
                  disabled={scheduling || !selectedProfile}
                  style={{ padding: '10px', borderRadius: 8, border: 'none', background: 'var(--brand-600)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  {scheduling ? lt.postModal.scheduling : lt.postModal.scheduleBtn}
                </button>
                {scheduleMsg && (
                  <div style={{ fontSize: 13, color: scheduleMsg === lt.postModal.scheduleSuccess ? '#27500A' : '#791F1F', padding: '8px 12px', borderRadius: 8, background: scheduleMsg === lt.postModal.scheduleSuccess ? '#EAF3DE' : '#FCEBEB' }}>
                    {scheduleMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Komentarai */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {lt.postModal.comments}
          </div>
          {comments.length === 0 ? (
            <p style={{ fontSize: 13, color: '#ccc', fontStyle: 'italic', marginBottom: 12 }}>{lt.postModal.noComments}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {comments.map(c => (
                <div key={c.id} style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600, color: '#555', marginRight: 6 }}>
                    {(c.author as any)?.full_name || (c.author as any)?.email || 'Nežinomas'}
                  </span>
                  <span style={{ color: '#888', fontSize: 11, marginRight: 8 }}>
                    {new Date(c.created_at).toLocaleDateString('lt-LT')}
                  </span>
                  <div style={{ color: '#333', marginTop: 2 }}>{c.text}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder={lt.postModal.commentPlaceholder}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none' }}
            />
            <button
              onClick={submitComment}
              disabled={submittingComment || !commentText.trim()}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--brand-600)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
              {lt.postModal.sendComment}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
