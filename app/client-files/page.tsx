'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { FileRecord } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  video: 'Video', photo: 'Nuotrauka', doc: 'Dokumentas', brand: 'Brandas'
}

export default function ClientFilesPage() {
  const [profile, setProfile] = useState<any>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [uploading, setUploading] = useState(false)
  const [folder, setFolder] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser(); const user = authData.user
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
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.client_id}/${Date.now()}.${ext}`
    const { data: upload, error } = await supabase.storage.from('client-files').upload(path, file)
    if (!error && upload) {
      const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
      const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'photo' : 'doc'
      const { data: rec } = await supabase.from('files').insert({ agency_id: profile.agency_id, client_id: profile.client_id, file_name: file.name, file_url: publicUrl, file_type: type, folder: folder || null, uploaded_by: profile.id, uploaded_date: new Date().toISOString() }).select().single()
      if (rec) setFiles(prev => [rec, ...prev])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!profile) return <div style={{ padding: '2rem' }}>Kraunama...</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '1.5rem' }}>Failai</h1>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Äkelti failÄ</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={folder} onChange={e => setFolder(e.target.value)} placeholder="Aplankas (neprivaloma)" style={{ padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            <input ref={fileRef} type="file" onChange={handleUpload} style={{ display: 'none' }} />
            <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Keliama...' : 'â Pasirinkti failÄ'}</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {files.length === 0 && <div className="card" style={{ textAlign: 'center', color: '#888', padding: '2rem', gridColumn: '1 / -1' }}>FailÅ³ dar nÄra</div>}
          {files.map(file => (
            <div key={file.id} className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>
                {file.file_type === 'video' ? 'ð¥' : file.file_type === 'photo' ? 'ð¼' : file.file_type === 'brand' ? 'â¦' : 'ð'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, wordBreak: 'break-word' }}>{file.file_name}</div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: '0.75rem' }}>{TYPE_LABELS[file.file_type]}{file.folder ? ` Â· ${file.folder}` : ''}</div>
              <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--brand-600)', textDecoration: 'none' }}>â AtsisiÅ³sti</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
