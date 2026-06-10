'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ clients: 0, content: 0, tasks: 0 })
  const router = useRouter()
  const supabase = createClient()

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

      const [{ count: clients }, { count: content }, { count: tasks }] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('agency_id', p.agency_id),
        supabase.from('content_posts').select('*', { count: 'exact', head: true }).eq('agency_id', p.agency_id).eq('status', 'review'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('agency_id', p.agency_id).neq('status', 'done'),
      ])
      setStats({ clients: clients || 0, content: content || 0, tasks: tasks || 0 })
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '0.5rem' }}>{lt.dashboard.title}</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>{lt.dashboard.greeting}, {profile.full_name || profile.email}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: lt.dashboard.stats.activeClients, value: stats.clients, color: '#534AB7' },
            { label: lt.dashboard.stats.pendingApproval, value: stats.content, color: '#BA7517' },
            { label: lt.dashboard.stats.activeTasks, value: stats.tasks, color: '#0F6E56' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>{lt.dashboard.quickActions.title}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/content" className="btn-primary" style={{ textDecoration: 'none' }}>
              {lt.dashboard.quickActions.viewContent}
            </a>
            <a href="/clients" className="btn-secondary" style={{ textDecoration: 'none' }}>
              {lt.dashboard.quickActions.manageClients}
            </a>
            <a href="/tasks" className="btn-secondary" style={{ textDecoration: 'none' }}>
              {lt.dashboard.quickActions.viewTasks}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
