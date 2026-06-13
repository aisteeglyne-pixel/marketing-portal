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
  published: '#55111D',
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
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel'>('post')
  const [caption, setCaption] = useState('')
  const [publishDate, setPublishDate] = useState('')
  const [publishTime, setPublishTime] = useState('10:00')
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
    setContentType('post')
    setCaption('')
    setPublishDate('')
    setPublishTime('10:00')
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
            background: day ? (isToday(day) ? '#FCE3F6' : '#fafafa') : 'transparent',
            border: day ? `1px solid ${isToday(day) ? '#E9C9E0' : '#f0f0f0'}` : 'none',
            padding: day ? '6px' : 0,
          }}>
            {day && (
              <>
                <div style={{ fontSize: 12, fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? '#55111D' : '#aaa', marginBottom: 4 }}>
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

      {/* ── NAUJO ĮRAŠO MODALAS (DAR Content stilius) ── */}
      {showNewPost && (
        <div onClick={resetForm} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 900,
            maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.20)',
          }}>

            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>✍️</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Naujas įrašas</h3>
              <span style={{ fontSize: 12, color: '#aaa', marginLeft: 4 }}>Visi laukai išsaugomi automatiškai</span>
              <button onClick={resetForm} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#bbb', lineHeight: 1, padding: '4px 6px' }}>✕</button>
            </div>

            {/* Body */}
            <form onSubmit={e => { e.preventDefault(); handleCreate() }} style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

              {/* ─── KAIRĖ: forma ─── */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', borderRight: '1px solid #f0f0f0' }}>

                {/* 1. Turinio tipas */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Turinio tipas</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([
                      { id: 'post',  icon: '📝', label: 'Įrašas' },
                      { id: 'story', icon: '📖', label: 'Istorija' },
                      { id: 'reel',  icon: '🎬', label: 'Reels' },
                    ] as const).map(t => (
                      <button key={t.id} type="button" onClick={() => setContentType(t.id)} style={{
                        flex: 1, padding: '9px 8px', borderRadius: 8,
                        border: `2px solid ${contentType === t.id ? '#FF68D8' : '#e5e5e5'}`,
                        background: contentType === t.id ? '#FCE3F6' : '#fff',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        color: contentType === t.id ? '#55111D' : '#888',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        transition: 'all 0.15s',
                      }}>
                        <span style={{ fontSize: 18 }}>{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Platforma */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Platforma</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PLATFORMS.map(p => (
                      <button key={p.id} type="button" onClick={() => setPlatform(p.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${platform === p.id ? p.color : '#e5e5e5'}`,
                        background: platform === p.id ? p.color + '12' : '#fff',
                        fontSize: 12, fontWeight: 600, color: platform === p.id ? p.color : '#888',
                        opacity: platform === p.id ? 1 : 0.6,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 4,
                          background: p.color, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700,
                        }}>{p.label}</div>
                        {p.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. AI bar */}
                <div style={{
                  background: 'linear-gradient(135deg, #FCE3F6, #F5F3FF)',
                  border: '1.5px solid #E9C9E0', borderRadius: 8,
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 16, cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FCE3F6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #FCE3F6, #F5F3FF)')}
                >
                  <span style={{ fontSize: 18 }}>✨</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#55111D', flex: 1 }}>
                    Generuoti su AI — parašyk geresnius tekstus per sekundes
                  </span>
                  <span style={{ background: '#FF68D8', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>AI</span>
                </div>

                {/* 4. Tekstas (caption) */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Tekstas</label>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={`Rašyk ${platform} įrašo tekstą... Naudok #žymes ir @paminėjimus`}
                    rows={5}
                    maxLength={currentPlatform.limit}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5',
                      borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical',
                      boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: charsWarning ? '#DC2626' : '#aaa' }}>
                      {caption.length} / {currentPlatform.limit}
                    </span>
                  </div>
                </div>

                {/* 5. Media */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Vizualas / Media</label>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !mediaPreview && mediaRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? '#FF68D8' : '#e0e0e0'}`,
                      borderRadius: 10, overflow: 'hidden',
                      background: dragOver ? '#FCE3F6' : '#fafafa',
                      cursor: mediaPreview ? 'default' : 'pointer',
                      position: 'relative', transition: 'all 0.2s',
                    }}>
                    {uploadingMedia ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, color: '#aaa', fontSize: 13 }}>Keliama...</div>
                    ) : mediaPreview ? (
                      <>
                        <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                        <button type="button" onClick={e => { e.stopPropagation(); setMediaUrl(null); setMediaPreview(null); if (mediaRef.current) mediaRef.current.value = '' }}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        <button type="button" onClick={e => { e.stopPropagation(); mediaRef.current?.click() }}
                          style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Keisti</button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 6, color: '#bbb' }}>
                        <span style={{ fontSize: 28 }}>🖼️</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#FF68D8' }}>Įkelti nuotrauką ar vaizdo įrašą</span>
                        <span style={{ fontSize: 11 }}>Nutempk arba spustelėk · JPG, PNG, MP4 · Max 50MB</span>
                      </div>
                    )}
                    <input ref={mediaRef} type="file" accept="image/*,video/*" onChange={handleMediaSelect} style={{ display: 'none' }} />
                  </div>
                </div>

                {/* 6. Data ir laikas */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Planuojama publikacija</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    <input type="time" value={publishTime} onChange={e => setPublishTime(e.target.value)} style={{ ...inputStyle, width: 110 }} />
                  </div>
                </div>

                {/* 7. Workflow */}
                <div>
                  <label style={labelStyle}>Siųsti kaip</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      { val: 'draft',     icon: '💾', label: 'Juodraštis' },
                      { val: 'review',    icon: '👁️', label: 'Vidinė peržiūra' },
                    ] as const).map(w => (
                      <button key={w.val} type="button" onClick={() => setStatus(w.val)} style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: `2px solid ${status === w.val ? '#FF68D8' : '#e5e5e5'}`,
                        background: status === w.val ? '#FCE3F6' : '#fff',
                        color: status === w.val ? '#55111D' : '#666',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s',
                      }}>
                        <span>{w.icon}</span>{w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ─── DEŠINĖ: telefono peržiūra ─── */}
              <div style={{ width: 300, flexShrink: 0, padding: '20px', overflowY: 'auto', background: '#f8f9fb' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                  Gyva peržiūra
                </div>

                {/* Platformų tab'ai */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {PLATFORMS.slice(0, 3).map(p => (
                    <button key={p.id} type="button" onClick={() => setPlatform(p.id)} style={{
                      flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: platform === p.id ? p.color : '#ebebeb',
                      color: platform === p.id ? '#fff' : '#888',
                      fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                    }}>{p.label}</button>
                  ))}
                </div>

                {/* Telefono frame */}
                <div style={{
                  background: '#fff', borderRadius: 20, border: '3px solid #ddd',
                  overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  maxWidth: 260, margin: '0 auto',
                }}>
                  {/* Notch bar */}
                  <div style={{ height: 20, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2 }} />
                  </div>
                  {/* Post header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentPlatform.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {currentPlatform.label}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>jūsų_paskyra</div>
                      <div style={{ fontSize: 9, color: '#aaa' }}>Sponsored</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 14, color: '#aaa' }}>···</div>
                  </div>
                  {/* Media */}
                  {mediaPreview ? (
                    <img src={mediaPreview} alt="" style={{
                      width: '100%',
                      aspectRatio: contentType === 'story' ? '9/16' : '1',
                      objectFit: 'cover', display: 'block', maxHeight: 200,
                    }} />
                  ) : (
                    <div style={{
                      background: '#f0f0f0', aspectRatio: contentType === 'story' ? '9/16' : '1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ccc', fontSize: 24, maxHeight: 200, overflow: 'hidden',
                    }}>🖼️</div>
                  )}
                  {/* Actions */}
                  <div style={{ padding: '8px 12px 2px', display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>❤️</span>
                    <span style={{ fontSize: 14 }}>💬</span>
                    <span style={{ fontSize: 14 }}>✈️</span>
                  </div>
                  {/* Caption preview */}
                  <div style={{ padding: '4px 12px 12px' }}>
                    {caption ? (
                      <p style={{ fontSize: 11, lineHeight: 1.5, margin: 0, color: '#333', overflow: 'hidden', maxHeight: '5em' }}>
                        <strong>jūsų_paskyra</strong> {caption}
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic', margin: 0 }}>Tekstas pasirodys čia...</p>
                    )}
                  </div>
                </div>

                {/* Char counts */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6, fontWeight: 600 }}>Simbolių skaičius:</div>
                  {PLATFORMS.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 3, color: caption.length > p.limit * 0.9 ? '#DC2626' : '#555' }}>
                      <span>{p.id}</span>
                      <span>{caption.length} / {p.limit.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#aaa' }}>
                {uploadingMedia ? '⏳ Media keliama...' : mediaUrl ? '✓ Media įkelta' : ''}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={resetForm} className="btn-secondary">Atšaukti</button>
                <button type="button" onClick={() => { setStatus('draft'); handleCreate() }}
                  disabled={submitting || uploadingMedia}
                  className="btn-secondary">
                  💾 Išsaugoti juodraštį
                </button>
                <button type="button" onClick={() => { setStatus('review'); handleCreate() }}
                  disabled={submitting || uploadingMedia}
                  className="btn-primary">
                  {submitting ? 'Kuriama...' : '📤 Siųsti peržiūrai →'}
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
