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

const PLATFORMS: { id: string; label: string; color: string; limit: number }[] = [
  { id: 'Instagram', label: 'IG',        color: '#E1306C', limit: 2200 },
  { id: 'Facebook',  label: 'FB',        color: '#1877F2', limit: 63206 },
  { id: 'LinkedIn',  label: 'LI',        color: '#0A66C2', limit: 3000 },
  { id: 'TikTok',    label: 'TT',        color: '#000000', limit: 2200 },
  { id: 'X',         label: 'X',         color: '#14171A', limit: 280 },
  { id: 'YouTube',   label: 'YT',        color: '#FF0000', limit: 5000 },
]

interface ContentCalendarProps {
  posts: ContentPost[]
  clientId: string
  agencyId?: string
  role: 'agency_admin' | 'client'
  onPostsChange: (posts: ContentPost[]) => void
}

export default function ContentCalendar({ posts, clientId, agencyId, role, onPostsChange }: ContentCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)

  // New post form state
  const [platform, setPlatform] = useState('Instagram')
  const [caption, setCaption] = useState('')
  const [publishDate, setPublishDate] = useState('')
  const [status, setStatus] = useState<'draft' | 'review'>('draft')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
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
    if (!post.publish_date) { unscheduled.push(post); return }
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

  async function uploadMedia(file: File) {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return
    setUploadingMedia(true)
    // Local preview
    const reader = new FileReader()
    reader.onload = e => setMediaPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    // Upload to storage
    const ext = file.name.split('.').pop()
    const path = `${clientId}/media/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('client-files').upload(path, file)
    if (data && !error) {
      const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
      setMediaUrl(publicUrl)
    }
    setUploadingMedia(false)
  }

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadMedia(file)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await uploadMedia(file)
  }

  function resetForm() {
    setPlatform('Instagram')
    setCaption('')
    setPublishDate('')
    setStatus('draft')
    setMediaUrl(null)
    setMediaPreview(null)
    setShowNewPost(false)
  }

  async function handleCreate() {
    if (!agencyId) return
    setSubmitting(true)
    // Use first line of caption as title, fallback to platform + date
    const title = caption.split('\n')[0].slice(0, 80) || `${platform} ${publishDate || 'įrašas'}`
    const { data } = await supabase.from('content_posts').insert({
      agency_id: agencyId,
      client_id: clientId,
      title,
      caption: caption || null,
      media_url: mediaUrl,
      platform,
      publish_date: publishDate || null,
      status,
    }).select().single()
    if (data) onPostsChange([...posts, data])
    resetForm()
    setSubmitting(false)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const cells: (number | null)[] = [
    ...Array(firstDayAdj).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const currentPlatform = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0]
  const charsLeft = currentPlatform.limit - caption.length
  const charsWarning = charsLeft < 50

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
          <button className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setShowNewPost(true)}>
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
            minHeight: 90, borderRadius: 8,
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
                    <button key={post.id} onClick={() => setSelectedPost(post)} style={{
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
                    <div style={{ fontSize: 10, color: '#aaa', paddingLeft: 4 }}>+{(postsByDay[day] || []).length - 3}</div>
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
              <button key={post.id} onClick={() => setSelectedPost(post)} style={{
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
        <PostModal post={selectedPost} clientId={clientId} role={role} onClose={() => setSelectedPost(null)} onUpdate={handlePostUpdate} />
      )}

      {/* ── NAUJO ĮRAŠO MODALAS (Kontentino stilius) ── */}
      {showNewPost && (
        <div onClick={resetForm} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860,
            maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Naujas įrašas</span>
                {/* Platform selector */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.id} type="button" onClick={() => setPlatform(p.id)} style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: platform === p.id ? p.color : '#f0f0f0',
                      color: platform === p.id ? '#fff' : '#888',
                      fontSize: 11, fontWeight: 700,
                      outline: platform === p.id ? `2px solid ${p.color}` : 'none',
                      outlineOffset: 2,
                      transition: 'all 0.15s',
                    }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}>✕</button>
            </div>

            {/* Body: dviejų kolonų */}
            <form onSubmit={e => { e.preventDefault(); handleCreate() }} style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

              {/* Kairė: redagavimas */}
              <div style={{ flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Media zona */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !mediaPreview && mediaRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? currentPlatform.color : '#e0e0e0'}`,
                    borderRadius: 12, overflow: 'hidden',
                    background: dragOver ? currentPlatform.color + '08' : '#fafafa',
                    cursor: mediaPreview ? 'default' : 'pointer',
                    minHeight: mediaPreview ? 0 : 140,
                    position: 'relative',
                    transition: 'all 0.15s',
                  }}>
                  {uploadingMedia ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: '#aaa', fontSize: 13 }}>
                      Keliama...
                    </div>
                  ) : mediaPreview ? (
                    <>
                      <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                      <button type="button" onClick={e => { e.stopPropagation(); setMediaUrl(null); setMediaPreview(null); if (mediaRef.current) mediaRef.current.value = '' }}
                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                      <button type="button" onClick={e => { e.stopPropagation(); mediaRef.current?.click() }}
                        style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                        Keisti
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 8, color: '#bbb' }}>
                      <span style={{ fontSize: 32 }}>🖼</span>
                      <span style={{ fontSize: 13 }}>Nutempk arba spustelėk įkelti media</span>
                      <span style={{ fontSize: 11 }}>JPG, PNG, MP4, MOV</span>
                    </div>
                  )}
                  <input ref={mediaRef} type="file" accept="image/*,video/*" onChange={handleMediaSelect} style={{ display: 'none' }} />
                </div>

                {/* Caption */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={`Parašyk ${platform} įrašo tekstą...`}
                    rows={6}
                    maxLength={currentPlatform.limit}
                    style={{
                      width: '100%', padding: '12px', border: '1px solid #e5e5e5',
                      borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical',
                      boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: charsWarning ? '#DC2626' : '#aaa', marginTop: 4 }}>
                    {caption.length} / {currentPlatform.limit}
                  </div>
                </div>

                {/* Data + statusas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Publikavimo data</label>
                    <input type="datetime-local" value={publishDate} onChange={e => setPublishDate(e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Statusas</label>
                    <select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'review')} style={inputStyle}>
                      <option value="draft">📝 Juodraštis</option>
                      <option value="review">👁 Siųsti peržiūrai</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dešinė: peržiūra */}
              <div style={{ width: 280, flexShrink: 0, padding: '1.25rem', overflowY: 'auto', background: '#f8f8f8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Peržiūra — {platform}
                </div>
                {/* Mock phone frame */}
                <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Profile bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentPlatform.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                      {currentPlatform.label}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Jūsų paskyra</div>
                      <div style={{ fontSize: 10, color: '#aaa' }}>{publishDate ? new Date(publishDate).toLocaleDateString('lt-LT') : 'Data nenustatyta'}</div>
                    </div>
                  </div>
                  {/* Media preview */}
                  {mediaPreview && (
                    <img src={mediaPreview} alt="preview" style={{ width: '100%', aspectRatio: platform === 'Instagram' ? '1' : platform === 'LinkedIn' ? '1.91/1' : 'auto', objectFit: 'cover', display: 'block', maxHeight: 200 }} />
                  )}
                  {!mediaPreview && (
                    <div style={{ background: '#f0f0f0', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 24 }}>🖼</div>
                  )}
                  {/* Caption preview */}
                  <div style={{ padding: '10px 12px' }}>
                    {caption ? (
                      <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: '#333',
                        overflow: 'hidden', maxHeight: '6em' }}>
                        {caption}
                      </p>
                    ) : (
                      <p style={{ fontSize: 12, color: '#ccc', fontStyle: 'italic', margin: 0 }}>Tekstas pasirodys čia...</p>
                    )}
                  </div>
                  {/* Like/comment bar */}
                  <div style={{ padding: '6px 12px 10px', display: 'flex', gap: 12, borderTop: '1px solid #f5f5f5' }}>
                    <span style={{ fontSize: 16 }}>❤️</span>
                    <span style={{ fontSize: 16 }}>💬</span>
                    <span style={{ fontSize: 16 }}>📤</span>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#aaa' }}>
                {uploadingMedia ? '⏳ Media keliama...' : mediaUrl ? '✓ Media įkelta' : ''}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={resetForm} className="btn-secondary">Atšaukti</button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || uploadingMedia}
                  className="btn-primary"
                  style={{ background: currentPlatform.color, minWidth: 120 }}>
                  {submitting ? 'Kuriama...' : status === 'review' ? '📤 Siųsti peržiūrai' : '💾 Išsaugoti juodraštį'}
                </button>
              </div>
            </div>
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
  display: 'block', fontSize: 11, fontWeight: 600, color: '#888',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff',
}
