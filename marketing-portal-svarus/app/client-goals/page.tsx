'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { Goal } from '@/types'

export default function ClientGoalsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser(); const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)
      const { data } = await supabase.from('goals').select('*').eq('client_id', p.client_id)
      setGoals(data || [])
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>Kraunama...</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '1.5rem' }}>Tikslai</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {goals.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#888', padding: '3rem', gridColumn: '1 / -1' }}>
              Tikslų kol kas nėra. Agentūra juos nustatys.
            </div>
          )}
          {goals.map(goal => {
            const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
            return (
              <div key={goal.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: 15 }}>{goal.title}</h3>
                  {goal.deadline && (
                    <span style={{ fontSize: 12, color: '#888' }}>
                      iki {new Date(goal.deadline).toLocaleDateString('lt-LT')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: 13, color: '#555' }}>
                    {goal.current_value} / {goal.target_value} {goal.unit}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: pct >= 100 ? '#0F6E56' : '#534AB7' }}>
                    {pct}%
                  </span>
                </div>

                <div style={{ background: '#f0f0f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99,
                    background: pct >= 100 ? '#1D9E75' : 'var(--brand-600)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                {goal.linked_metric && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: '0.5rem' }}>
                    Metrika: {goal.linked_metric}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
