'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PostModal from '@/components/PostModal'
import type { Client, ContentPost, Task } from '@/types'

type View = 'dashboard' | 'calendar' | 'posts' | 'approvals' | 'analytics' | 'team' | 'brand' | 'client'

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C', Facebook: '#1877F2', LinkedIn: '#0A66C2',
  TikTok: '#010101', X: '#1DA1F2', YouTube: '#FF0000',
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Juodraštis',  bg: '#F3F4F6', color: '#6B7280' },
  review:    { label: 'Peržiūra',    bg: '#FEF3C7', color: '#92400E' },
  approved:  { label: 'Patvirtinta', bg: '#D1FAE5', color: '#065F46' },
  rejected:  { label: 'Atmesta',     bg: '#FEE2E2', color: '#991B1B' },
  published: { label: 'Paskelbta',   bg: '#EEF2FF', color: '#3730A3' },
  scheduled: { label: 'Suplanuota',  bg: '#E0F2FE', color: '#075985' },
}

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200, Facebook: 63206, LinkedIn: 3000, TikTok: 2200, X: 280, YouTube: 5000,
}

const DAYS_LT = ['Pir', 'Ant', 'Tre', 'Ket', 'Pen', 'Šeš', 'Sek']
const MONTHS_LT = ['Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis','Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis']

export default function PortalPage() {
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [calDate, setCalDate] = useState(new Date())
  const [postFilter, setPostFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [approvalTab, setApprovalTab] = useState<'internal' | 'client' | 'done'>('internal')
  const [analyticsPeriod, setAnalyticsPeriod] = useState('thisMonth')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', caption: '', platform: 'Instagram', publish_date: '', contentType: 'post', client_id: '', media_url: '' })
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const [creatingStatus, setCreatingStatus] = useState<string | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // AI caption modalas
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiCategory, setAiCategory] = useState<'promo' | 'edu' | 'inspo' | 'community'>('promo')
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
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

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const publishedThisMonth = posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= thisMonthStart)
  const pendingPosts = posts.filter(p => p.status === 'review')
  const scheduledPosts = posts.filter(p => ['approved','scheduled'].includes(p.status) && p.publish_date && new Date(p.publish_date) >= thisMonthStart)

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
  async function handleCreatePost(status: 'draft' | 'review' | 'approved' | 'scheduled') {
    if (!profile || !newPost.title || creatingStatus) return
    if (status === 'scheduled' && !newPost.publish_date) {
      setMediaError('Planavimui būtina data ir laikas')
      return
    }
    setCreatingStatus(status)
    const { data, error } = await supabase.from('content_posts').insert({
      agency_id: profile.agency_id,
      client_id: newPost.client_id || activeClient?.id || null,
      title: newPost.title,
      caption: newPost.caption,
      platform: newPost.platform,
      publish_date: newPost.publish_date || null,
      media_url: newPost.media_url || null,
      status,
    }).select().single()
    setCreatingStatus(null)
    if (error) { setMediaError('Nepavyko išsaugoti: ' + error.message); return }
    if (data) {
      setPosts(prev => [data, ...prev])
      setShowCreateModal(false)
      setMediaError('')
      setNewPost({ title: '', caption: '', platform: 'Instagram', publish_date: '', contentType: 'post', client_id: '', media_url: '' })
    }
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

  // Demo AI generatorius — šablonai pagal kategoriją; vėliau pakeisim tikru AI API
  function generateAiCaptions() {
    const topic = aiTopic.trim() || 'mūsų naujienos'
    const tpl: Record<string, string[]> = {
      promo: [
        `🎯 ${topic} — jau čia! Nepraleisk progos sužinoti daugiau. Nuoroda bio. 👆`,
        `Naujiena! ✨ ${topic[0].toUpperCase() + topic.slice(1)}. Riboto laiko pasiūlymas — sek mus, kad nepraleistum.`,
        `${topic[0].toUpperCase() + topic.slice(1)} 🔥 Kodėl visi apie tai kalba? Sužinok pirmas — spausk nuorodą.`,
      ],
      edu: [
        `💡 Ar žinojai? ${topic[0].toUpperCase() + topic.slice(1)} — štai ką svarbu suprasti. Išsaugok šį įrašą ateičiai! 📌`,
        `3 dalykai, kuriuos verta žinoti apie: ${topic}. Skaityk toliau ir pasidalink su tuo, kam aktualu. 👇`,
        `Trumpai ir aiškiai: ${topic}. Jei buvo naudinga — palik ❤️ ir sek daugiau tokio turinio.`,
      ],
      inspo: [
        `✨ ${topic[0].toUpperCase() + topic.slice(1)} primena: didžiausi pokyčiai prasideda nuo mažų žingsnių. Koks tavo šiandienos žingsnis?`,
        `Pirmadienio mintis 💭 ${topic[0].toUpperCase() + topic.slice(1)}. Pažymėk žmogų, kuriam to reikia šiandien.`,
        `Kartais užtenka vieno sprendimo. ${topic[0].toUpperCase() + topic.slice(1)} — pradėk šiandien. 🚀`,
      ],
      community: [
        `👋 Mūsų bendruomenei: ${topic}! Ačiū, kad esate kartu — parašykit komentaruose, ką manote. 💬`,
        `Užkulisiai 🎬 ${topic[0].toUpperCase() + topic.slice(1)}. Mums smalsu — ko norėtumėt pamatyti daugiau?`,
        `Šventė! 🎉 ${topic[0].toUpperCase() + topic.slice(1)}. Be jūsų to nebūtų — dėkojam kiekvienam! ❤️`,
      ],
    }
    setAiSuggestions(tpl[aiCategory])
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
  async function handleSaveEdit() {
    if (!editingPost) return
    const { data } = await supabase.from('content_posts')
      .update({ title: editingPost.title, caption: editingPost.caption, platform: editingPost.platform, publish_date: editingPost.publish_date || null })
      .eq('id', editingPost.id).select().single()
    if (data) {
      setPosts(prev => prev.map(p => p.id === data.id ? data : p))
      setEditingPost(null)
    }
  }

  // Calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfMonth(year: number, month: number) {
    const d = new Date(year, month, 1).getDay()
    return d === 0 ? 6 : d - 1 // Mon=0
  }
  function getPostsForDay(day: number) {
    return posts.filter(p => {
      if (!p.publish_date) return false
      const d = new Date(p.publish_date)
      return d.getFullYear() === calDate.getFullYear() && d.getMonth() === calDate.getMonth() && d.getDate() === day
    })
  }

  // Analytics
  function getAnalyticsPosts() {
    const n = new Date()
    if (analyticsPeriod === 'thisMonth') return posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= new Date(n.getFullYear(), n.getMonth(), 1))
    if (analyticsPeriod === 'lastMonth') { const s = new Date(n.getFullYear(), n.getMonth()-1, 1); const e = new Date(n.getFullYear(), n.getMonth(), 1); return posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= s && new Date(p.published_at) < e) }
    if (analyticsPeriod === 'last3') return posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= new Date(n.getFullYear(), n.getMonth()-3, 1))
    return posts.filter(p => p.status === 'published')
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

  const filteredPosts = posts
    .filter(p => postFilter === 'all' || p.status === postFilter)
    .filter(p => platformFilter === 'all' || p.platform === platformFilter)
    .filter(p => !activeClient || p.client_id === activeClient.id)

  const approvalPosts = posts.filter(p => {
    if (approvalTab === 'internal') return p.status === 'review'
    if (approvalTab === 'client') return p.status === 'approved'
    return ['published','rejected'].includes(p.status)
  })

  const analyticsPosts = getAnalyticsPosts()
  const byPlatform: Record<string, number> = {}
  analyticsPosts.forEach(p => { byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1 })
  const maxPlatformCount = Math.max(...Object.values(byPlatform), 1)

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
            {activeClient ? activeClient.company_name
              : activeView === 'dashboard' ? 'Dashboard'
              : activeView === 'calendar' ? 'Turinio kalendorius'
              : activeView === 'posts' ? 'Visi įrašai'
              : activeView === 'approvals' ? 'Tvirtinimas'
              : activeView === 'analytics' ? 'Analitika'
              : activeView === 'team' ? 'Komanda'
              : 'Brand Hub'}
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Naujas įrašas</button>
            <button className="btn btn-ghost" onClick={() => { supabase.auth.signOut(); router.push('/login') }}>Atsijungti</button>
          </div>
        </div>

        {/* View container */}
        <div className="view-container" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ===== DASHBOARD ===== */}
          {activeView === 'dashboard' && !activeClient && (
            <div className="view active">
              <div className="welcome-banner">
                <h2>Laba diena, {profile.full_name?.split(' ')[0] || profile.email}! 👋</h2>
                <p>{pendingPosts.length > 0
                  ? `${pendingPosts.length} įrašai laukia tvirtinimo · ${scheduledPosts.length} suplanuota šį mėnesį`
                  : `Viskas patvirtinta ✓ · ${MONTHS_LT[now.getMonth()]} ${now.getFullYear()}`}
                </p>
              </div>
              <div className="stats-grid">
                {[
                  { icon: '📅', bg: 'var(--primary-light)', value: scheduledPosts.length, label: 'Suplanuota šį mėn.', change: `${posts.filter(p=>p.status==='published').length} viso paskelbta`, up: true },
                  { icon: '⏳', bg: '#FFF3E0', value: pendingPosts.length, label: 'Laukia tvirtinimo', change: 'Reikia peržiūros', up: false },
                  { icon: '✅', bg: '#E8F5E9', value: publishedThisMonth.length, label: 'Paskelbta šį mėn.', change: '↑ 92% laiku', up: true },
                  { icon: '👥', bg: '#E8EAFD', value: clients.length, label: 'Aktyvūs klientai', change: `${tasks.filter(t=>t.status!=='done').length} aktyvių užduočių`, up: true },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                    <div className="stat-value" style={{ color: s.up ? 'var(--primary)' : '#E65100' }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className={`stat-change${s.up ? ' stat-up' : ''}`}>{s.change}</div>
                  </div>
                ))}
              </div>
              <div className="dashboard-grid">
                <div>
                  <div className="card">
                    <div className="section-title">
                      Artėjantys įrašai
                      <button className="btn btn-outline btn-sm" onClick={() => navTo('calendar')}>Žiūrėti kalendorių →</button>
                    </div>
                    {pendingPosts.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>Viskas patvirtinta ✓</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pendingPosts.slice(0, 5).map(post => (
                          <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: '#fffbf0', border: '1px solid #FDE68A', cursor: 'pointer' }}
                            onClick={() => navTo('approvals')}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{post.client_id ? clientMap[post.client_id]?.company_name : '—'} · {post.platform}</div>
                            </div>
                            <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>→</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="card">
                    <div className="section-title">Tvirtinimo statusas</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {clients.slice(0, 5).map(client => {
                        const cp = posts.filter(p => p.client_id === client.id)
                        const pub = cp.filter(p => p.status === 'published').length
                        const pct = cp.length > 0 ? Math.round(pub / cp.length * 100) : 0
                        const pend = cp.filter(p => p.status === 'review').length
                        return (
                          <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => openClient(client)}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--primary-dark)', flexShrink: 0 }}>
                              {client.company_name.slice(0,2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.company_name}</div>
                              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 2 }} />
                              </div>
                            </div>
                            {pend > 0 && <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>{pend}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card" style={{ marginTop: 16 }}>
                <div className="section-title">Naujausias aktyvumas</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                  {clients.map(client => {
                    const cp = posts.filter(p => p.client_id === client.id)
                    return (
                      <div key={client.id} className="card" style={{ cursor: 'pointer', padding: '14px 16px' }}
                        onClick={() => openClient(client)}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{client.company_name}</div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--success)' }}>✓ {cp.filter(p=>p.status==='published').length}</span>
                          {cp.filter(p=>p.status==='review').length > 0 && <span style={{ color: '#D97706', fontWeight: 600 }}>⏳ {cp.filter(p=>p.status==='review').length}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== CALENDAR ===== */}
          {activeView === 'calendar' && !activeClient && (
            <div className="view active">
              <div className="calendar-toolbar">
                <div className="cal-nav">
                  <button className="btn btn-outline btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
                  <div className="cal-month">{MONTHS_LT[calDate.getMonth()]} {calDate.getFullYear()}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setCalDate(new Date())}>Šiandien</button>
                <div style={{ marginLeft: 'auto' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>+ Naujas įrašas</button>
                </div>
              </div>
              <div className="cal-filter" style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Filtras:</span>
                <span className="platform-filter active">Visi</span>
                {Object.entries(PLATFORM_COLORS).map(([p, c]) => (
                  <span key={p} className="platform-filter" style={{ color: c }}>● {p}</span>
                ))}
              </div>
              <div className="calendar-grid">
                <div className="cal-header">
                  {DAYS_LT.map(d => <div key={d} className="cal-header-day">{d}</div>)}
                </div>
                <div className="cal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                  {/* Empty cells before first day */}
                  {Array.from({ length: getFirstDayOfMonth(calDate.getFullYear(), calDate.getMonth()) }).map((_, i) => (
                    <div key={`empty-${i}`} className="cal-day" style={{ background: 'transparent', border: 'none' }} />
                  ))}
                  {Array.from({ length: getDaysInMonth(calDate.getFullYear(), calDate.getMonth()) }).map((_, i) => {
                    const day = i + 1
                    const dayPosts = getPostsForDay(day)
                    const isToday = now.getDate() === day && now.getMonth() === calDate.getMonth() && now.getFullYear() === calDate.getFullYear()
                    return (
                      <div key={day} className="cal-day" style={{ minHeight: 80, padding: 8, background: 'var(--surface)', borderRadius: 8, border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                        <div className="cal-day-num" style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--primary)' : 'var(--text)', marginBottom: 4 }}>{day}</div>
                        {dayPosts.map(post => (
                          <div key={post.id} className="cal-post" style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, marginBottom: 2, background: PLATFORM_COLORS[post.platform] || 'var(--primary)', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.title}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== POSTS ===== */}
          {activeView === 'posts' && !activeClient && (
            <div className="view active">
              <div className="posts-toolbar">
                <select className="select-box" value={postFilter} onChange={e => setPostFilter(e.target.value)}>
                  <option value="all">Visi statusai</option>
                  {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="select-box" value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
                  <option value="all">Visos platformos</option>
                  {Object.keys(PLATFORM_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="select-box">
                  <option value="">Visi klientai</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowCreateModal(true)}>+ Naujas įrašas</button>
              </div>
              <div className="posts-table">
                <div className="table-header">
                  <div className="th">Įrašas</div>
                  <div className="th">Platforma</div>
                  <div className="th">Klientas</div>
                  <div className="th">Statusas</div>
                  <div className="th">Data</div>
                  <div className="th">Veiksmai</div>
                </div>
                {filteredPosts.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Įrašų nerasta</div>
                ) : (
                  filteredPosts.map(post => {
                    const sm = STATUS_META[post.status] || STATUS_META.draft
                    return (
                      <div key={post.id} className="table-row">
                        <div className="td" style={{ cursor: 'pointer' }} onClick={() => setSelectedPost(post)}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{post.title || '(Be pavadinimo)'}</div>
                          {post.caption && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{post.caption}</div>}
                        </div>
                        <div className="td" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc' }} />
                          <span style={{ fontSize: 12 }}>{post.platform}</span>
                        </div>
                        <div className="td" style={{ fontSize: 12 }}>{post.client_id ? clientMap[post.client_id]?.company_name || '—' : '—'}</div>
                        <div className="td">
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: sm.bg, color: sm.color }}>{sm.label}</span>
                        </div>
                        <div className="td" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{post.publish_date ? new Date(post.publish_date).toLocaleDateString('lt-LT') : '—'}</div>
                        <div className="td" style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#D1FAE5', color: '#065F46', border: 'none', opacity: post.status === 'review' ? 1 : 0.35, cursor: post.status === 'review' ? 'pointer' : 'default' }}
                            title="Patvirtinti"
                            onClick={() => post.status === 'review' && handleApprove(post.id)}>✓</button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', opacity: post.status === 'review' ? 1 : 0.35, cursor: post.status === 'review' ? 'pointer' : 'default' }}
                            title="Atmesti"
                            onClick={() => post.status === 'review' && handleReject(post.id)}>✕</button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#EEF2FF', color: '#3730A3', border: 'none' }}
                            title="Koreguoti"
                            onClick={() => setEditingPost(post)}>✏️</button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#F3F4F6', color: '#374151', border: 'none' }}
                            title="Dublikuoti"
                            onClick={() => handleDuplicate(post)}>📋</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ===== APPROVALS ===== */}
          {activeView === 'approvals' && !activeClient && (
            <div className="view active">
              <div className="approvals-tabs">
                {([['internal','Vidinė peržiūra'],['client','Kliento tvirtinimas'],['done','Išspręsta']] as const).map(([key, label]) => (
                  <div key={key} className={`approval-tab${approvalTab === key ? ' active' : ''}`} onClick={() => setApprovalTab(key)}>
                    {label}
                    {key === 'internal' && pendingPosts.length > 0 && <span style={{ marginLeft: 6, background: 'var(--primary)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{pendingPosts.length}</span>}
                  </div>
                ))}
              </div>
              {approvalPosts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', marginTop: 16 }}>
                  {approvalTab === 'internal' ? '✅ Nėra įrašų, laukiančių peržiūros' : approvalTab === 'client' ? 'Nėra patvirtintų įrašų' : 'Nėra išspręstų įrašų'}
                </div>
              ) : (
                <div className="approvals-grid" style={{ marginTop: 16 }}>
                  {approvalPosts.map(post => {
                    const sm = STATUS_META[post.status] || STATUS_META.draft
                    return (
                      <div key={post.id} className="approval-card">
                        <div className="approval-card-header" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc' }} />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{post.platform}</span>
                          </div>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: sm.bg, color: sm.color }}>{sm.label}</span>
                        </div>
                        <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setSelectedPost(post)}>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{post.title}</div>
                          {post.caption && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{post.caption}</div>}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {post.client_id ? clientMap[post.client_id]?.company_name : '—'}
                            {post.publish_date && ` · ${new Date(post.publish_date).toLocaleDateString('lt-LT')}`}
                          </div>
                          {post.status === 'review' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); handleApprove(post.id) }}>✓ Patvirtinti</button>
                              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); handleReject(post.id) }}>✕ Atmesti</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== ANALYTICS ===== */}
          {activeView === 'analytics' && !activeClient && (
            <div className="view active">
              <div className="analytics-toolbar" style={{ marginBottom: 20 }}>
                <select className="select-box" value={analyticsPeriod} onChange={e => setAnalyticsPeriod(e.target.value)}>
                  <option value="thisMonth">Šis mėnuo</option>
                  <option value="lastMonth">Praėjęs mėnuo</option>
                  <option value="last3">Paskutiniai 3 mėnesiai</option>
                  <option value="thisYear">Šie metai</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 22 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Paskelbti įrašai</div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Sora, sans-serif' }}>{analyticsPosts.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>iš {posts.length} viso įrašų</div>
                </div>
                <div className="card" style={{ padding: 22 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12 }}>Platforma</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(byPlatform).sort((a,b) => b[1]-a[1]).map(([platform, count]) => (
                      <div key={platform}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 5, background: PLATFORM_COLORS[platform] || '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800 }}>{platform.slice(0,2).toUpperCase()}</div>
                          <span style={{ fontSize: 12, flex: 1 }}>{platform}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                        </div>
                        <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round(count/maxPlatformCount*100)}%`, height: '100%', background: PLATFORM_COLORS[platform] || 'var(--primary)', borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                    {Object.keys(byPlatform).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Duomenų nėra</div>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                {clients.map(client => {
                  const cp = analyticsPosts.filter(p => p.client_id === client.id)
                  return (
                    <div key={client.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openClient(client)}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{client.company_name}</div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--primary)' }}>{cp.length}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>paskelbti įrašai</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ===== TEAM ===== */}
          {activeView === 'team' && !activeClient && (
            <div className="view active">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Komandos nariai</div>
                  <div className="text-muted">{team.length} nariai · {clients.length} klientai</div>
                </div>
                <button className="btn btn-primary">+ Pakviesti</button>
              </div>
              <div className="team-grid">
                {team.map(member => (
                  <div key={member.id} className="team-card">
                    <div className="team-avatar" style={{ background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 auto 12px' }}>
                      {(member.full_name || member.email || 'U').slice(0,2).toUpperCase()}
                    </div>
                    <div className="team-name" style={{ fontWeight: 700, fontSize: 14, textAlign: 'center', marginBottom: 2 }}>{member.full_name || '(be vardo)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>{member.email}</div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: member.role === 'agency_admin' ? 'var(--primary-light)' : 'var(--bg)', color: member.role === 'agency_admin' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {member.role === 'agency_admin' ? 'Admin' : 'Narys'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== BRAND HUB ===== */}
          {activeView === 'brand' && !activeClient && (
            <div className="view active">
              <div className="brand-grid">
                <div className="card">
                  <div className="section-title">Brand Voice</div>
                  <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>Apibrėžkite brand komunikacijos stilių. AI naudos šias gaires turiniui generuoti.</p>
                  <div className="voice-card">Profesionali, šilta, kūrybiška. Kalbame tiesiogiai ir aiškiai, vengdami korporatyvinio žargono. Vertiname autentiškumą.</div>
                  <div className="tone-sliders" style={{ marginTop: 16 }}>
                    {[['Formalumas', 35], ['Drąsa', 65], ['Žaismingumas', 45], ['Emocionalumas', 70]].map(([label, val]) => (
                      <div key={label as string} className="tone-row">
                        <span className="tone-label">{label}</span>
                        <input type="range" className="tone-slider" min="0" max="100" defaultValue={val as number} style={{ flex: 1 }} />
                        <span className="tone-value">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">Brand spalvos</div>
                  <div className="color-swatches">
                    {['#6c63ff','#FF6B6B','#1E181C','#f0f0f8','#22C55E'].map(c => (
                      <div key={c} className="swatch" style={{ background: c }} />
                    ))}
                    <div className="swatch add-swatch">+</div>
                  </div>
                  <div className="section-title" style={{ marginTop: 20 }}>Hashtagai</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {['#rinkodara','#turinys','#socialiniaitinklai','#lt'].map(h => (
                      <span key={h} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary-dark)', fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                  <input className="form-input" style={{ marginTop: 10 }} placeholder="Pridėti hashtag ir spauskite Enter" />
                </div>
                <div className="card">
                  <div className="section-title">Medijų biblioteka</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {Array.from({length:8}).map((_,i) => (
                      <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 20 }}>🖼️</div>
                    ))}
                  </div>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 12, width: '100%' }}>↑ Įkelti failus</button>
                </div>
                <div className="card">
                  <div className="section-title">Turinio ramsčiai</div>
                  <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>Apibrėžkite pasikartojančias turinio temas strategijos nuoseklumui.</p>
                  {['Mokomasis turinys','Atvejai ir sėkmės istorijos','Produkto pristatymas','Komandinė kultūra'].map((pillar, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{pillar}</span>
                    </div>
                  ))}
                  <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>+ Pridėti ramstį</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== CLIENT WORKSPACE ===== */}
          {activeView === 'client' && activeClient && (
            <div className="view active">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: 'var(--primary-light)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                  {activeClient.company_name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{activeClient.company_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {posts.filter(p=>p.client_id===activeClient.id && p.status==='published').length} paskelbta · {posts.filter(p=>p.client_id===activeClient.id && p.status==='review').length} laukia
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowCreateModal(true)}>+ Naujas įrašas</button>
              </div>

              {/* Client stats */}
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
                {[
                  { icon: '📝', label: 'Visi įrašai', value: posts.filter(p=>p.client_id===activeClient.id).length },
                  { icon: '✅', label: 'Paskelbta', value: posts.filter(p=>p.client_id===activeClient.id && p.status==='published').length },
                  { icon: '⏳', label: 'Laukia', value: posts.filter(p=>p.client_id===activeClient.id && p.status==='review').length },
                  { icon: '📋', label: 'Užduotys', value: tasks.filter(t=>t.client_id===activeClient.id && t.status!=='done').length },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>{s.icon}</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Client posts */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-title">
                  Turinio įrašai
                  <button className="btn btn-outline btn-sm" onClick={() => setShowCreateModal(true)}>+ Naujas</button>
                </div>
                {posts.filter(p => p.client_id === activeClient.id).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>Įrašų nėra</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {posts.filter(p => p.client_id === activeClient.id).slice(0, 8).map(post => {
                      const sm = STATUS_META[post.status] || STATUS_META.draft
                      return (
                        <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }} onClick={() => setSelectedPost(post)}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title || '(Be pavadinimo)'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{post.platform} {post.publish_date && `· ${new Date(post.publish_date).toLocaleDateString('lt-LT')}`}</div>
                          </div>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: sm.bg, color: sm.color }}>{sm.label}</span>
                          {post.status === 'review' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); handleApprove(post.id) }}>✓</button>
                              <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleReject(post.id) }}>✕</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Client tasks */}
              <div className="card">
                <div className="section-title">Užduotys</div>
                {tasks.filter(t => t.client_id === activeClient.id).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>Užduočių nėra</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tasks.filter(t => t.client_id === activeClient.id).map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: task.status === 'done' ? 'var(--bg)' : 'var(--surface)' }}>
                        <button onClick={() => handleTaskDone(task.id)}
                          style={{ width: 18, height: 18, borderRadius: '50%', border: task.status === 'done' ? '2px solid var(--success)' : '2px solid var(--border)', background: task.status === 'done' ? 'var(--success)' : 'transparent', color: '#fff', fontSize: 10, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {task.status === 'done' && '✓'}
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)' }}>{task.title}</span>
                        {task.due_date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(task.due_date).toLocaleDateString('lt-LT')}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ===== CREATE POST MODAL ===== */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <span style={{ fontSize: 20 }}>✍️</span>
              <h3 className="modal-title">Naujas įrašas</h3>
              {activeClient && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 20 }}>{activeClient.company_name}</span>}
              <span className="text-muted" style={{ fontSize: 12 }}>Automatiškai išsaugoma</span>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} style={{ marginLeft: 'auto' }}>✕</button>
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
                {/* AI bar */}
                <div className="ai-bar" style={{ cursor: 'pointer' }} onClick={() => { setAiSuggestions([]); setAiTopic(newPost.title); setShowAiModal(true) }}>
                  <span style={{ fontSize: 18 }}>✨</span>
                  <span className="ai-label">Generuoti su AI — geresni tekstai per sekundes</span>
                  <span className="ai-chip">AI</span>
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
                  <textarea className="form-input" rows={4} value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} placeholder="Rašykite tekstą arba generuokite su AI..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                {/* Media upload */}
                <div className="form-group">
                  <label className="form-label">Vizualas / Media</label>
                  {newPost.media_url ? (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      {newPost.media_url.match(/\.(mp4|mov|webm)/i)
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
                      newPost.media_url.match(/\.(mp4|mov|webm)/i)
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
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Atšaukti</button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-outline" disabled={!!creatingStatus} onClick={() => handleCreatePost('draft')}>
                  {creatingStatus === 'draft' ? '⏳' : '💾'} Juodraštis
                </button>
                <button className="btn btn-outline" disabled={!!creatingStatus} onClick={() => handleCreatePost('review')}>
                  {creatingStatus === 'review' ? '⏳' : '👁'} Vidinė peržiūra
                </button>
                <button className="btn btn-primary" disabled={!!creatingStatus} onClick={() => handleCreatePost('approved')}>
                  {creatingStatus === 'approved' ? '⏳' : '📤'} Kliento tvirtinimui
                </button>
                <button className="btn btn-outline" disabled={!!creatingStatus} title={!newPost.publish_date ? 'Reikia datos ir laiko' : ''} onClick={() => handleCreatePost('scheduled')}>
                  {creatingStatus === 'scheduled' ? '⏳' : '🚀'} Suplanuoti iškart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT POST MODAL ===== */}
      {editingPost && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditingPost(null) }}>
          <div className="modal" style={{ width: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3>✏️ Koreguoti įrašą</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPost(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Pavadinimas</label>
                <input className="form-input" value={editingPost.title || ''} onChange={e => setEditingPost(p => p ? { ...p, title: e.target.value } : p)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tekstas</label>
                <textarea className="form-input" rows={5} value={editingPost.caption || ''} onChange={e => setEditingPost(p => p ? { ...p, caption: e.target.value } : p)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Platforma</label>
                  <select className="select-box" style={{ width: '100%' }} value={editingPost.platform} onChange={e => setEditingPost(p => p ? { ...p, platform: e.target.value } : p)}>
                    {['Instagram','Facebook','LinkedIn','TikTok','X','YouTube'].map(pl => <option key={pl}>{pl}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data ir laikas</label>
                  <input type="datetime-local" className="form-input" value={(editingPost.publish_date || '').slice(0, 16)} onChange={e => setEditingPost(p => p ? { ...p, publish_date: e.target.value } : p)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditingPost(null)}>Atšaukti</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>💾 Išsaugoti</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== AI CAPTION MODAL ===== */}
      {showAiModal && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 110 }} onClick={e => { if (e.target === e.currentTarget) setShowAiModal(false) }}>
          <div className="modal" style={{ width: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <span style={{ fontSize: 20 }}>✨</span>
              <h3 className="modal-title">AI tekstų generatorius</h3>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: 20 }}>Demo šablonai</span>
              <button className="btn btn-ghost" onClick={() => setShowAiModal(false)} style={{ marginLeft: 'auto' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Apie ką šis įrašas?</label>
                <input className="form-input" value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generateAiCaptions()}
                  placeholder="pvz. nauja vasaros kolekcija su 20% nuolaida" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Kategorija</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([['promo','🎯','Reklaminis'],['edu','📖','Mokomasis'],['inspo','💡','Įkvepiantis'],['community','🎉','Bendruomenei']] as const).map(([key, icon, label]) => (
                    <div key={key} onClick={() => setAiCategory(key)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        border: aiCategory === key ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: aiCategory === key ? 'var(--primary-light)' : 'var(--surface)',
                      }}>
                      {icon} {label}
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" onClick={generateAiCaptions}>✨ Generuoti tekstus</button>
              {aiSuggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {aiSuggestions.map((s, i) => (
                    <div key={i} onClick={() => { setNewPost(p => ({ ...p, caption: s })); setShowAiModal(false) }}
                      style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 13, lineHeight: 1.6, cursor: 'pointer' }}>
                      {s}
                      <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginTop: 6 }}>Naudoti šį tekstą →</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== POST DETAIL MODAL ===== */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          clientId={selectedPost.client_id}
          role="agency_admin"
          onClose={() => setSelectedPost(null)}
          onUpdate={updated => {
            setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
            setSelectedPost(updated)
          }}
        />
      )}
    </div>
  )
}
