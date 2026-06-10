'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { FileRecord } from '@/types'
import { lt } from '@/lib/i18n/lt'

const FILE_ICONS: Record<string, string> = {
  video: '🎬', photo: '🖼️', doc: '📄', brand: '🎨',
}

function FileGrid({ files }: { files: FileRecord[] }) {
  const grouped: Record<string, FileRecord[]> = {}
  files.forEach(f => {
    const key = f.folder || '—'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(f)
  })
  const folders = Object.keys(grouped).sort((a, b) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {folders.map(folderName => (
        <div key={folderName}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
            <span style={{ fontSize: 16 }}>{folderName === '—' ? '📁' : '📂'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>
              {folderName === '—' ? 'Be aplanko' : folderName}
            </span>
            <span style={{ fontSize: 12, color: '#aaa' }}>({grouped[folderName].length})</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {grouped[folderName].map(file => (
              <div key={file.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>{FILE_ICONS[file.file_type] || '📎'}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, wordBreak: 'break-word' }}>{file.file_name}</div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: '0.75rem' }}>
                  {lt.clientFiles.types[file.file_type as keyof typeof lt.clientFiles.types] || file.file_type}
                </div>
                <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--brand-600)', textDecoration: 'none' }}>
                  {lt.clientFiles.download}
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ClientFilesPage() {
  const [profile, setProfile] = useState<any>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [folder, setFolder] = useState('')
  const [fileMode, setFileMode] = useState<null | 'choose' | 'new_folder' | 'upload'>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)
      const { data } = await supabase.from('files').select('*')
        .eq('client_id', p.client_id).order('uploaded_date', { ascending: false })
      setFiles(data || [])
    }
    load()
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length || !profile) return
    setUploading(true)
    setUploadCount(selectedFiles.length)
    const folderName = folder.trim()
    const newRecs: FileRecord[] = []
    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop()
      const path = folderName
        ? `${profile.client_id}/${folderName}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        : `${profile.client_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { data: upload, error } = await supabase.storage.from('client-files').upload(path, file)
      if (!error && upload) {
        const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
        const type: FileRecord['file_type'] = file.type.startsWith('video') ? 'video'
          : file.type.startsWith('image') ? 'photo' : 'doc'
        const { data: rec } = await supabase.from('files').insert({
          agency_id: profile.agency_id,
          client_id: profile.client_id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: type,
          folder: folderName || null,
          uploaded_by: profile.id,
          uploaded_date: new Date().toISOString(),
        }).select().single()
        if (rec) newRecs.push(rec)
      }
    }
    if (newRecs.length) setFiles(prev => [...newRecs, ...prev])
    setUploading(false)
    setUploadCount(0)
    setFileMode(null)
    setFolder('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const existingFolders = files.map(f => f.folder).filter((f): f is string => !!f).filter((f, i, arr) => arr.indexOf(f) === i)

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>{lt.clientFiles.title}</h1>
          <div style={{ position: 'relative' }}>
            <button className="btn-primary" onClick={() => setFileMode(m => m ? null : 'choose')}>
              + Sukurti naują
            </button>
            {fileMode === 'choose' && (
              <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 180, overflow: 'hidden' }}>
                <button onClick={() => setFileMode('new_folder')} style={dropdownItem}>📁 Naujas aplankas</button>
                <button onClick={() => { setFileMode('upload'); setTimeout(() => fileRef.current?.click(), 50) }} style={dropdownItem}>⬆️ Įkelti failus</button>
              </div>
            )}
          </div>
        </div>

        <input ref={fileRef} type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />

        {fileMode === 'new_folder' && (
          <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Aplanko pavadinimas"
              autoFocus
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }}
            />
            <button className="btn-primary"
              onClick={() => { setFolder(newFolderName); setNewFolderName(''); setFileMode('upload'); setTimeout(() => fileRef.current?.click(), 50) }}>
              Sukurti ir įkelti failus
            </button>
            <button className="btn-secondary" onClick={() => setFileMode(null)}>Atšaukti</button>
          </div>
        )}

        {fileMode === 'upload' && !uploading && (
          <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={folder}
              onChange={e => setFolder(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }}>
              <option value="">Be aplanko</option>
              {existingFolders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <button className="btn-primary" onClick={() => fileRef.current?.click()}>Pasirinkti failus</button>
            <button className="btn-secondary" onClick={() => { setFileMode(null); setFolder('') }}>Atšaukti</button>
          </div>
        )}

        {uploading && (
          <div style={{ marginBottom: '1rem', fontSize: 13, color: '#888' }}>
            ⏳ Keliama{uploadCount > 1 ? ` (${uploadCount} failai)` : ''}...
          </div>
        )}

        {files.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
            {lt.clientFiles.noFiles}
          </div>
        ) : (
          <FileGrid files={files} />
        )}
      </div>
    </div>
  )
}

const dropdownItem: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '10px 16px', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: 14, color: '#333',
  borderBottom: '1px solid #f5f5f5',
}
