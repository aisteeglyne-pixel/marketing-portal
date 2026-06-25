'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PLATFORM_COLORS } from '@/lib/portal-constants'
import PostModal from '@/components/PostModal'
import CreatePostModal from '@/components/views/CreatePostModal'
import EditPostModal from '@/components/views/EditPostModal'
import DashboardView from '@/components/views/DashboardView'
import CalendarView from '@/components/views/CalendarView'
import PostsView from '@/components/views/PostsView'
import ApprovalsView from '@/components/views/ApprovalsView'
import AnalyticsView from '@/components/views/AnalyticsView'
import TeamView from '@/components/views/TeamView'
import BrandHubView from '@/components/views/BrandHubView'
import ClientWorkspaceView from '@/components/views/ClientWorkspaceView'
import AdminView from '@/components/views/AdminView'
import ProjectsView from '@/components/views/ProjectsView'
import ChatView from '@/components/views/ChatView'
import type { Client, ContentPost, Task, Project, FileRecord } from '@/types'

type View = 'dashboard' | 'calendar' | 'posts' | 'approvals' | 'analytics' | 'team' | 'brand' | 'client' | 'admin' | 'projects' | 'chat'

const VIEW_TITLES: Record<View, string> = {
  dashboard: 'Apžvalga',
  calendar: 'Turinio kalendorius',
  posts: 'Visi įrašai',
  approvals: 'Tvirtinimas',
  analytics: 'Analitika',
  team: 'Komanda',
  brand: 'Brand Hub',
  client: '',
  admin: 'Admin valdymas',
  projects: 'Projektai',
  chat: 'Komandos chatas',
}

export default function PortalPage() {
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const [toast, setToast] = useState('')
  const [chatUnread, setChatUnread] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const activeViewRef = useRef<View>('dashboard')
  useEffect(() => { activeViewRef.current = activeView }, [activeView])

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('task')) {
      setActiveView('projects')
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }
      if (p.role !== 'agency_admin') { router.push('/client-home'); return }
      setProfile(p)

      const [
        { data: clientsData },
        { data: postsData },
        { data: tasksData },
        { data: teamData },
        { data: projectsData },
        { data: filesData },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', p.agency_id).order('company_name'),
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('agency_id', p.agency_id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('agency_id', p.agency_id),
        supabase.from('projects').select('*').eq('agency_id', p.agency_id).eq('status', 'active').order('created_at'),
        supabase.from('files').select('*').eq('agency_id', p.agency_id).order('uploaded_date', { ascending: false }),
      ])
      setClients(clientsData || [])
      setPosts(postsData || [])
      setTasks(tasksData || [])
      setTeam(teamData || [])
      setProjects(projectsData || [])
      setFiles(filesData || [])
      setLoading(false)
    }
    load()
  }, [])

  // Chato neperskaitytų badge sidebar'e (gyvas, kai esi ne chate)
  useEffect(() => {
    if (!profile) return
    let cancelled = false
    async function loadUnread() {
      const { data: mems } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at')
        .eq('profile_id', profile.id)
      if (!mems || mems.length === 0) return
      let total = 0
      await Promise.all(mems.map(async m => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', m.channel_id)
          .gt('created_at', m.last_read_at || '1970-01-01')
          .neq('author_id', profile.id)
        total += count || 0
      }))
      if (!cancelled) setChatUnread(total)
    }
    loadUnread()
    const sub = supabase
      .channel('sidebar-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new as { author_id: string | null }
        if (m.author_id !== profile.id && activeViewRef.current !== 'chat') {
          setChatUnread(n => n + 1)
        }
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(sub) }
  }, [profile])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const pendingPosts = posts.filter(p => p.status === 'review')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  function updatePost(updated: ContentPost) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }
  async function setStatus(postId: string, status: ContentPost['status'], toastMsg?: string) {
    await supabase.from('content_posts').update({ status }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
    if (toastMsg) showToast(toastMsg)
  }
  const handleApprove = (postId: string) => setStatus(postId, 'approved', '✅ Įrašas patvirtintas')
  const handleNeedsChanges = (postId: string) => setStatus(postId, 'rejected', '↩ Grąžinta taisymui')
  async function handleSchedule(post: ContentPost) {
    if (!post.publish_date) { showToast('⚠️ Pirma nustatyk datą (per ✏️ koregavimą)'); return }
    await setStatus(post.id, 'scheduled', '🚀 Suplanuota: ' + post.title)
  }
  async function handleTaskDone(taskId: string) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' as const } : t))
  }
  async function handleDuplicate(post: ContentPost) {
    if (!profile) return
    const { data } = await supabase.from('content_posts').insert({
      agency_id: profile.agency_id,
      client_id: post.client_id,
      title: post.title + ' (kopija)',
      caption: post.caption,
      platform: post.platform,
      content_type: post.content_type || 'post',
      media_url: post.media_url,
      publish_date: null,
      status: 'draft',
    }).select().single()
    if (data) { setPosts(prev => [data, ...prev]); showToast('📋 Įrašas nukopijuotas') }
  }
  async function handleDelete(post: ContentPost) {
    if (!confirm(`Ištrinti įrašą „${post.title}"? Šio veiksmo atšaukti negalima.`)) return
    const { error } = await supabase.from('content_posts').delete().eq('id', post.id)
    if (error) { showToast('⚠️ Nepavyko ištrinti: ' + error.message); return }
    setPosts(prev => prev.filter(p => p.id !== post.id))
    showToast('🗑️ Įrašas ištrintas')
  }

  if (loading || !profile) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Kraunama...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const navTo = (view: View) => { setActiveView(view); setActiveClient(null) }
  const openClient = (client: Client) => { setActiveClient(client); setActiveView('client') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
      {/* ===== SIDEBAR ===== */}
      <aside id="sidebar">
        <div className="sidebar-logo">
          <img src="/darom-sviesus.svg" alt="dar.om" style={{ height: 28, width: 'auto' }} />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            {[
              { view: 'dashboard' as View, icon: '🏠', label: 'Apžvalga' },
              { view: 'calendar'  as View, icon: '📅', label: 'Kalendorius' },
              { view: 'posts'     as View, icon: '📝', label: 'Įrašai' },
            ].map(item => (
              <div key={item.view} className={`nav-item${activeView === item.view && !activeClient ? ' active' : ''}`} onClick={() => navTo(item.view)}>
                <span className="nav-icon">{item.icon}</span> {item.label}
              </div>
            ))}
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Agentūra</div>
            <div className={`nav-item${activeView === 'projects' && !activeClient ? ' active' : ''}`} onClick={() => navTo('projects')}>
              <span className="nav-icon">📋</span> Projektai
              {tasks.filter(t => t.assigned_to === profile?.id && t.status !== 'done' && t.type !== 'client_request').length > 0 &&
                <span className="nav-badge">{tasks.filter(t => t.assigned_to === profile?.id && t.status !== 'done' && t.type !== 'client_request').length}</span>}
            </div>
            <div className={`nav-item${activeView === 'chat' && !activeClient ? ' active' : ''}`} onClick={() => navTo('chat')}>
              <span className="nav-icon">💬</span> Chatas
              {chatUnread > 0 && <span className="nav-badge">{chatUnread}</span>}
            </div>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Workflow</div>
            <div className={`nav-item${activeView === 'approvals' && !activeClient ? ' active' : ''}`} onClick={() => navTo('approvals')}>
              <span className="nav-icon">✅</span> Tvirtinimas
              {pendingPosts.length > 0 && <span className="nav-badge">{pendingPosts.length}</span>}
            </div>
            <div className={`nav-item${activeView === 'analytics' && !activeClient ? ' active' : ''}`} onClick={() => navTo('analytics')}>
              <span className="nav-icon">📊</span> Analitika
            </div>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Klientai</div>
            {clients.map(client => {
              const pending = posts.filter(p => p.client_id === client.id && p.status === 'review').length
              return (
                <div key={client.id}
                  className={`client-list-item${activeClient?.id === client.id ? ' active' : ''}`}
                  onClick={() => openClient(client)}>
                  <div className="client-dot" style={{ background: PLATFORM_COLORS[client.social_channels?.[0]] || '#FF68D8' }} />
                  <span className="client-list-name">{client.company_name}</span>
                  {pending > 0 && <span className="client-pending">{pending}</span>}
                </div>
              )
            })}
            <div className="nav-item" style={{ opacity: 0.6, fontSize: 12 }} onClick={() => navTo('admin')}>
              <span className="nav-icon">➕</span> Pridėti klientą
            </div>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Setup</div>
            <div className={`nav-item${activeView === 'team' && !activeClient ? ' active' : ''}`} onClick={() => navTo('team')}>
              <span className="nav-icon">👥</span> Komanda
            </div>
            <div className={`nav-item${activeView === 'brand' && !activeClient ? ' active' : ''}`} onClick={() => navTo('brand')}>
              <span className="nav-icon">🎨</span> Brand Hub
            </div>
            <div className={`nav-item${activeView === 'admin' && !activeClient ? ' active' : ''}`} onClick={() => navTo('admin')}>
              <span className="nav-icon">⚙️</span> Admin valdymas
            </div>
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{(profile.full_name || profile.email || 'U').slice(0, 2).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{profile.full_name || profile.email}</div>
              <div className="user-role">Admin · {profile.agency?.name || 'Agentūra'}</div>
            </div>
            <span style={{ color: 'var(--text-sidebar)', fontSize: 14, cursor: 'pointer' }} onClick={() => router.push('/settings')}>⚙️</span>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div id="main">
        <div className="topbar">
          <div className="topbar-title">
            {activeClient ? activeClient.company_name : VIEW_TITLES[activeView]}
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={() => { supabase.auth.signOut(); router.push('/login') }}>Atsijungti</button>
          </div>
        </div>

        <div className="view-container" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeView === 'dashboard' && !activeClient && (
            <DashboardView
              profile={profile} clients={clients} posts={posts} tasks={tasks} clientMap={clientMap}
              onNavCalendar={() => navTo('calendar')} onNavApprovals={() => navTo('approvals')}
              onOpenClient={openClient} onSelectPost={setSelectedPost} onApprove={handleApprove}
            />
          )}
          {activeView === 'calendar' && !activeClient && (
            <CalendarView posts={posts} clientMap={clientMap} onNewPost={() => setShowCreateModal(true)} onSelectPost={setSelectedPost} />
          )}
          {activeView === 'posts' && !activeClient && (
            <PostsView
              posts={posts} clients={clients} clientMap={clientMap}
              onNewPost={() => setShowCreateModal(true)} onSelectPost={setSelectedPost}
              onEdit={setEditingPost} onDuplicate={handleDuplicate} onDelete={handleDelete}
            />
          )}
          {activeView === 'approvals' && !activeClient && (
            <ApprovalsView
              posts={posts} clientMap={clientMap} onSelectPost={setSelectedPost}
              onApprove={handleApprove} onNeedsChanges={handleNeedsChanges}
              onSchedule={handleSchedule} onDuplicate={handleDuplicate} showToast={showToast}
            />
          )}
          {activeView === 'analytics' && !activeClient && (
            <AnalyticsView profile={profile} posts={posts} clients={clients} onOpenClient={openClient} />
          )}
          {activeView === 'team' && !activeClient && (
            <TeamView team={team} clients={clients} tasks={tasks} showToast={showToast} />
          )}
          {activeView === 'brand' && !activeClient && (
            <BrandHubView showToast={showToast} />
          )}
          {activeView === 'projects' && !activeClient && (
            <ProjectsView
              profile={profile} clients={clients} team={team} projects={projects} tasks={tasks} files={files}
              onProjectCreated={p => setProjects(prev => [...prev, p])}
              onProjectUpdated={p => setProjects(prev => prev.map(x => x.id === p.id ? p : x))}
              onTaskCreated={t => setTasks(prev => [t, ...prev])}
              onTaskUpdated={t => setTasks(prev => prev.map(x => x.id === t.id ? t : x))}
              onTaskDeleted={id => setTasks(prev => prev.filter(x => x.id !== id))}
              showToast={showToast}
            />
          )}
          {activeView === 'chat' && !activeClient && (
            <ChatView
              profile={profile} clients={clients} team={team}
              onUnreadChange={setChatUnread}
            />
          )}
          {activeView === 'admin' && !activeClient && (
            <AdminView
              profile={profile} clients={clients} team={team} posts={posts}
              onOpenClient={openClient}
              onClientCreated={c => setClients(prev => [...prev, c].sort((a, b) => a.company_name.localeCompare(b.company_name)))}
              onClientUpdated={c => setClients(prev => prev.map(x => x.id === c.id ? c : x))}
              onClientDeleted={id => setClients(prev => prev.filter(x => x.id !== id))}
              onTeamUpdated={m => setTeam(prev => prev.map(x => x.id === m.id ? m : x))}
              showToast={showToast}
            />
          )}
          {activeView === 'client' && activeClient && (
            <ClientWorkspaceView
              client={activeClient} posts={posts} tasks={tasks} team={team}
              onNewPost={() => setShowCreateModal(true)} onSelectPost={setSelectedPost}
              onApprove={handleApprove} onNeedsChanges={handleNeedsChanges}
              onTaskDone={handleTaskDone} showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* ===== MODALAI ===== */}
      {showCreateModal && (
        <CreatePostModal
          agencyId={profile.agency_id}
          clients={clients}
          activeClient={activeClient}
          onClose={() => setShowCreateModal(false)}
          onCreated={post => { setPosts(prev => [post, ...prev]); setShowCreateModal(false); showToast('✓ Įrašas sukurtas') }}
        />
      )}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={post => { updatePost(post); setEditingPost(null); showToast('💾 Išsaugota') }}
        />
      )}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          clientId={selectedPost.client_id}
          role="agency_admin"
          onClose={() => setSelectedPost(null)}
          onUpdate={updated => { updatePost(updated); setSelectedPost(updated) }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1E181C', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
