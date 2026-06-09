'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ clients: 0, content: 0, tasks: 0 })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
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

  if (!profile) return <div style={{ padding: '2rem' }}>Kraunama...</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '0.5rem' }}>Apſvalga</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>Sveiki, {profile.full_name || profile.email}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Aktyvūs klientai', value: stats.clients, color: '#534AB7' },
            { label: 'Laukia patvirtinimo', value: stats.content, color: '#BA7517' },
            { label: 'Aktyvios užduotys', value: stats.tasks, color: '#0F6E56' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>Greiti veiksmai</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/content" className="btn-primary" style={{ textDecoration: 'none' }}>
              Peržiūrėti turinį
            </a>
            <a href="/clients" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Valdyti klientus
            </a>
            <a href="/tasks" className="btn-secondary" style={{ textDecoration: 'none' }}>
              ſiūrėti užduotis
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
