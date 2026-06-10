'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import ContentCalendar from '@/components/ContentCalendar'
import { lt } from '@/lib/i18n/lt'
import type { Client, Goal, Task, ContentPost, FileRecord } from '@/types'

const SECTION_IDS = ['tikslai', 'uzduotys', 'turinys', 'ataskaitos', 'failai'] as const

const priorityColors: Record<string, { bg: string; color: string }> = {
  low:    { bg: '#F0F0F0', color: '#666' },
  medium: { bg: '#FEF3C7', color: '#92400E' },
  high:   { bg: '#FCEBEB', color: '#791F1F' },
}

const taskStatusColors: Record<string, { bg: string; color: string }> = {
  backlog:     { bg: '#F0F0F0', color: '#666' },
  in_progress: { bg: '#EEF2FF', color: '#4338CA' },
  review:      { bg: '#FEF3C7', color: '#92400E' },
  done:        { bg: '#EAF3DE', color: '#27500A' },
}

const contentStatusColors: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#F0F0F0', color: '#666' },
  review:    { bg: '#FEF3C7', color: '#92400E' },
  approved:  { bg: '#EAF3DE', color: '#27500A' },
  rejected:  { bg: '#FCEBEB', color: '#791F1F' },
  published: { bg: '#EEF2FF', color: '#4338CA' },
}

const fileTypeIcons: Record<string, string> = {
  video: '🎬',
  photo: '🖼️',
  doc:   '📄',
  brand: '🎨',
}

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 12, fontWeight: 500,
      background: style.bg, color: style.color,
    }}>
      {label}
    </span>
  )
}

function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} style={{
      fontSize: 17, fontWeight: 600, color: '#111',
      marginBottom: '1rem', paddingTop: '2rem',
      borderTop: '1px solid #f0f0f0',
    }}>
      {title}
    </h2>
  )
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const clientId = params.id as string

  const [profile, setProfile] = useState<any>(null)
  const [clientData, setClientData] = useState<Client | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadFolder, setUploadFolder] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', due_date: '' })

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase
        .from('profiles')
        .select('*, agency:agencies(*)')
        .eq('id', user.id)
        .single()

      if (!p || p.role !== 'agency_admin') { router.push('/client-home'); return }
      setProfile(p)

      const [
        { data: client },
        { data: goalsData },
        { data: tasksData },
        { data: postsData },
        { data: filesData },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('goals').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('content_posts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('files').select('*').eq('client_id', clientId).order('uploaded_date', { ascending: false }),
      ])

      if (!client) { router.push('/dashboard'); return }
      setClientData(client)
      setGoals(goalsData || [])
      setTasks(tasksData || [])
      setPosts(postsData || [])
      setFiles(filesData || [])
      setLoading(false)
    }
    load()
  }, [clientId])

  async function handleTaskCreate(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.from('tasks').insert({
      agency_id: profile.agency_id,
      client_id: clientId,
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      status: 'backlog',
      type: 'agency_task',
      created_by: profile.id,
    }).select().single()
    if (data) setTasks(prev => [data, ...prev])
    setNewTask({ title: '', description: '', priority: 'medium', due_date: '' })
    setShowTaskForm(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${clientId}/${Date.now()}.${ext}`
    const { data: upload, error } = await supabase.storage.from('client-files').upload(path, file)
    if (!error && upload) {
      const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
      const type: FileRecord['file_type'] = file.type.startsWith('video') ? 'video'
        : file.type.startsWith('image') ? 'photo' : 'doc'
      const { data: rec } = await supabase.from('files').insert({
        agency_id: profile.agency_id,
        client_id: clientId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: type,
        folder: uploadFolder || null,
        uploaded_by: profile.id,
        uploaded_date: new Date().toISOString(),
      }).select().single()
      if (rec) setFiles(prev => [rec, ...prev])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading || !profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  // Ataskaitos stats
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const statsPublished = posts.filter(p => p.status === 'published').length
  const statsPending = posts.filter(p => p.status === 'review').length
  const statsDrafts = posts.filter(p => p.status === 'draft').length
  const statsThisMonth = posts.filter(p => p.status === 'published' && p.published_at && p.published_at >= thisMonthStart).length

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />

      <div className="main-content" style={{ marginLeft: 240 }}>

        {/* Kliento antraštė */}
        <div style={{ marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>{clientData?.company_name}</h1>
          {clientData?.social_channels && clientData.social_channels.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {clientData.social_channels.map(ch => (
                <span key={ch} style={{ fontSize: 12, color: '#888', background: '#f5f5f5', padding: '2px 8px', borderRadius: 10 }}>
                  {ch}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sekcijų navigacija */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {([
            ['tikslai',    lt.clientDetail.sections.goals],
            ['uzduotys',   lt.clientDetail.sections.tasks],
            ['turinys',    lt.clientDetail.sections.content],
            ['ataskaitos', lt.clientDetail.sections.reports],
            ['failai',     lt.clientDetail.sections.files],
          ] as const).map(([id, label]) => (
            <a key={id} href={`#${id}`}
              style={{
                fontSize: 13, padding: '5px 12px', borderRadius: 20,
                background: '#f5f5f5', color: '#555', textDecoration: 'none',
                border: '1px solid #ebebeb', cursor: 'pointer',
              }}>
              {label}
            </a>
          ))}
        </div>

        {/* ── TIKSLAI ── */}
        <SectionHeader id="tikslai" title={lt.clientDetail.sections.goals} />
        {goals.length === 0 ? (
          <div className="card" style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>
            {lt.clientDetail.goals.noGoals}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {goals.map(goal => {
              const pct = goal.target_value > 0
                ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                : 0
              const achieved = goal.current_value >= goal.target_value
              return (
                <div key={goal.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{goal.title}</span>
                    {achieved && <Badge label={lt.clientDetail.goals.achieved} style={{ bg: '#EAF3DE', color: '#27500A' }} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 4,
                        background: achieved ? '#4CAF50' : 'var(--brand-600)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                  </div>
                  {goal.deadline && (
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      {lt.clientDetail.goals.deadline} {new Date(goal.deadline).toLocaleDateString('lt-LT')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── UŽDUOTYS ── */}
        <div id="uzduotys" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', borderTop: '1px solid #f0f0f0', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{lt.clientDetail.sections.tasks}</h2>
          <button className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setShowTaskForm(v => !v)}>
            + {lt.clientDetail.tasks.statuses.backlog === 'Eilėje' ? 'Nauja užduotis' : 'New task'}
          </button>
        </div>
        {showTaskForm && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <form onSubmit={handleTaskCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                placeholder="Užduoties pavadinimas"
                required
                style={{ padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }}
              />
              <textarea
                value={newTask.description}
                onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Aprašymas (neprivaloma)"
                rows={2}
                style={{ padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <select
                  value={newTask.priority}
                  onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
                  style={{ padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14 }}>
                  <option value="low">{lt.clientDetail.tasks.priorities.low}</option>
                  <option value="medium">{lt.clientDetail.tasks.priorities.medium}</option>
                  <option value="high">{lt.clientDetail.tasks.priorities.high}</option>
                </select>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))}
                  style={{ padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary">{lt.common.save}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowTaskForm(false)}>{lt.common.cancel}</button>
              </div>
            </form>
          </div>
        )}
        {tasks.length === 0 ? (
          <div className="card" style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>
            {lt.clientDetail.tasks.noTasks}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tasks.map(task => (
              <div key={task.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge
                      label={lt.clientDetail.tasks.statuses[task.status]}
                      style={taskStatusColors[task.status] || { bg: '#f0f0f0', color: '#666' }}
                    />
                    <Badge
                      label={lt.clientDetail.tasks.priorities[task.priority]}
                      style={priorityColors[task.priority] || { bg: '#f0f0f0', color: '#666' }}
                    />
                  </div>
                </div>
                {task.due_date && (
                  <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>
                    {lt.clientDetail.tasks.due} {new Date(task.due_date).toLocaleDateString('lt-LT')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── TURINYS ── */}
        <SectionHeader id="turinys" title={lt.clientDetail.sections.content} />
        <div className="card" style={{ padding: '1.25rem' }}>
          <ContentCalendar
            posts={posts}
            clientId={clientId}
            agencyId={profile.agency_id}
            role="agency_admin"
            onPostsChange={setPosts}
          />
        </div>

        {/* ── ATASKAITOS ── */}
        <SectionHeader id="ataskaitos" title={lt.clientDetail.sections.reports} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: lt.clientDetail.reports.published, value: statsPublished, color: '#4338CA' },
            { label: lt.clientDetail.reports.pendingApproval, value: statsPending, color: '#92400E' },
            { label: lt.clientDetail.reports.drafts, value: statsDrafts, color: '#666' },
            { label: lt.clientDetail.reports.thisMonth, value: statsThisMonth, color: '#27500A' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FAILAI ── */}
        <h2 id="failai" style={{ fontSize: 17, fontWeight: 600, marginBottom: '1rem', paddingTop: '2rem', borderTop: '1px solid #f0f0f0' }}>
          {lt.clientDetail.sections.files}
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            value={uploadFolder}
            onChange={e => setUploadFolder(e.target.value)}
            placeholder={lt.clientFiles.folderPlaceholder}
            style={{ padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
          <input ref={fileRef} type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? lt.clientFiles.uploading : lt.clientFiles.selectFile}
          </button>
        </div>
        {files.length === 0 ? (
          <div className="card" style={{ color: '#aaa', textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
            {lt.clientDetail.files.noFiles}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            {files.map(file => (
              <div key={file.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 20 }}>{fileTypeIcons[file.file_type] || '📎'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.file_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      {lt.clientDetail.files.types[file.file_type] || file.file_type}
                      {file.uploaded_date && ` · ${lt.clientDetail.files.uploaded} ${new Date(file.uploaded_date).toLocaleDateString('lt-LT')}`}
                    </div>
                  </div>
                </div>
                <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '5px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {lt.clientDetail.files.download}
                </a>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
