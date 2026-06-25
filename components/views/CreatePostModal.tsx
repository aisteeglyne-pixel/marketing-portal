'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PLATFORM_COLORS, CHAR_LIMITS } from '@/lib/portal-constants'
import type { Client, ContentPost } from '@/types'

interface CreatePostModalProps {
  agencyId: string
  clients: Client[]
  activeClient: Client | null
  onClose: () => void
  onCreated: (post: ContentPost) => void
}

export default function CreatePostModal({ agencyId, clients, activeClient, onClose, onCreated }: CreatePostModalProps) {
  const supabase = createClient()
  const [newPost, setNewPost] = useState({ title: '', caption: '', platform: 'Instagram', publish_date: '', contentType: 'post', client_id: '', media_url: '' })
  const [creatingStatus, setCreatingStatus] = useState<string | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleCreate(status: 'draft' | 'review' | 'approved' | 'scheduled') {
    if (!newPost.title || creatingStatus) return
    if (status === 'scheduled' && !newPost.publish_date) {
      setMediaError('Planavimui būtina data ir laikas')
      return
    }
    setCreatingStatus(status)
    const { data, error } = await supabase.from('content_posts').insert({
      agency_id: agencyId,
      client_id: newPost.client_id || activeClient?.id || null,
      title: newPost.title,
      caption: newPost.caption,
      platform: newPost.platform,
      content_type: newPost.contentType,
      publish_date: newPost.publish_date || null,
      media_url: newPost.media_url || null,
      status,
    }).select().single()
    setCreatingStatus(null)
    if (error) { setMediaError('Nepavyko išsaugoti: ' + error.message); return }
    if (data) onCreated(data)
  }

  async function handleMediaUpload(file: File) {
    setMediaError('')
    if (file.size > 50 * 1024 * 1024) { setMediaError('Failas per didelis (max 50MB)'); return }
    if (!file.type.match(/^(image|video)\//)) { setMediaError('Tik nuotraukos arba video (JPG, PNG, MP4)'); return }
    setUploadingMedia(true)
    const path = `posts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    const { error } = await supabase.storage.from('client-files').upload(path, file)
    if (error) {
      setMediaError('Įkėlimas nepavyko: ' + error.message)
    } else {
      const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
      setNewPost(p => ({ ...p, media_url: publicUrl }))
    }
    setUploadingMedia(false)
  }

  const isVideoUrl = (url: string) => !!url.match(/\.(mp4|mov|webm)/i)

  return (
    <>
      <div className="modal-overlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal">
          <div className="modal-header">
            <span style={{ fontSize: 20 }}>✍️</span>
            <h3 className="modal-title">Naujas įrašas</h3>
            {activeClient && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 20 }}>{activeClient.company_name}</span>}
            <span className="text-muted" style={{ fontSize: 12 }}>Automatiškai išsaugoma</span>
            <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
          </div>
          <div className="modal-body">
            <div className="modal-form">
              {/* Content type */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Turinio tipas</label>
                <div className="content-type-selector">
                  {[['post','📝','Post'],['story','📖','Story'],['reel','🎬','Reel']].map(([type, icon, label]) => (
                    <div key={type} className={`content-type-btn${newPost.contentType === type ? ' active' : ''}`} onClick={() => setNewPost(p => ({ ...p, contentType: type as string }))}>
                      <span className="ct-icon">{icon}</span>{label}
                    </div>
                  ))}
                </div>
              </div>
              {/* Platform */}
              <div className="form-group">
                <label className="form-label">Platforma</label>
                <div className="platform-selector">
                  {Object.entries(PLATFORM_COLORS).map(([p, c]) => (
                    <div key={p} className={`platform-btn${newPost.platform === p ? ' selected' : ''}`} onClick={() => setNewPost(prev => ({ ...prev, platform: p }))} style={{ color: c }}>
                      <div className="picon" style={{ background: c }}>{p.slice(0,2).toUpperCase()}</div> {p}
                    </div>
                  ))}
                </div>
              </div>
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Pavadinimas</label>
                <input className="form-input" value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} placeholder="Įveskite įrašo pavadinimą..." />
              </div>
              {/* Caption */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tekstas</span>
                  <span style={{ fontWeight: 500, fontSize: 11, color: newPost.caption.length > (CHAR_LIMITS[newPost.platform] || 2200) ? '#DC2626' : 'var(--text-muted)' }}>
                    {newPost.platform} · {newPost.caption.length.toLocaleString('lt-LT')} / {(CHAR_LIMITS[newPost.platform] || 2200).toLocaleString('lt-LT')}
                  </span>
                </label>
                <textarea className="form-input" rows={4} value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} placeholder="Rašykite tekstą..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              {/* Media upload */}
              <div className="form-group">
                <label className="form-label">Vizualas / Media</label>
                {newPost.media_url ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {isVideoUrl(newPost.media_url)
                      ? <video src={newPost.media_url} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
                      : <img src={newPost.media_url} alt="vizualas" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />}
                    <button onClick={() => setNewPost(p => ({ ...p, media_url: '' }))}
                      style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleMediaUpload(f) }}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10,
                      padding: '22px 16px', textAlign: 'center', cursor: 'pointer',
                      background: dragOver ? 'var(--primary-light)' : 'var(--bg)', transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🖼️</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{uploadingMedia ? '⏳ Įkeliama...' : 'Įkelti nuotrauką ar vaizdo įrašą'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Drag & drop arba spausk · JPG, PNG, MP4 · Max 50MB</div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = '' }} />
                {mediaError && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{mediaError}</div>}
              </div>
              {/* Client + Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Data ir laikas</label>
                  <input type="datetime-local" className="form-input" value={newPost.publish_date} onChange={e => setNewPost(p => ({ ...p, publish_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Klientas</label>
                  <select className="select-box" style={{ width: '100%' }} value={newPost.client_id || activeClient?.id || ''} onChange={e => setNewPost(p => ({ ...p, client_id: e.target.value }))}>
                    <option value="">Pasirinkti klientą</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {/* Phone preview */}
            <div className="phone-preview">
              <div className="phone-frame" style={{ background: '#1a1a1a', borderRadius: 32, padding: 3, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                <div style={{ background: '#fff', borderRadius: 30, overflow: 'hidden', minHeight: 400, padding: '20px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{activeClient?.company_name || 'Jūsų brand'}</div>
                      <div style={{ fontSize: 10, color: '#888' }}>{newPost.platform}</div>
                    </div>
                  </div>
                  {newPost.media_url ? (
                    isVideoUrl(newPost.media_url)
                      ? <video src={newPost.media_url} autoPlay muted loop style={{ width: '100%', aspectRatio: newPost.contentType === 'story' ? '9/16' : '1/1', objectFit: 'cover', borderRadius: 12, marginBottom: 10, maxHeight: 200 }} />
                      : <img src={newPost.media_url} alt="" style={{ width: '100%', aspectRatio: newPost.contentType === 'story' ? '9/16' : '1/1', objectFit: 'cover', borderRadius: 12, marginBottom: 10, maxHeight: 200 }} />
                  ) : (
                    <div style={{ background: '#f5f5f5', aspectRatio: newPost.contentType === 'story' ? '9/16' : '1/1', borderRadius: 12, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 32, maxHeight: 200 }}>🖼️</div>
                  )}
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: '#333' }}>{newPost.caption || <span style={{ color: '#ccc' }}>Čia bus jūsų tekstas...</span>}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Atšaukti</button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" disabled={!!creatingStatus} onClick={() => handleCreate('draft')}>
                {creatingStatus === 'draft' ? '⏳' : '💾'} Juodraštis
              </button>
              <button className="btn btn-outline" disabled={!!creatingStatus} onClick={() => handleCreate('review')}>
                {creatingStatus === 'review' ? '⏳' : '👁'} Vidinė peržiūra
              </button>
              <button className="btn btn-primary" disabled={!!creatingStatus} onClick={() => handleCreate('approved')}>
                {creatingStatus === 'approved' ? '⏳' : '📤'} Kliento tvirtinimui
              </button>
              <button className="btn btn-outline" disabled={!!creatingStatus} title={!newPost.publish_date ? 'Reikia datos ir laiko' : ''} onClick={() => handleCreate('scheduled')}>
                {creatingStatus === 'scheduled' ? '⏳' : '🚀'} Suplanuoti iškart
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
