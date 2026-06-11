'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'
import type { Client, ContentPost, Task } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  draft:     '#9CA3AF',
  review:    '#D97706',
  approved:  '#16A34A',
  rejected:  '#DC2626',
  published: '#4F46E5',
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook:  '#1877F2',
  LinkedIn:  '#0A66C2',
  TikTok:    '#000000',
  X:         '#14171A',
  YouTube:   '#FF0000',
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  high:   { bg: '#FCEBEB', color: '#791F1F' },
  medium: { bg: '#FEF3C7', color: '#92400E' },
  low:    { bg: '#F0F0F0', color: '#666' },
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [pendingPosts, setPendingPosts] = useState<ContentPost[]>([])
  const [activeTasks, setActiveTasks] = useState<Task[]>([])
  const [allPosts, setAllPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role !== 'agency_admin') { router.push('/client-home'); return }
      setProfile(p)

      const [
        { data: clientsData },
        { data: reviewPosts },
        { data: tasksData },
        { data: postsData },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', p.agency_id).order('company_name'),
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id).eq('status', 'review').order('created_at', { ascending: false }).limit(6),
        supabase.from('tasks').select('*').eq('agency_id', p.agency_id).neq('status', 'done').order('created_at', { ascending: false }).limit(6),
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id),
      ])

      setClients(clientsData || [])
      setPendingPosts(reviewPosts || [])
      setActiveTasks(tasksData || [])
      setAllPosts(postsData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  const clientMap: Record<string, string> = {}
  clients.forEach(c => { clientMap[c.id] = c.company_name })

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const publishedThisMonth = allPosts.filter(p =>
    p.status === 'published' && p.published_at && new Date(p.published_at) >= thisMonthStart
  ).length
  const totalPublished = allPosts.filter(p => p.status === 'published').length

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        {/* Pasisveikinimas */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            Sveiki, {profile.full_name?.split(' ')[0] || profile.email} 👋
          </h1>
          <p style={{ color: '#888', fontSize: 14 }}>
            {now.toLocaleDateString('lt-LT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* KPI kortelės */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Klientų',          value: clients.length,       color: '#4338CA', href: '/clients' },
            { label: 'Laukia tvirtinimo', value: pendingPosts.length,  color: '#D97706', href: '/reports' },
            { label: 'Aktyvios užduotys', value: activeTasks.length,   color: '#D97706', href: '/tasks' },
            { label: 'Paskelbta šį mėn.', value: publishedThisMonth,  color: '#16A34A', href: '/reports' },
          ].map(s => (
            <a key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem 0.75rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#777' }}>{s.label}</div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

          {/* Laukia tvirtinimo */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>
                Laukia tvirtinimo
                {pendingPosts.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '1px 7px', borderRadius: 10, fontWeight: 500 }}>
                    {pendingPosts.length}
                  </span>
                )}
              </h2>
              <a href="/reports" style={{ fontSize: 12, color: '#6c63ff', textDecoration: 'none' }}>Visos →</a>
            </div>
            {pendingPosts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Viskas patvirtinta ✓</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {pendingPosts.map(post => (
                  <a key={post.id} href={`/clients/${post.client_id}#turinys`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      background: '#fffbf0', border: '1px solid #FDE68A',
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: PLATFORM_COLORS[post.platform] || '#999',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#333' }}>
                          {post.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>
                          {clientMap[post.client_id] || '—'} · {post.platform}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#D97706', fontWeight: 500 }}>Peržiūrėti →</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Aktyvios užduotys */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Aktyvios užduotys</h2>
              <a href="/tasks" style={{ fontSize: 12, color: '#6c63ff', textDecoration: 'none' }}>Visos →</a>
            </div>
            {activeTasks.length === 0 ? (
              <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Nėra aktyvių užduočių</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {activeTasks.map(task => (
                  <a key={task.id} href={`/clients/${task.client_id}#uzduotys`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#fafafa', border: '1px solid #f0f0f0' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                        background: (PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.low).bg,
                        border: `1px solid ${(PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.low).color}44`,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#333' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>
                          {clientMap[task.client_id] || '—'}
                          {task.due_date && ` · ${new Date(task.due_date).toLocaleDateString('lt-LT')}`}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Klientų sąrašas */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Klientai</h2>
            <a href="/clients" className="btn-primary" style={{ textDecoration: 'none', fontSize: 12, padding: '5px 12px' }}>
              + Naujas klientas
            </a>
          </div>
          {clients.length === 0 ? (
            <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Dar nėra klientų. Pridėkite pirmąjį.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {clients.map(client => {
                const clientPosts = allPosts.filter(p => p.client_id === client.id)
                const clientPending = clientPosts.filter(p => p.status === 'review').length
                const clientPublished = clientPosts.filter(p => p.status === 'published').length
                return (
                  <a key={client.id} href={`/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '1rem', borderRadius: 10, border: '1px solid #f0f0f0',
                      background: '#fafafa', cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#222' }}>
                        {client.company_name}
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#888' }}>
                        <span>✓ {clientPublished} paskelbta</span>
                        {clientPending > 0 && (
                          <span style={{ color: '#D97706', fontWeight: 500 }}>⏳ {clientPending} laukia</span>
                        )}
                      </div>
                      {client.social_channels && client.social_channels.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {client.social_channels.slice(0, 4).map(ch => (
                            <span key={ch} style={{
                              fontSize: 10, padding: '1px 6px', borderRadius: 8,
                              background: (PLATFORM_COLORS[ch] || '#999') + '18',
                              color: PLATFORM_COLORS[ch] || '#999',
                              fontWeight: 600,
                            }}>
                              {ch.slice(0, 2).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
