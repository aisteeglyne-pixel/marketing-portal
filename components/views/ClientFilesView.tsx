'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { FileRecord } from '@/types'

interface Props {
  profile: any
  files: FileRecord[]
  preview?: boolean
  onFilesChange: (files: FileRecord[]) => void
  showToast: (msg: string) => void
}

const FILE_ICONS: Record<string, string> = { video: '🎬', photo: '🖼️', doc: '📄', brand: '🎨' }
const TYPE_LABELS: Record<string, string> = { video: 'Video', photo: 'Nuotrauka', doc: 'Dokumentas', brand: 'Brandas' }

export default function ClientFilesView({ profile, files, preview = false, onFilesChange, showToast }: Props) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [folder, setFolder] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const existingFolders = files.map(f => f.folder).filter((f): f is string => !!f).filter((f, i, a) => a.indexOf(f) === i)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length || !profile) return
    setUploading(true)
    const folderName = folder.trim()
    const newRecs: FileRecord[] = []
    for (const file of selected) {
      const ext = file.name.split('.').pop()
      const rnd = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const path = folderName ? `${profile.client_id}/${folderName}/${rnd}` : `${profile.client_id}/${rnd}`
      const { data: upload, error } = await supabase.storage.from('client-files').upload(path, file)
      if (!error && upload) {
        const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
        const type: FileRecord['file_type'] = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'photo' : 'doc'
        const { data: rec } = await supabase.from('files').insert({
          agency_id: profile.agency_id, client_id: profile.client_id,
          file_name: file.name, file_url: publicUrl, file_type: type,
          folder: folderName || null, uploaded_by: profile.id, uploaded_date: new Date().toISOString(),
        }).select().single()
        if (rec) newRecs.push(rec)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (newRecs.length) { onFilesChange([...newRecs, ...files]); showToast(`✅ Įkelta: ${newRecs.length}`) }
    else showToast('⚠️ Nepavyko įkelti')
  }

  const grouped: Record<string, FileRecord[]> = {}
  files.forEach(f => { const k = f.folder || '—'; (grouped[k] = grouped[k] || []).push(f) })
  const folders = Object.keys(grouped).sort((a, b) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b))

  return (
    <div className="view active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div className="text-muted" style={{ fontSize: 13 }}>Bendri failai su agentūra</div>
        {!preview && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="select-box" value={folder} onChange={e => setFolder(e.target.value)} style={{ fontSize: 13 }}>
              <option value="">Be aplanko</option>
              {existingFolders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <button className="btn btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? '⏳ Keliama...' : '⬆️ Įkelti failus'}</button>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />

      {files.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Failų dar nėra.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {folders.map(fname => (
            <div key={fname}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{fname === '—' ? '📁' : '📂'}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{fname === '—' ? 'Be aplanko' : fname}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>({grouped[fname].length})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                {grouped[fname].map(file => (
                  <div key={file.id} className="card" style={{ padding: 14 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{FILE_ICONS[file.file_type] || '📎'}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, wordBreak: 'break-word', lineHeight: 1.3 }}>{file.file_name}</div>
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 8 }}>{TYPE_LABELS[file.file_type] || file.file_type}</div>
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>⬇ Atsisiųsti</a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
