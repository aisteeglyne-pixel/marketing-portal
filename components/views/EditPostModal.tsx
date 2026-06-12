'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { ContentPost } from '@/types'

interface EditPostModalProps {
  post: ContentPost
  onClose: () => void
  onSaved: (post: ContentPost) => void
}

export default function EditPostModal({ post, onClose, onSaved }: EditPostModalProps) {
  const supabase = createClient()
  const [draft, setDraft] = useState<ContentPost>({ ...post })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase.from('content_posts')
      .update({ title: draft.title, caption: draft.caption, platform: draft.platform, publish_date: draft.publish_date || null })
      .eq('id', draft.id).select().single()
    setSaving(false)
    if (data) onSaved(data)
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>✏️ Koreguoti įrašą</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div className="form-group">
            <label className="form-label">Pavadinimas</label>
            <input className="form-input" value={draft.title || ''} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tekstas</label>
            <textarea className="form-input" rows={5} value={draft.caption || ''} onChange={e => setDraft(p => ({ ...p, caption: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Platforma</label>
              <select className="select-box" style={{ width: '100%' }} value={draft.platform} onChange={e => setDraft(p => ({ ...p, platform: e.target.value }))}>
                {['Instagram','Facebook','LinkedIn','TikTok','X','YouTube'].map(pl => <option key={pl}>{pl}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data ir laikas</label>
              <input type="datetime-local" className="form-input" value={(draft.publish_date || '').slice(0, 16)} onChange={e => setDraft(p => ({ ...p, publish_date: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Atšaukti</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? '⏳' : '💾'} Išsaugoti</button>
        </div>
      </div>
    </div>
  )
}
