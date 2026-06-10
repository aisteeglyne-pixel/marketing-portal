'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { lt } from '@/lib/i18n/lt'
import type { ContentPost } from '@/types'
import PostModal from './PostModal'

const STATUS_COLORS: Record<string, string> = {
  draft:     '#9CA3AF',
  review:    '#D97706',
  approved:  '#16A34A',
  rejected:  '#DC2626',
  published: '#4F46E5',
}

interface ContentCalendarProps {
  posts: ContentPost[]
  clientId: string
  agencyId?: string
  role: 'agency_admin' | 'client'
  onPostsChange: (posts: ContentPost[]) => void
}

interface NewPostForm {
  title: string
  caption: string
  platform: string
  publish_date: string
  status: 'draft' | 'review'
}

const defaultForm = (): NewPostForm => ({
  title: '',
  caption: '',
  platform: 'Instagram',
  publish_date: '',
  status: 'draft',
})

export default function ContentCalendar({ posts, clientId, agencyId, role, onPostsChange }: ContentCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [form, setForm] = useState<NewPostForm>(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const firstDayAdj = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const postsByDay: Record<number, ContentPost[]> = {}
  const unscheduled: ContentPost[] = []

  posts.forEach(post => {
    if (!post.publish_date) {
      unscheduled.push(post)
      return
    }
    const d = new Date(post.publish_date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!postsByDay[day]) postsByDay[day] = []
      postsByDay[day].push(post)
    }
  })

  function handlePostUpdate(updated: ContentPost) {
    onPostsChange(posts.map(p => p.id === updated.id ? updated : p))
    setSelectedPost(updated)
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMedia(true)
    const ext = file.name.split('.').pop()
    const path = `${clientId}/media/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('client-files').upload(path, file)
    if (data && !error) {
      const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
      setMediaUrl(publicUrl)
    }
    setUploadingMedia(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!agencyId) return
    setSubmitting(true)
    const { data } = await supabase.from('content_posts').insert({
      agency_id: agencyId,
      client_id: clientId,
      title: form.title,
      caption: form.caption || null,
      media_url: mediaUrl,
      platform: form.platform,
      publish_date: form.publish_date || null,
      status: form.status,
    }).select().single()
    if (data) {
      onPostsChange([...posts, data])
    }
    setForm(defaultForm())
    setMediaUrl(null)
    setShowNewPost(false)
    setSubmitting(false)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const cells: (number | null)[] = [
    ...Array(firstDayAdj).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Antraštė */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={navBtnStyle}>{lt.calendar.prev}</button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
            {lt.calendar.months[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>{lt.calendar.next}</button>
        </div>
        {role === 'agency_admin' && (
          <button
            className="btn-primary"
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => setShowNewPost(true)}
          >
            {lt.calendar.newPost}
          </button>
        )}
      </div>

      {/* Savaitės dienos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {lt.calendar.weekdays.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#aaa', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Kalendoriaus tinklelis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => (
          <div key={i} style={{
            minHeight: 90,
            borderRadius: 8,
            background: day ? (isToday(day) ? '#EEF2FF' : '#fafafa') : 'transparent',
            border: day ? `1px solid ${isToday(day) ? '#C7D2FE' : '#f0f0f0'}` : 'none',
            padding: day ? '6px' : 0,
          }}>
            {day && (
              <>
                <div style={{ fontSize: 12, fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? '#4338CA' : '#aaa', marginBottom: 4 }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(postsByDay[day] || []).slice(0, 3).map(post => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '2px 6px', borderRadius: 4, border: 'none',
                        background: STATUS_COLORS[post.status] + '22',
                        borderLeft: `3px solid ${STATUS_COLORS[post.status]}`,
                        fontSize: 11, color: '#333', cursor: 'pointer',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                      {post.title}
                    </button>
                  ))}
                  {(postsByDay[day] || []).length > 3 && (
                    <div style={{ fontSize: 10, color: '#aaa', paddingLeft: 4 }}>
                      +{(postsByDay[day] || []).length - 3}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Nesuplanuoti įrašai */}
      {unscheduled.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            {lt.calendar.unscheduled}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unscheduled.map(post => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                style={{
                  padding: '4px 10px', borderRadius: 20, border: 'none',
                  background: STATUS_COLORS[post.status] + '22',
                  borderLeft: `3px solid ${STATUS_COLORS[post.status]}`,
                  fontSize: 12, color: '#333', cursor: 'pointer',
                }}>
                {post.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Esamo įrašo modalas */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          clientId={clientId}
          role={role}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
        />
      )}

      {/* Naujo įrašo modalas */}
      {showNewPost && (
        <div
          onClick={() => setShowNewPost(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
            }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 17, fontWeight: 600 }}>{lt.newPostForm.title}</h2>
              <button onClick={() => setShowNewPost(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa' }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Pavadinimas */}
              <div>
                <label style={labelStyle}>{lt.newPostForm.titleLabel}</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={lt.newPostForm.titlePlaceholder}
                  required
                  style={inputStyle}
                />
              </div>

              {/* Platforma + data */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>{lt.newPostForm.platformLabel}</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    style={inputStyle}>
                    {lt.newPostForm.platforms.map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{lt.newPostForm.statusLabel}</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as 'draft' | 'review' }))}
                    style={inputStyle}>
                    <option value="draft">{lt.calendar.statuses.draft}</option>
                    <option value="review">{lt.calendar.statuses.review}</option>
                  </select>
                </div>
              </div>

              {/* Data */}
              <div>
                <label style={labelStyle}>{lt.newPostForm.dateLabel}</label>
                <input
                  type="datetime-local"
                  value={form.publish_date}
                  onChange={e => setForm(f => ({ ...f, publish_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Tekstas */}
              <div>
                <label style={labelStyle}>{lt.newPostForm.captionLabel}</label>
                <textarea
                  value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  placeholder={lt.newPostForm.captionPlaceholder}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Vizualas */}
              <div>
                <label style={labelStyle}>Vizualas</label>
                <input ref={mediaRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} style={{ display: 'none' }} />
                {mediaUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={mediaUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, display: 'block' }} />
                    <button
                      type="button"
                      onClick={() => { setMediaUrl(null); if (mediaRef.current) mediaRef.current.value = '' }}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => mediaRef.current?.click()}
                    disabled={uploadingMedia}
                    style={{ padding: '9px 16px', border: '1px dashed #ccc', borderRadius: 8, background: '#fafafa', color: '#888', cursor: 'pointer', fontSize: 13, width: '100%' }}>
                    {uploadingMedia ? 'Keliama...' : '🖼 Įkelti paveikslėlį / vaizdo įrašą'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={() => setShowNewPost(false)} className="btn-secondary">
                  {lt.newPostForm.cancel}
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? lt.newPostForm.submitting : lt.newPostForm.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #e5e5e5', borderRadius: 8,
  padding: '4px 12px', cursor: 'pointer', fontSize: 16, color: '#555',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#666',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: '#fff',
}
