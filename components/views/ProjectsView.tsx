'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { clientColor, fmtDate } from '@/lib/portal-helpers'
import type { Client, Project, Task } from '@/types'

interface ProjectsViewProps {
  profile: any
  clients: Client[]
  team: any[]
  projects: Project[]
  tasks: Task[]
  onProjectCreated: (p: Project) => void
  onProjectUpdated: (p: Project) => void
  onTaskCreated: (t: Task) => void
  onTaskUpdated: (t: Task) => void
  onTaskDeleted: (taskId: string) => void
  showToast: (msg: string) => void
}

const COLS: [Task['status'], string][] = [
  ['backlog', '📥 Backlog'],
  ['in_progress', '🔨 Daroma'],
  ['review', '👁 Peržiūra'],
  ['done', '✅ Atlikta'],
]

const PRIO_COLORS: Record<string, string> = { high: '#DC2626', medium: '#F59E0B', low: '#22C55E' }
const PRIO_LABELS: Record<string, string> = { high: '🔴 Aukštas', medium: '🟡 Vidutinis', low: '🟢 Žemas' }

export default function ProjectsView({ profile, clients, team, projects, tasks, onProjectCreated, onProjectUpdated, onTaskCreated, onTaskUpdated, onTaskDeleted, showToast }: ProjectsViewProps) {
  const supabase = createClient()
  const [activeProjId, setActiveProjId] = useState<string>('my')
  const [activeTab, setActiveTab] = useState<'overview' | 'board'>('board')
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  // Naujas projektas
  const [showNewProj, setShowNewProj] = useState(false)
  const [npName, setNpName] = useState('')
  const [npClient, setNpClient] = useState('')
  // Užduoties modalas
  const [taskModal, setTaskModal] = useState<Partial<Task> | null>(null)
  const [savingTask, setSavingTask] = useState(false)

  const agencyTeam = team.filter(m => m.role !== 'client')
  const activeProj = projects.find(p => p.id === activeProjId) || null
  const isMy = activeProjId === 'my'

  const boardTasks = isMy
    ? tasks.filter(t => t.assigned_to === profile.id && t.type !== 'client_request')
    : tasks.filter(t => t.project_id === activeProjId)

  const projColor = (p: Project) => p.client_id ? clientColor(clients.find(c => c.id === p.client_id)?.company_name || p.name) : (p.color || '#6c63ff')

  function pickProj(id: string) {
    setActiveProjId(id)
    setActiveTab(id === 'my' ? 'board' : 'overview')
  }

  async function createProject() {
    const name = npName.trim()
    if (!name) { showToast('⚠️ Įvesk projekto pavadinimą'); return }
    const { data, error } = await supabase.from('projects').insert({
      agency_id: profile.agency_id,
      client_id: npClient || null,
      name,
      created_by: profile.id,
    }).select().single()
    if (error) { showToast('⚠️ ' + error.message); return }
    onProjectCreated(data)
    setShowNewProj(false); setNpName(''); setNpClient('')
    setActiveProjId(data.id); setActiveTab('overview')
    showToast(`✅ Projektas „${name}" sukurtas`)
  }

  async function saveProjField(field: 'description' | 'status_note', value: string) {
    if (!activeProj) return
    const { data, error } = await supabase.from('projects').update({ [field]: value }).eq('id', activeProj.id).select().single()
    if (error) { showToast('⚠️ ' + error.message); return }
    onProjectUpdated(data)
    showToast('💾 Išsaugota')
  }

  async function dropOnCol(col: Task['status']) {
    setDragOverCol(null)
    const t = tasks.find(x => x.id === dragTaskId)
    setDragTaskId(null)
    if (!t || t.status === col) return
    const { data, error } = await supabase.from('tasks').update({ status: col }).eq('id', t.id).select().single()
    if (error) { showToast('⚠️ ' + error.message); return }
    onTaskUpdated(data)
    if (col === 'done') showToast('✅ Užduotis atlikta!')
  }

  function openNewTask(col: Task['status'] = 'backlog') {
    setTaskModal({ title: '', description: '', status: col, priority: 'medium', assigned_to: profile.id, due_date: '', project_id: isMy ? (projects[0]?.id || null) : activeProjId })
  }

  async function saveTask() {
    if (!taskModal || !taskModal.title?.trim() || savingTask) { if (!taskModal?.title?.trim()) showToast('⚠️ Reikia pavadinimo'); return }
    setSavingTask(true)
    const payload = {
      title: taskModal.title.trim(),
      description: taskModal.description || null,
      status: taskModal.status || 'backlog',
      priority: taskModal.priority || 'medium',
      assigned_to: taskModal.assigned_to || null,
      due_date: taskModal.due_date || null,
      project_id: taskModal.project_id || null,
    }
    if (taskModal.id) {
      const { data, error } = await supabase.from('tasks').update(payload).eq('id', taskModal.id).select().single()
      setSavingTask(false)
      if (error) { showToast('⚠️ ' + error.message); return }
      onTaskUpdated(data); setTaskModal(null); showToast('💾 Užduotis išsaugota')
    } else {
      const proj = projects.find(p => p.id === payload.project_id)
      const { data, error } = await supabase.from('tasks').insert({
        ...payload,
        agency_id: profile.agency_id,
        client_id: proj?.client_id || null,
        type: 'agency_task',
        created_by: profile.id,
      }).select().single()
      setSavingTask(false)
      if (error) { showToast('⚠️ ' + error.message); return }
      onTaskCreated(data); setTaskModal(null); showToast('✅ Užduotis sukurta')
    }
  }

  async function deleteTask() {
    if (!taskModal?.id) return
    if (!confirm(`Ištrinti užduotį „${taskModal.title}"?`)) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskModal.id)
    if (error) { showToast('⚠️ ' + error.message); return }
    onTaskDeleted(taskModal.id); setTaskModal(null); showToast('🗑️ Užduotis ištrinta')
  }

  const memberName = (id?: string | null) => {
    const m = team.find(x => x.id === id)
    return m ? (m.full_name || m.email) : null
  }
  const memberInitials = (id?: string | null) => {
    const n = memberName(id)
    return n ? n.slice(0, 2).toUpperCase() : '?'
  }

  // ===== Render =====
  const clientProjects = projects.filter(p => p.client_id)
  const internalProjects = projects.filter(p => !p.client_id)

  return (
    <div className="view active">
      <div style={{ display: 'flex', height: 'calc(100vh - 110px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

        {/* ==== Kairė: projektų sąrašas ==== */}
        <div style={{ width: 225, borderRight: '1px solid var(--border)', background: '#FAFAFC', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px 8px', fontSize: 13, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Projektai
            <span style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: 16 }} onClick={() => setShowNewProj(v => !v)}>＋</span>
          </div>
          {showNewProj && (
            <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input className="form-input" style={{ fontSize: 12, padding: '7px 10px' }} placeholder="Projekto pavadinimas" value={npName} onChange={e => setNpName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} autoFocus />
              <select className="select-box" style={{ fontSize: 12, padding: '6px 10px', width: '100%' }} value={npClient} onChange={e => setNpClient(e.target.value)}>
                <option value="">Vidinis projektas</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={createProject}>Sukurti</button>
            </div>
          )}
          <div className={`nav-proj-item${isMy ? ' active' : ''}`} onClick={() => pickProj('my')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: isMy ? 'var(--primary)' : undefined, color: isMy ? '#fff' : undefined }}>
            ⭐ Mano užduotys
          </div>
          {clientProjects.length > 0 && <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', padding: '12px 16px 4px' }}>Klientai</div>}
          {clientProjects.map(p => {
            const active = activeProjId === p.id
            const open = tasks.filter(t => t.project_id === p.id && t.status !== 'done').length
            return (
              <div key={p.id} onClick={() => pickProj(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: active ? 'var(--primary)' : undefined, color: active ? '#fff' : undefined }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: projColor(p), flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {open > 0 && <span style={{ fontSize: 10.5, color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>{open}</span>}
              </div>
            )
          })}
          {internalProjects.length > 0 && <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', padding: '12px 16px 4px' }}>Vidiniai</div>}
          {internalProjects.map(p => {
            const active = activeProjId === p.id
            const open = tasks.filter(t => t.project_id === p.id && t.status !== 'done').length
            return (
              <div key={p.id} onClick={() => pickProj(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: active ? 'var(--primary)' : undefined, color: active ? '#fff' : undefined }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color || '#6c63ff', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {open > 0 && <span style={{ fontSize: 10.5, color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>{open}</span>}
              </div>
            )
          })}
          {projects.length === 0 && !showNewProj && (
            <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
              Projektų dar nėra — spausk ＋ ir sukurk pirmą.
            </div>
          )}
        </div>

        {/* ==== Dešinė: antraštė + tab'ai + turinys ==== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '16px 22px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: isMy ? '#1E181C' : activeProj ? projColor(activeProj) : 'var(--border)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isMy ? '⭐' : activeProj ? activeProj.name.slice(0, 2).toUpperCase() : '—'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{isMy ? 'Mano užduotys' : activeProj?.name || 'Pasirink projektą'}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {isMy ? 'Visos tau priskirtos užduotys' : activeProj?.client_id ? `Kliento projektas · ${clients.find(c => c.id === activeProj.client_id)?.company_name || ''}` : activeProj ? 'Vidinis projektas' : ''}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => openNewTask()}>+ Nauja užduotis</button>
            </div>
            <div style={{ display: 'flex', gap: 2, marginTop: 12, borderBottom: '1px solid var(--border)' }}>
              {!isMy && activeProj && (
                <div onClick={() => setActiveTab('overview')} style={{ padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: activeTab === 'overview' ? 'var(--text)' : 'var(--text-muted)', borderBottom: activeTab === 'overview' ? '2.5px solid var(--primary)' : '2.5px solid transparent' }}>Apžvalga</div>
              )}
              <div onClick={() => setActiveTab('board')} style={{ padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: activeTab === 'board' ? 'var(--text)' : 'var(--text-muted)', borderBottom: activeTab === 'board' ? '2.5px solid var(--primary)' : '2.5px solid transparent' }}>Lenta</div>
              <div onClick={() => showToast('📃 Sąrašas — antroje bangoje')} style={{ padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text-muted)' }}>Sąrašas</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', background: 'var(--bg)' }}>

            {/* ===== APŽVALGA ===== */}
            {activeTab === 'overview' && activeProj && !isMy && (() => {
              const pt = tasks.filter(t => t.project_id === activeProj.id)
              const done = pt.filter(t => t.status === 'done').length
              const today = new Date().toISOString().slice(0, 10)
              const late = pt.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length
              const assignees = Array.from(new Set(pt.map(t => t.assigned_to).filter(Boolean)))
              const recent = [...pt].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 4)
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="card">
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>Projekto statusas</div>
                      <textarea className="form-input" rows={2} defaultValue={activeProj.status_note || ''} placeholder="Trumpas statuso komentaras komandai..."
                        onBlur={e => e.target.value !== (activeProj.status_note || '') && saveProjField('status_note', e.target.value)}
                        style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Išsaugoma automatiškai (kai paliksi laukelį)</div>
                    </div>
                    <div className="card">
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>Aprašymas</div>
                      <textarea className="form-input" rows={3} defaultValue={activeProj.description || ''} placeholder="Kas šiame projekte daroma, apimtys, susitarimai..."
                        onBlur={e => e.target.value !== (activeProj.description || '') && saveProjField('description', e.target.value)}
                        style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
                    </div>
                    <div className="card">
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>Paskutinis aktyvumas</div>
                      {recent.length === 0 ? <div className="text-muted" style={{ fontStyle: 'italic' }}>Užduočių dar nėra</div> :
                        recent.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5, cursor: 'pointer' }} onClick={() => setTaskModal(t)}>
                            <span>{t.status === 'done' ? '✅' : '✍️'}</span>
                            <span style={{ flex: 1 }}>{t.title}</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>{fmtDate(t.created_at)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="card">
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>Užduotys</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[['Viso', pt.length, 'var(--text)'], ['Atlikta', done, 'var(--success)'], ['Vėluoja', late, late ? '#DC2626' : 'var(--text-muted)']].map(([l, v, c]) => (
                          <div key={l as string} style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--bg)', borderRadius: 10 }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: c as string }}>{v}</div>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ height: 7, background: 'var(--bg)', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
                        <div style={{ width: `${pt.length ? Math.round(done / pt.length * 100) : 0}%`, height: '100%', background: 'var(--success)', borderRadius: 4 }} />
                      </div>
                      <div className="text-muted" style={{ marginTop: 6, textAlign: 'center', fontSize: 12 }}>{pt.length ? Math.round(done / pt.length * 100) : 0}% atlikta</div>
                    </div>
                    <div className="card">
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>Komanda</div>
                      {assignees.length === 0 ? <div className="text-muted" style={{ fontStyle: 'italic' }}>Niekam nepriskirta</div> :
                        assignees.map(id => (
                          <div key={id as string} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', fontSize: 13, fontWeight: 600 }}>
                            <span style={{ width: 28, height: 28, borderRadius: '50%', background: clientColor(memberName(id as string) || '?'), color: '#fff', fontWeight: 900, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{memberInitials(id as string)}</span>
                            {memberName(id as string) || 'Nežinomas'}
                            <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 11 }}>{pt.filter(t => t.assigned_to === id && t.status !== 'done').length} užd.</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ===== LENTA ===== */}
            {activeTab === 'board' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'start' }}>
                {COLS.map(([cid, label]) => {
                  const colTasks = boardTasks.filter(t => t.status === cid || (cid === 'backlog' && t.status === 'pending'))
                  return (
                    <div key={cid}
                      onDragOver={e => { e.preventDefault(); setDragOverCol(cid) }}
                      onDragLeave={() => setDragOverCol(null)}
                      onDrop={() => dropOnCol(cid)}
                      style={{ background: '#ECECF3', borderRadius: 14, padding: 10, minHeight: 200, outline: dragOverCol === cid ? '2px dashed var(--primary)' : 'none', outlineOffset: -4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 10px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                        {label} <span style={{ background: 'var(--surface)', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>{colTasks.length}</span>
                      </div>
                      {colTasks.map(t => {
                        const proj = projects.find(p => p.id === t.project_id)
                        const today = new Date().toISOString().slice(0, 10)
                        const late = t.status !== 'done' && t.due_date && t.due_date < today
                        return (
                          <div key={t.id} draggable
                            onDragStart={() => setDragTaskId(t.id)}
                            onClick={() => setTaskModal(t)}
                            style={{ background: 'var(--surface)', borderRadius: 11, padding: 12, marginBottom: 8, boxShadow: 'var(--shadow)', cursor: 'grab', opacity: dragTaskId === t.id ? 0.4 : 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7, lineHeight: 1.35 }}>{t.title}</div>
                            {proj && (
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: `${projColor(proj)}18`, color: projColor(proj) }}>{proj.name}</span>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                              {t.assigned_to && (
                                <span title={memberName(t.assigned_to) || ''} style={{ width: 22, height: 22, borderRadius: '50%', background: clientColor(memberName(t.assigned_to) || '?'), color: '#fff', fontSize: 8.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{memberInitials(t.assigned_to)}</span>
                              )}
                              {t.due_date && <span style={{ fontSize: 10.5, fontWeight: 600, color: late ? '#DC2626' : 'var(--text-muted)' }}>📅 {fmtDate(t.due_date)}</span>}
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIO_COLORS[t.priority || 'medium'], marginLeft: 'auto' }} title={PRIO_LABELS[t.priority || 'medium']} />
                            </div>
                          </div>
                        )
                      })}
                      <button onClick={() => openNewTask(cid)} style={{ width: '100%', padding: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 8 }}>+ Pridėti užduotį</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== UŽDUOTIES MODALAS ===== */}
      {taskModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) setTaskModal(null) }}>
          <div className="modal" style={{ width: 620, maxHeight: '90vh', overflowY: 'auto', display: 'block', padding: '22px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <div style={{ flex: 1 }}>
                <input className="form-input" style={{ fontSize: 16, fontWeight: 800, width: '100%' }} placeholder="Užduoties pavadinimas"
                  value={taskModal.title || ''} onChange={e => setTaskModal(m => ({ ...m, title: e.target.value }))} autoFocus={!taskModal.id} />
              </div>
              <button className="btn btn-ghost" onClick={() => setTaskModal(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Projektas</label>
                <select className="select-box" style={{ width: '100%' }} value={taskModal.project_id || ''} onChange={e => setTaskModal(m => ({ ...m, project_id: e.target.value || null }))}>
                  <option value="">Be projekto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Atsakingas</label>
                <select className="select-box" style={{ width: '100%' }} value={taskModal.assigned_to || ''} onChange={e => setTaskModal(m => ({ ...m, assigned_to: e.target.value || null }))}>
                  <option value="">Nepriskirta</option>
                  {agencyTeam.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Terminas</label>
                <input type="date" className="form-input" value={(taskModal.due_date || '').slice(0, 10)} onChange={e => setTaskModal(m => ({ ...m, due_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Prioritetas</label>
                <select className="select-box" style={{ width: '100%' }} value={taskModal.priority || 'medium'} onChange={e => setTaskModal(m => ({ ...m, priority: e.target.value as Task['priority'] }))}>
                  {Object.entries(PRIO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Aprašymas</label>
              <textarea className="form-input" rows={4} value={taskModal.description || ''} onChange={e => setTaskModal(m => ({ ...m, description: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Statusas</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLS.map(([cid, label]) => (
                  <span key={cid} onClick={() => setTaskModal(m => ({ ...m, status: cid }))}
                    style={{ padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${taskModal.status === cid ? 'var(--primary)' : 'var(--border)'}`, background: taskModal.status === cid ? 'var(--primary)' : 'var(--surface)', color: taskModal.status === cid ? '#fff' : 'var(--text)' }}>{label}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              {taskModal.id ? <button className="btn btn-sm" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none' }} onClick={deleteTask}>🗑 Ištrinti</button> : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={() => setTaskModal(null)}>Atšaukti</button>
                <button className="btn btn-primary" disabled={savingTask} onClick={saveTask}>{savingTask ? '⏳' : '💾'} Išsaugoti</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
