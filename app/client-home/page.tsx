'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PostModal from '@/components/PostModal'
import ClientOverviewView from '@/components/views/ClientOverviewView'
import ClientContentView from '@/components/views/ClientContentView'
import ClientTasksView from '@/components/views/ClientTasksView'
import ClientFilesView from '@/components/views/ClientFilesView'
import ClientGoalsView from '@/components/views/ClientGoalsView'
import ClientReportsView from '@/components/views/ClientReportsView'
import type { Client, ContentPost, Task, Goal, FileRecord } from '@/types'

type View = 'overview' | 'content' | 'tasks' | 'files' | 'goals' | 'reports'

const NAV: { view: View; icon: string; label: string }[] = [
  { view: 'overview', icon: '🏠', label: 'Apžvalga' },
  { view: 'content', icon: '📝', label: 'Turinys' },
  { view: 'tasks', icon: '✅', label: 'Užduotys' },
  { view: 'files', icon: '📁', label: 'Failai' },
  { view: 'goals', icon: '🎯', label: 'Tikslai' },
  { view: 'reports', icon: '📊', label: 'Ataskaitos' },
]
const VIEW_TITLES: Record<View, string> = {
  overview: 'Apžvalga', content: 'Turinys', tasks: 'Užduotys', files: 'Failai', goals: 'Tikslai', reports: 'Ataskaitos',
}

export default function ClientHomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [activeView, setActiveView] = useState<View>('overview')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const [toast, setToast] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }

      // Admino peržiūros režimas: /client-home?preview=<clientId>
      const previewId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('preview')
        : null
      const isPreview = p.role === 'agency_admin' && !!previewId
      if (p.role === 'agency_admin' && !isPreview) { router.push('/dashboard'); return }
      setPreview(isPreview)

      // Peržiūroje vaizdai dirba su pasirinkto kliento client_id (admino sesija mato visus agentūros klientus per RLS)
      const cid = isPreview ? previewId! : p.client_id
      setProfile(isPreview ? { ...p, client_id: cid } : p)
      const [
        { data: clientData },
        { data: postsData },
        { data: tasksData },
        { data: filesData },
        { data: goalsData },
        { data: metricsData },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('id', cid).single(),
        supabase.from('content_posts').select('*').eq('client_id', cid).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('client_id', cid).order('created_at', { ascending: false }),
        supabase.from('files').select('*').eq('client_id', cid).order('uploaded_date', { ascending: false }),
        supabase.from('goals').select('*').eq('client_id', cid).order('deadline', { ascending: true }),
        supabase.from('metrics_snapshots').select('*').eq('client_id', cid).order('metric_date'),
      ])
      setClient(clientData || null)
      setPosts(postsData || [])
      setTasks(tasksData || [])
      setFiles(filesData || [])
      setGoals(goalsData || [])
      setMetrics((metricsData || []).map((s: any) => ({ ...s, value: Number(s.value) })))
      setLoading(false)
    }
    load()
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2600) }
  function updatePost(updated: ContentPost) { setPosts(prev => prev.map(p => p.id === updated.id ? updated : p)) }

  const accent = profile?.agency?.primary_color || '#FF68D8'
  const pending = posts.filter(p => p.status === 'review').length

  if (loading || !profile) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Kraunama...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const agencyName = profile.agency?.name || 'Portalas'
  const agencyLogo = profile.agency?.logo_url

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', ['--primary' as any]: accent }}>
      {/* ===== SIDEBAR ===== */}
      <aside id="sidebar">
        <div className="sidebar-logo">
          {agencyLogo ? (
            <img src={agencyLogo} alt={agencyName} style={{ height: 30, maxWidth: 150, objectFit: 'contain' }} />
          ) : (
            <img src="/darom-sviesus.svg" alt="dar.om" style={{ height: 28, width: 'auto' }} />
          )}
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            {NAV.map(item => (
              <div key={item.view} className={`nav-item${activeView === item.view ? ' active' : ''}`} onClick={() => setActiveView(item.view)}>
                <span className="nav-icon">{item.icon}</span> {item.label}
                {item.view === 'content' && pending > 0 && <span className="nav-badge">{pending}</span>}
              </div>
            ))}
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{(client?.company_name || profile.full_name || profile.email || 'K').slice(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{client?.company_name || profile.full_name || profile.email}</div>
              <div className="user-role">Klientas · {agencyName}</div>
            </div>
            <span style={{ color: 'var(--text-sidebar)', fontSize: 14, cursor: 'pointer' }} title={preview ? 'Grįžti į admin' : 'Atsijungti'}
              onClick={() => { if (preview) { router.push('/dashboard') } else { supabase.auth.signOut(); router.push('/login') } }}>↩</span>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div id="main">
        <div className="topbar">
          <div className="topbar-title">{VIEW_TITLES[activeView]}</div>
          <div className="topbar-actions">
            {preview ? (
              <button className="btn btn-ghost" onClick={() => router.push('/dashboard')}>← Grįžti į admin</button>
            ) : (
              <button className="btn btn-ghost" onClick={() => { supabase.auth.signOut(); router.push('/login') }}>Atsijungti</button>
            )}
          </div>
        </div>

        {preview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            <span>👁️ Peržiūros režimas — matai tiksliai, ką mato klientas <strong>{client?.company_name || ''}</strong>. Rašymas išjungtas.</span>
            <button className="btn btn-sm" style={{ marginLeft: 'auto', background: '#fff', color: 'var(--primary)', fontWeight: 700 }} onClick={() => router.push('/dashboard')}>Uždaryti peržiūrą</button>
          </div>
        )}

        <div className="view-container" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeView === 'overview' && (
            <ClientOverviewView profile={profile} client={client} posts={posts} tasks={tasks} goals={goals}
              onNav={v => setActiveView(v)} onSelectPost={setSelectedPost} />
          )}
          {activeView === 'content' && (
            <ClientContentView clientId={profile.client_id} agencyId={profile.agency_id} posts={posts} preview={preview} onPostsChange={setPosts} />
          )}
          {activeView === 'tasks' && (
            <ClientTasksView profile={profile} tasks={tasks} preview={preview} onTaskCreated={t => setTasks(prev => [t, ...prev])} showToast={showToast} />
          )}
          {activeView === 'files' && (
            <ClientFilesView profile={profile} files={files} preview={preview} onFilesChange={setFiles} showToast={showToast} />
          )}
          {activeView === 'goals' && <ClientGoalsView goals={goals} />}
          {activeView === 'reports' && <ClientReportsView posts={posts} metrics={metrics} />}
        </div>
      </div>

      {/* PostModal iš Apžvalgos */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          clientId={selectedPost.client_id}
          role="client"
          preview={preview}
          onClose={() => setSelectedPost(null)}
          onUpdate={updated => { updatePost(updated); setSelectedPost(updated) }}
        />
      )}

      {toast && (
        <div className="toast" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1E181C', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
