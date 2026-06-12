'use client'

import { useEffect, useState } from 'react'
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
import type { Client, ContentPost, Task } from '@/types'

type View = 'dashboard' | 'calendar' | 'posts' | 'approvals' | 'analytics' | 'team' | 'brand' | 'client'

const VIEW_TITLES: Record<View, string> = {
  dashboard: 'Dashboard',
  calendar: 'Turinio kalendorius',
  posts: 'Visi įrašai',
  approvals: 'Tvirtinimas',
  analytics: 'Analitika',
  team: 'Komanda',
  brand: 'Brand Hub',
  client: '',
}

export default function PortalPage() {
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const router = useRouter()
  const supabase = createClient()

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
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', p.agency_id).order('company_name'),
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('agency_id', p.agency_id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('agency_id', p.agency_id),
      ])
      setClients(clientsData || [])
      setPosts(postsData || [])
      setTasks(tasksData || [])
      setTeam(teamData || [])
      setLoading(false)
    }
    load()
  }, [])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const pendingPosts = posts.filter(p => p.status === 'review')

  function updatePost(updated: ContentPost) {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }
  async function handleApprove(postId: string) {
    await supabase.from('content_posts').update({ status: 'approved' }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' as const } : p))
  }
  async function handleReject(postId: string) {
    await supabase.from('content_posts').update({ status: 'rejected' }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'rejected' as const } : p))
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
      publish_date: null,
      status: 'draft',
    }).select().single()
    if (data) setPosts(prev => [data, ...prev])
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
          <div className="logo-mark">D</div>
          <div className="logo-text">DAR <span>CONTENT</span></div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            {[
              { view: 'dashboard' as View, icon: '🏠', label: 'Dashboard' },
              { view: 'calendar'  as View, icon: '📅', label: 'Kalendorius' },
              { view: 'posts'     as View, icon: '📝', label: 'Įrašai' },
            ].map(item => (
              <div key={item.view} className={`nav-item${activeView === item.view && !activeClient ? ' active' : ''}`} onClick={() => navTo(item.view)}>
                <span className="nav-icon">{item.icon}</span> {item.label}
              </div>
            ))}
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
                  <div className="client-dot" style={{ background: PLATFORM_COLORS[client.social_channels?.[0]] || '#6c63ff' }} />
                  <span className="client-list-name">{client.company_name}</span>
                  {pending > 0 && <span className="client-pending">{pending}</span>}
                </div>
              )
            })}
            <div className="nav-item" style={{ opacity: 0.6, fontSize: 12 }} onClick={() => navTo('dashboard')}>
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
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">
            {activeClient ? activeClient.company_name : VIEW_TITLES[activeView]}
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Naujas įrašas</button>
            <button className="btn btn-ghost" onClick={() => { supabase.auth.signOut(); router.push('/login') }}>Atsijungti</button>
          </div>
        </div>

        {/* View container */}
        <div className="view-container" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeView === 'dashboard' && !activeClient && (
            <DashboardView
              profile={profile} clients={clients} posts={posts} tasks={tasks} clientMap={clientMap}
              onNavCalendar={() => navTo('calendar')} onNavApprovals={() => navTo('approvals')} onOpenClient={openClient}
            />
          )}
          {activeView === 'calendar' && !activeClient && (
            <CalendarView posts={posts} onNewPost={() => setShowCreateModal(true)} onSelectPost={setSelectedPost} />
          )}
          {activeView === 'posts' && !activeClient && (
            <PostsView
              posts={posts} clients={clients} clientMap={clientMap} activeClient={activeClient}
              onNewPost={() => setShowCreateModal(true)} onSelectPost={setSelectedPost}
              onApprove={handleApprove} onReject={handleReject} onEdit={setEditingPost} onDuplicate={handleDuplicate}
            />
          )}
          {activeView === 'approvals' && !activeClient && (
            <ApprovalsView posts={posts} clientMap={clientMap} onSelectPost={setSelectedPost} onApprove={handleApprove} onReject={handleReject} />
          )}
          {activeView === 'analytics' && !activeClient && (
            <AnalyticsView posts={posts} clients={clients} onOpenClient={openClient} />
          )}
          {activeView === 'team' && !activeClient && (
            <TeamView team={team} clientCount={clients.length} />
          )}
          {activeView === 'brand' && !activeClient && (
            <BrandHubView />
          )}
          {activeView === 'client' && activeClient && (
            <ClientWorkspaceView
              client={activeClient} posts={posts} tasks={tasks}
              onNewPost={() => setShowCreateModal(true)} onSelectPost={setSelectedPost}
              onApprove={handleApprove} onReject={handleReject} onTaskDone={handleTaskDone}
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
          onCreated={post => { setPosts(prev => [post, ...prev]); setShowCreateModal(false) }}
        />
      )}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={post => { updatePost(post); setEditingPost(null) }}
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
    </div>
  )
}
