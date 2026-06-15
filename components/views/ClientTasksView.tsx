'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fmtDate } from '@/lib/portal-helpers'
import type { Task } from '@/types'

interface Props {
  profile: any
  tasks: Task[]
  preview?: boolean
  onTaskCreated: (t: Task) => void
  showToast: (msg: string) => void
}

const COLS: [Task['status'], string][] = [
  ['backlog', '📥 Gauta'],
  ['in_progress', '🔨 Daroma'],
  ['review', '👁 Peržiūra'],
  ['done', '✅ Atlikta'],
]
const PRIO: Record<string, { label: string; color: string }> = {
  high: { label: 'Aukštas', color: '#DC2626' },
  medium: { label: 'Vidutinis', color: '#F59E0B' },
  low: { label: 'Žemas', color: '#22C55E' },
}

export default function ClientTasksView({ profile, tasks, preview = false, onTaskCreated, showToast }: Props) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title.trim() || saving) { if (!title.trim()) showToast('⚠️ Įrašyk pavadinimą'); return }
    setSaving(true)
    const { data, error } = await supabase.from('tasks').insert({
      agency_id: profile.agency_id,
      client_id: profile.client_id,
      title: title.trim(),
      description: desc.trim() || null,
      status: 'backlog',
      priority: 'medium',
      type: 'client_request',
      created_by: profile.id,
    }).select().single()
    setSaving(false)
    if (error || !data) { showToast('⚠️ ' + (error?.message || 'klaida')); return }
    onTaskCreated(data)
    setTitle(''); setDesc(''); setShowForm(false)
    showToast('✅ Prašymas išsiųstas agentūrai')
  }

  return (
    <div className="view active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="text-muted" style={{ fontSize: 13 }}>Tavo prašymai agentūrai ir jų eiga</div>
        {!preview && <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>+ Naujas prašymas</button>}
      </div>

      {!preview && showForm && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Naujas prašymas</div>
          <input className="form-input" placeholder="Ko reikia? Pvz. Reels apie naują produktą" value={title}
            onChange={e => setTitle(e.target.value)} style={{ width: '100%', marginBottom: 8 }} autoFocus />
          <textarea className="form-input" rows={3} placeholder="Detalės (neprivaloma)" value={desc}
            onChange={e => setDesc(e.target.value)} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? '⏳' : 'Siųsti'}</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Atšaukti</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
        {COLS.map(([cid, label]) => {
          const colTasks = tasks.filter(t => t.status === cid || (cid === 'backlog' && t.status === 'pending'))
          return (
            <div key={cid} style={{ background: '#ECECF3', borderRadius: 14, padding: 10, minHeight: 120 }}>
              <div style={{ padding: '6px 8px 10px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                {label} <span style={{ background: 'var(--surface)', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>{colTasks.length}</span>
              </div>
              {colTasks.map(t => (
                <div key={t.id} style={{ background: 'var(--surface)', borderRadius: 11, padding: 12, marginBottom: 8, boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: t.description ? 5 : 7, lineHeight: 1.35 }}>{t.title}</div>
                  {t.description && <div className="text-muted" style={{ fontSize: 11.5, marginBottom: 7, lineHeight: 1.4 }}>{t.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.type === 'client_request' && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 8, background: '#FCE3F6', color: '#55111D' }}>Mano prašymas</span>}
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIO[t.priority || 'medium'].color, marginLeft: 'auto' }} title={PRIO[t.priority || 'medium'].label} />
                    {t.due_date && <span className="text-muted" style={{ fontSize: 10.5 }}>📅 {fmtDate(t.due_date)}</span>}
                  </div>
                </div>
              ))}
              {colTasks.length === 0 && <div className="text-muted" style={{ fontSize: 11.5, padding: '4px 8px', fontStyle: 'italic' }}>—</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
