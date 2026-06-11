'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'
import type { Task, Client } from '@/types'

const PRIORITY_META: Record<string, { label: string; bg: string; color: string }> = {
  high:   { label: 'Aukštas',   bg: '#FEE2E2', color: '#991B1B' },
  medium: { label: 'Vidutinis', bg: '#FEF3C7', color: '#92400E' },
  low:    { label: 'Žemas',     bg: '#F3F4F6', color: '#6B7280' },
}

const STATUS_TABS = [
  { key: 'all',         label: 'Visos' },
  { key: 'todo',        label: 'Reikia atlikti' },
  { key: 'in_progress', label: 'Vykdoma' },
  { key: 'review',      label: 'Peržiūra' },
  { key: 'done',        label: 'Atlikta' },
]

export default function TasksPage() {
  const [profile, setProfile] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }
      setProfile(p)

      const [{ data: tasksData }, { data: clientsData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('agency_id', p.agency_id).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, company_name').eq('agency_id', p.agency_id),
      ])
      setTasks(tasksData || [])
      const map: Record<string, string> = {}
      ;(clientsData || []).forEach((c: any) => { map[c.id] = c.company_name })
      setClients(map)
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  const counts: Record<string, number> = { all: tasks.length }
  STATUS_TABS.slice(1).forEach(s => { counts[s.key] = tasks.filter(t => t.status === s.key).length })

  let filtered = activeTab === 'all' ? tasks : tasks.filter(t => t.status === activeTab)
  if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter)
  if (search.trim()) filtered = filtered.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()))

  const overdue = filtered.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')

  async function handleStatusChange(taskId: string, newStatus: string) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
  }

  function isOverdue(task: Task) {
    return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role={profile.role} agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Užduotys</h1>
            <p style={{ fontSize: 13, color: '#888' }}>
              {counts['todo'] + (counts['in_progress'] || 0)} aktyvios · {overdue.length > 0 && <span style={{ color: '#DC2626', fontWeight: 600 }}>{overdue.length} vėluoja</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Ieškoti užduočių..."
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, width: 200, outline: 'none' }} />
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { icon: '📋', iconBg: '#EEF2FF', value: counts['todo'] || 0,        label: 'Reikia atlikti', color: '#4338CA' },
            { icon: '⚡', iconBg: '#FFF3E0', value: counts['in_progress'] || 0, label: 'Vykdoma',        color: '#D97706' },
            { icon: '👁️', iconBg: '#F3F4F6', value: counts['review'] || 0,      label: 'Peržiūra',      color: '#6B7280' },
            { icon: '✅', iconBg: '#E8F5E9', value: counts['done'] || 0,         label: 'Atlikta',       color: '#16A34A' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 10 }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#777' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #f0f0f0', marginBottom: '1rem' }}>
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
                background: 'none', fontWeight: activeTab === tab.key ? 700 : 400,
                color: activeTab === tab.key ? '#6c63ff' : '#666',
                borderBottom: activeTab === tab.key ? '2px solid #6c63ff' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {tab.label}
              {counts[tab.key] > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 10, background: activeTab === tab.key ? '#EEF2FF' : '#f0f0f0', color: activeTab === tab.key ? '#4338CA' : '#888', fontWeight: 600 }}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
          {['all', 'high', 'medium', 'low'].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${priorityFilter === p ? '#6c63ff' : '#e0e0e0'}`,
                background: priorityFilter === p ? '#EEF2FF' : '#fff',
                color: priorityFilter === p ? '#4338CA' : '#666',
                fontWeight: priorityFilter === p ? 700 : 400,
              }}>
              {p === 'all' ? 'Visos prioritetai' : PRIORITY_META[p]?.label || p}
            </button>
          ))}
        </div>

        {/* Tasks list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 100px 120px 1fr 80px',
            padding: '10px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0',
            fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <span>Užduotis</span>
            <span>Klientas</span>
            <span>Prioritetas</span>
            <span>Statusas</span>
            <span>Terminas</span>
            <span style={{ textAlign: 'right' }}>Veiksmai</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              Užduočių nerasta
            </div>
          ) : (
            filtered.map((task, i) => {
              const pm = PRIORITY_META[task.priority] || PRIORITY_META.low
              const overdueMark = isOverdue(task)
              return (
                <div key={task.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 100px 120px 1fr 80px',
                  padding: '12px 16px', alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f8f8f8' : 'none',
                  background: overdueMark ? '#FFF9F9' : '',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => !overdueMark && (e.currentTarget.style.background = '#FAFBFF')}
                  onMouseLeave={e => (e.currentTarget.style.background = overdueMark ? '#FFF9F9' : '')}>
                  {/* Title */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.status === 'done' ? (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#D1FAE5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: '#065F46' }}>✓</div>
                      ) : (
                        <button onClick={() => handleStatusChange(task.id, 'done')}
                          title="Pažymėti kaip atliktą"
                          style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #d0d0d0', background: '#fff', cursor: 'pointer', flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 600, color: task.status === 'done' ? '#aaa' : '#222', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                      </span>
                      {overdueMark && <span style={{ fontSize: 10, background: '#FEE2E2', color: '#991B1B', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>Vėluoja</span>}
                    </div>
                    {task.description && (
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, paddingLeft: 26, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                        {task.description}
                      </div>
                    )}
                  </div>
                  {/* Client */}
                  <div style={{ fontSize: 12, color: '#555' }}>{task.client_id ? (clients[task.client_id] || '—') : 'Vidinis'}</div>
                  {/* Priority */}
                  <div>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: pm.bg, color: pm.color }}>
                      {pm.label}
                    </span>
                  </div>
                  {/* Status */}
                  <div>
                    <select value={task.status} onChange={e => handleStatusChange(task.id, e.target.value)}
                      style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                      <option value="todo">Reikia atlikti</option>
                      <option value="in_progress">Vykdoma</option>
                      <option value="review">Peržiūra</option>
                      <option value="done">Atlikta</option>
                    </select>
                  </div>
                  {/* Due date */}
                  <div style={{ fontSize: 12, color: overdueMark ? '#DC2626' : '#888', fontWeight: overdueMark ? 600 : 400 }}>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('lt-LT') : '—'}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <a href={task.client_id ? `/clients/${task.client_id}#uzduotys` : '#'}
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e0e0e0', background: '#fafafa', color: '#666', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                      ↗
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
