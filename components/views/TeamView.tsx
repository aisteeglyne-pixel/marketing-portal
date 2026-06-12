'use client'

import { useState } from 'react'
import { clientColor } from '@/lib/portal-helpers'
import type { Client, Task } from '@/types'

interface TeamViewProps {
  team: any[]
  clients: Client[]
  tasks: Task[]
  showToast: (msg: string) => void
}

const ROLE_LABELS: Record<string, string> = {
  agency_admin: 'Admin',
  agency_member: 'Manager',
  client: 'Client',
}

export default function TeamView({ team, clients, tasks, showToast }: TeamViewProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = team.filter(m => {
    const name = (m.full_name || m.email || '').toLowerCase()
    const role = ROLE_LABELS[m.role] || m.role
    const matchSearch = !search || name.includes(search.toLowerCase()) || role.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || m.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="view active">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Komandos nariai</div>
          <div className="text-muted">{filtered.length} iš {team.length} narių · {clients.length} klientai</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ width: 180 }} placeholder="🔍 Ieškoti..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="select-box" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">Visos rolės</option>
            <option value="agency_admin">Admin</option>
            <option value="agency_member">Manager</option>
            <option value="client">Client</option>
          </select>
          <button className="btn btn-primary" onClick={() => showToast('📧 Pakvietimai — netrukus')}>+ Pakviesti</button>
        </div>
      </div>
      <div className="team-grid">
        {filtered.map(member => {
          const name = member.full_name || '(be vardo)'
          const roleLabel = ROLE_LABELS[member.role] || 'Narys'
          const activeTasks = tasks.filter(t => t.assigned_to === member.id && t.status !== 'done').length
          return (
            <div key={member.id} className="team-card">
              <div className="team-avatar" style={{ background: clientColor(member.email || name), borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 auto 12px' }}>
                {(member.full_name || member.email || 'U').slice(0,2).toUpperCase()}
              </div>
              <div className="team-name" style={{ fontWeight: 700, fontSize: 14, textAlign: 'center', marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8 }}>{member.email}</div>
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <span className={`team-role-badge role-${roleLabel.toLowerCase()}`}>{roleLabel}</span>
              </div>
              <div className="team-accounts" style={{ textAlign: 'center' }}>
                📁 {member.role === 'client' ? (clients.find(c => c.id === member.client_id)?.company_name || '—') : clients.map(c => c.company_name).join(' · ') || '—'}
              </div>
              <div className="text-muted" style={{ marginBottom: 12, textAlign: 'center' }}>🗓️ {activeTasks} aktyvios užduotys</div>
              <div className="team-actions" style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <button className="btn btn-outline btn-sm" onClick={() => showToast(`✉️ Žinutės — netrukus (2 etapas: Chatas)`)}>Žinutė</button>
                <button className="btn btn-ghost btn-sm" onClick={() => showToast(`⚙️ Nustatymai — netrukus`)}>⚙️</button>
              </div>
            </div>
          )
        })}
        {filtered.length === team.length && (
          <div className="invite-card" onClick={() => showToast('📧 Pakvietimai — netrukus')}>
            <div className="invite-icon">+</div>
            <div className="invite-text">Pakviesti komandos narį</div>
            <div className="text-muted" style={{ marginTop: 4, fontSize: 12 }}>Pridėk dizainerį, copywriter'į ar klientą</div>
          </div>
        )}
      </div>
    </div>
  )
}
