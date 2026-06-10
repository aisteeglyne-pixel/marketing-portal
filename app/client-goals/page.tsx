'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { Goal } from '@/types'
import { lt } from '@/lib/i18n/lt'

export default function ClientGoalsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)
      const { data } = await supabase.from('goals').select('*')
        .eq('client_id', p.client_id).order('deadline', { ascending: true })
      setGoals(data || [])
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '1.5rem' }}>{lt.clientGoals.title}</h1>

        {goals.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>
            {lt.clientGoals.noGoals}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {goals.map(goal => {
              const pct = goal.target_value > 0
                ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                : 0
              const achieved = goal.current_value >= goal.target_value

              return (
                <div key={goal.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{goal.title}</span>
                      {achieved && (
                        <span style={{ marginLeft: 10, background: '#EAF3DE', color: '#27500A', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                          ✓ Pasiekta
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: '#888' }}>
                      {goal.current_value} / {goal.target_value}
                      {goal.metric ? ` ${goal.metric}` : ''}
                    </span>
                  </div>

                  {goal.description && (
                    <p style={{ fontSize: 13, color: '#666', margin: '0 0 10px' }}>{goal.description}</p>
                  )}

                  <div style={{ background: '#f0f0f0', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: achieved ? '#27500A' : 'var(--brand-600)',
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa' }}>
                    <span>{pct}%</span>
                    {goal.deadline && (
                      <span>{lt.clientGoals.deadline} {new Date(goal.deadline).toLocaleDateString('lt-LT')}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
