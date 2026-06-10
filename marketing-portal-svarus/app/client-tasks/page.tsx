'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { Task } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Eilėje', in_progress: 'Vykdoma', review: 'Peržiūroje', done: 'Atlikta'
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Žema', medium: 'Vidutinė', high: 'Aukšta'
}
const PRIORITY_COLORS: Record<string, string> = {
  low: '#888', medium: '#BA7517', high: '#A32D2D'
}

export default function ClientTasksPage() {
  const [profile, setProfile] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser(); const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)
      const { data } = await supabase.from('tasks').select('*')
        .eq('client_id', p.client_id).order('created_at', { ascending: false })
      setTasks(data || [])
    }
    load()
  }, [])

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.from('tasks').insert({
      agency_id: profile.agency_id,
      client_id: profile.client_id,
      title: newTask.title,
      description: newTask.description,
      status: 'backlog',
      priority: 'medium',
      type: 'client_request',
      created_by: profile.id,
    }).select().single()
    if (data) setTasks(prev => [data, ...prev])
    setNewTask({ title: '', description: '' })
    setShowForm(false)
  }

  const columns = ['backlog', 'in_progress', 'review', 'done']

  if (!profile) return <div style={{ padding: '2rem' }}>Kraunama...</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Užduotys</h1>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            + Nauja užklausa
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Nauja užklausa agentūrai</h3>
            <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                placeholder="Užklausos pavadinimas"
                required
                style={{ padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }}
              />
              <textarea
                value={newTask.description}
                onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Aprašymas (neprivaloma)"
                rows={3}
                style={{ padding: '9px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary">Siųsti</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Atšaukti</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {columns.map(col => (
            <div key={col}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {STATUS_LABELS[col]} ({tasks.filter(t => t.status === col).length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tasks.filter(t => t.status === col).map(task => (
                  <div key={task.id} className="card" style={{ padding: '0.875rem' }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 6 }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{task.description}</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: PRIORITY_COLORS[task.priority], fontWeight: 500 }}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: 11, color: '#888' }}>
                          {new Date(task.due_date).toLocaleDateString('lt-LT')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
