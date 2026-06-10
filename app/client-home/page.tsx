'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'

export default function ClientHomePage() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ pending: 0, tasks: 0, goals: 0 })
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

      if (!p) { router.push('/login'); return }
      if (p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)

      const [{ count: pending }, { count: tasks }, { count: goals }] = await Promise.all([
        supabase.from('content_posts').select('*', { count: 'exact', head: true })
          .eq('client_id', p.client_id).eq('status', 'review'),
        supabase.from('tasks').select('*', { count: 'exact', head: true })
          .eq('client_id', p.client_id).neq('status', 'done'),
        supabase.from('goals').select('*', { count: 'exact', head: true })
          .eq('client_id', p.client_id),
      ])
      setStats({ pending: pending || 0, tasks: tasks || 0, goals: goals || 0 })
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '0.5rem' }}>{lt.clientHome.title}</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>{profile.full_name || profile.email}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: lt.clientHome.stats.pendingApproval, value: stats.pending, href: '/client-content', color: '#BA7517' },
            { label: lt.clientHome.stats.activeTasks, value: stats.tasks, href: '/client-tasks', color: '#534AB7' },
            { label: lt.clientHome.stats.goals, value: stats.goals, href: '/client-goals', color: '#0F6E56' },
          ].map(s => (
            <a key={s.label} href={s.href} className="card"
              style={{ textAlign: 'center', textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{s.label}</div>
            </a>
          ))}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>{lt.clientHome.quickNav.title}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/client-content" className="btn-primary" style={{ textDecoration: 'none' }}>{lt.clientHome.quickNav.viewContent}</a>
            <a href="/client-tasks" className="btn-secondary" style={{ textDecoration: 'none' }}>{lt.clientHome.quickNav.myTasks}</a>
            <a href="/client-files" className="btn-secondary" style={{ textDecoration: 'none' }}>{lt.clientHome.quickNav.uploadFiles}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
