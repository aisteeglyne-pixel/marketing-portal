'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'
import { Task, Project, Profile, Client } from '@/types'

// ─── Tipai ────────────────────────────────────────────────────────────────────

type View = 'list' | 'calendar'
type GroupBy = 'client' | 'project'
type ModalState =
  | { type: 'none' }
  | { type: 'task'; task?: Task }
  | { type: 'project'; project?: Project }

// ─── Spalvų paletė projektams ─────────────────────────────────────────────────

const PROJECT_COLORS = [
  '#6c63ff', '#ff6584', '#43aa8b', '#f9844a', '#4cc9f0',
  '#7209b7', '#3a86ff', '#ff006e', '#8338ec', '#06d6a0',
]

// ─── Pagalbinės funkcijos ──────────────────────────────────────────────────────

function statusColor(status: Task['status']) {
  return { backlog: '#aaa', in_progress: '#4cc9f0', review: '#f9844a', done: '#43aa8b' }[status]
}

function priorityBadge(priority: Task['priority']) {
  const map = {
    low: { bg: '#f0fdf4', color: '#15803d', label: lt.agencyTasks.priorities.low },
    medium: { bg: '#fefce8', color: '#a16207', label: lt.agencyTasks.priorities.medium },
    high: { bg: '#fef2f2', color: '#dc2626', label: lt.agencyTasks.priorities.high },
  }
  return map[priority]
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('lt-LT', { day: 'numeric', month: 'short' })
}

function isOverdue(due: string | null) {
  if (!due) return false
  return new Date(due) < new Date(new Date().toDateString())
}

// ─── Komponentas: TaskRow ─────────────────────────────────────────────────────

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const pri = priorityBadge(task.priority)
  const overdue = isOverdue(task.due_date) && task.status !== 'done'
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
        background: '#fff', border: '1px solid #f0f0f0',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Status dot */}
      <span style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: statusColor(task.status),
      }} />

      {/* Pavadinimas */}
      <span style={{
        flex: 1, fontSize: 14, fontWeight: 500,
        color: task.status === 'done' ? '#aaa' : '#111',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {task.title}
      </span>

      {/* Prioritetas */}
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
        background: pri.bg, color: pri.color, flexShrink: 0,
      }}>
        {pri.label}
      </span>

      {/* Priskirtas */}
      {task.assignee && (
        <span style={{
          fontSize: 12, color: '#888', flexShrink: 0,
          maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.assignee.full_name || task.assignee.email}
        </span>
      )}

      {/* Terminas */}
      {task.due_date && (
        <span style={{ fontSize: 12, color: overdue ? '#dc2626' : '#888', flexShrink: 0 }}>
          {formatDate(task.due_date)}
        </span>
      )}
    </div>
  )
}

// ─── Komponentas: GroupSection ────────────────────────────────────────────────

function GroupSection({
  label, color, tasks, onTaskClick, onAddTask,
}: {
  label: string
  color?: string
  tasks: Task[]
  onTaskClick: (t: Task) => void
  onAddTask: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 12, color: '#bbb' }}>{open ? '▾' : '▸'}</span>
        {color && (
          <span style={{
            width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0,
          }} />
        )}
        <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{label}</span>
        <span style={{
          fontSize: 11, color: '#aaa', background: '#f5f5f5',
          borderRadius: 20, padding: '1px 8px',
        }}>
          {tasks.length}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onAddTask() }}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#ccc', cursor: 'pointer', fontSize: 18, lineHeight: 1,
            padding: '0 4px', borderRadius: 4,
          }}
          title={lt.agencyTasks.newTask}
        >
          +
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.length === 0 ? (
            <div style={{ padding: '8px 16px', fontSize: 13, color: '#ccc', fontStyle: 'italic' }}>
              {lt.agencyTasks.noTasks}
            </div>
          ) : (
            tasks.map(t => (
              <TaskRow key={t.id} task={t} onClick={() => onTaskClick(t)} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Komponentas: TaskModal ───────────────────────────────────────────────────

function TaskModal({
  task, clients, projects, members, agencyId,
  onClose, onSave, onDelete,
}: {
  task?: Task
  clients: Pick<Client, 'id' | 'company_name'>[]
  projects: Project[]
  members: Pick<Profile, 'id' | 'full_name' | 'email'>[]
  agencyId: string
  onClose: () => void
  onSave: (data: Partial<Task>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const t = lt.agencyTasks.taskModal
  const isEdit = !!task

  const [title, setTitle] = useState(task?.title ?? '')
  const [desc, setDesc] = useState(task?.description ?? '')
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'backlog')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [linkType, setLinkType] = useState<'client' | 'project' | 'none'>(
    task?.project_id ? 'project' : task?.client_id ? 'client' : 'none'
  )
  const [clientId, setClientId] = useState(task?.client_id ?? '')
  const [projectId, setProjectId] = useState(task?.project_id ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({
      title: title.trim(),
      description: desc || null,
      status,
      priority,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      client_id: linkType === 'client' ? clientId || null : null,
      project_id: linkType === 'project' ? projectId || null : null,
    })
    setSaving(false)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4,
    display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid #e5e5e5', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, background: '#fff' }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, width: 520, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          {isEdit ? t.editTitle : t.createTitle}
        </h2>

        {/* Pavadinimas */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t.titleLabel}</label>
          <input
            style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder} autoFocus
          />
        </div>

        {/* Aprašymas */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t.descLabel}</label>
          <textarea
            style={{ ...inputStyle, height: 72, resize: 'vertical' }}
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder={t.descPlaceholder}
          />
        </div>

        {/* Statusas + Prioritetas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>{t.statusLabel}</label>
            <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value as Task['status'])}>
              {(['backlog', 'in_progress', 'review', 'done'] as const).map(s => (
                <option key={s} value={s}>{lt.agencyTasks.statuses[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t.priorityLabel}</label>
            <select style={selectStyle} value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <option key={p} value={p}>{lt.agencyTasks.priorities[p]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Terminas + Priskirta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>{t.dueDateLabel}</label>
            <input type="date" style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{t.assignedToLabel}</label>
            <select style={selectStyle} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">{lt.agencyTasks.unassigned}</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Susieta su */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t.linkLabel}</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(['none', 'client', 'project'] as const).map(lt_ => (
              <button
                key={lt_}
                onClick={() => setLinkType(lt_)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  border: '1px solid', transition: 'all 0.15s',
                  borderColor: linkType === lt_ ? '#6c63ff' : '#e5e5e5',
                  background: linkType === lt_ ? '#6c63ff' : '#fff',
                  color: linkType === lt_ ? '#fff' : '#666',
                }}
              >
                {lt_ === 'none' ? '—' : lt_ === 'client' ? t.linkClient : t.linkProject}
              </button>
            ))}
          </div>

          {linkType === 'client' && (
            <select style={selectStyle} value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">— pasirinkti —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          )}
          {linkType === 'project' && (
            <select style={selectStyle} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">— pasirinkti —</option>
              {projects.filter(p => p.status === 'active').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mygtukai */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave} disabled={saving || !title.trim()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: '#6c63ff', color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
              opacity: !title.trim() ? 0.5 : 1,
            }}
          >
            {saving ? t.submitting : t.submit}
          </button>
          {isEdit && onDelete && (
            <button
              onClick={onDelete}
              style={{
                padding: '10px 16px', borderRadius: 10, border: '1px solid #fca5a5',
                background: '#fff', color: '#dc2626', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              {t.delete}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e5e5',
              background: '#fff', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Komponentas: ProjectModal ────────────────────────────────────────────────

function ProjectModal({
  project, clients, agencyId,
  onClose, onSave, onArchive,
}: {
  project?: Project
  clients: Pick<Client, 'id' | 'company_name'>[]
  agencyId: string
  onClose: () => void
  onSave: (data: Partial<Project>) => Promise<void>
  onArchive?: () => Promise<void>
}) {
  const t = lt.agencyTasks.projectModal
  const isEdit = !!project

  const [name, setName] = useState(project?.name ?? '')
  const [desc, setDesc] = useState(project?.description ?? '')
  const [clientId, setClientId] = useState(project?.client_id ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [dueDate, setDueDate] = useState(project?.due_date ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      description: desc || null,
      client_id: clientId || null,
      color,
      due_date: dueDate || null,
    })
    setSaving(false)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4,
    display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid #e5e5e5', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw',
        boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          {isEdit ? t.editTitle : t.createTitle}
        </h2>

        {/* Pavadinimas */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t.nameLabel}</label>
          <input
            style={inputStyle} value={name} onChange={e => setName(e.target.value)}
            placeholder={t.namePlaceholder} autoFocus
          />
        </div>

        {/* Aprašymas */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t.descLabel}</label>
          <textarea
            style={{ ...inputStyle, height: 64, resize: 'vertical' }}
            value={desc} onChange={e => setDesc(e.target.value)}
          />
        </div>

        {/* Klientas + Terminas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>{t.clientLabel}</label>
            <select
              style={{ ...inputStyle, background: '#fff' }}
              value={clientId} onChange={e => setClientId(e.target.value)}
            >
              <option value="">—</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t.dueDateLabel}</label>
            <input type="date" style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Spalva */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>{t.colorLabel}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: 8, background: c,
                  border: color === c ? '3px solid #111' : '2px solid transparent',
                  cursor: 'pointer', transition: 'border 0.1s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Mygtukai */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave} disabled={saving || !name.trim()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: '#6c63ff', color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: !name.trim() ? 0.5 : 1,
            }}
          >
            {saving ? '...' : t.submit}
          </button>
          {isEdit && onArchive && (
            <button
              onClick={onArchive}
              style={{
                padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e5e5',
                background: '#fff', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              {t.archive}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e5e5',
              background: '#fff', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Komponentas: CalendarView ────────────────────────────────────────────────

function CalendarView({ tasks, projects, onTaskClick }: {
  tasks: Task[]
  projects: Project[]
  onTaskClick: (t: Task) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = (firstDay + 6) % 7 // Pirmadienis = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function tasksByDay(day: number): Task[] {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.due_date?.startsWith(key))
  }

  function projectsByDay(day: number): Project[] {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return projects.filter(p => p.due_date?.startsWith(key))
  }

  const monthNames = lt.calendar.months

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}
          style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}
        >
          {lt.calendar.prev}
        </button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{monthNames[month]} {year}</span>
        <button
          onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
          style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}
        >
          {lt.calendar.next}
        </button>
      </div>

      {/* Savaitės dienos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {lt.calendar.weekdays.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#aaa', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Ląstelės */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const dayTasks = day ? tasksByDay(day) : []
          const dayProjects = day ? projectsByDay(day) : []
          return (
            <div key={i} style={{
              minHeight: 88, borderRadius: 10, padding: 6,
              background: day ? '#fff' : '#f9f9f9',
              border: `1px solid ${isToday ? '#6c63ff' : '#f0f0f0'}`,
              opacity: day ? 1 : 0.3,
            }}>
              {day && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#6c63ff' : '#555', marginBottom: 4,
                  }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayProjects.map(p => (
                      <div key={p.id} style={{
                        fontSize: 11, padding: '2px 5px', borderRadius: 4,
                        background: p.color + '22', color: p.color,
                        fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        📁 {p.name}
                      </div>
                    ))}
                    {dayTasks.map(t => (
                      <div key={t.id}
                        onClick={() => onTaskClick(t)}
                        style={{
                          fontSize: 11, padding: '2px 5px', borderRadius: 4,
                          background: statusColor(t.status) + '22',
                          color: statusColor(t.status),
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Pagrindinis puslapis ─────────────────────────────────────────────────────

export default function AgencyTasksPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'company_name'>[]>([])
  const [members, setMembers] = useState<Pick<Profile, 'id' | 'full_name' | 'email'>[]>([])
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<View>('list')
  const [groupBy, setGroupBy] = useState<GroupBy>('project')
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  // pre-fill when clicking + in a group
  const [preselect, setPreselect] = useState<{ clientId?: string; projectId?: string } | null>(null)

  // ── Duomenų krovimas ────────────────────────────────────────────────────────

  const loadData = useCallback(async (agencyId: string) => {
    const [{ data: tasksData }, { data: projectsData }, { data: clientsData }, { data: membersData }] =
      await Promise.all([
        supabase
          .from('tasks')
          .select('*, project:projects(id,name,color), client:clients(id,company_name), assignee:profiles!assigned_to(id,full_name,email)')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('*, client:clients(id,company_name)')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('id, company_name')
          .eq('agency_id', agencyId)
          .order('company_name'),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('agency_id', agencyId)
          .in('role', ['agency_admin', 'agency_member']),
      ])
    setTasks((tasksData as Task[]) || [])
    setProjects((projectsData as Project[]) || [])
    setClients(clientsData || [])
    setMembers(membersData || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase
        .from('profiles')
        .select('*, agency:agencies(*)')
        .eq('id', user.id)
        .single()
      if (!p || !['agency_admin', 'agency_member'].includes(p.role)) {
        router.push('/login'); return
      }
      setProfile(p)
      await loadData(p.agency_id)
      setLoading(false)
    }
    init()
  }, [])

  // ── CRUD: Tasks ─────────────────────────────────────────────────────────────

  async function handleSaveTask(data: Partial<Task>) {
    if (!profile) return
    if (modal.type !== 'task') return

    if (modal.task) {
      // update
      await supabase.from('tasks').update(data).eq('id', modal.task.id)
    } else {
      // insert
      await supabase.from('tasks').insert({
        ...data,
        agency_id: profile.agency_id,
        type: 'agency_task',
        created_by: profile.id,
        // pre-fill from group click
        client_id: data.client_id ?? preselect?.clientId ?? null,
        project_id: data.project_id ?? preselect?.projectId ?? null,
      })
    }
    await loadData(profile.agency_id)
    setModal({ type: 'none' })
    setPreselect(null)
  }

  async function handleDeleteTask() {
    if (modal.type !== 'task' || !modal.task || !profile) return
    await supabase.from('tasks').delete().eq('id', modal.task.id)
    await loadData(profile.agency_id)
    setModal({ type: 'none' })
  }

  // ── CRUD: Projects ──────────────────────────────────────────────────────────

  async function handleSaveProject(data: Partial<Project>) {
    if (!profile) return
    if (modal.type !== 'project') return

    if (modal.project) {
      await supabase.from('projects').update(data).eq('id', modal.project.id)
    } else {
      await supabase.from('projects').insert({
        ...data,
        agency_id: profile.agency_id,
        created_by: profile.id,
      })
    }
    await loadData(profile.agency_id)
    setModal({ type: 'none' })
  }

  async function handleArchiveProject() {
    if (modal.type !== 'project' || !modal.project || !profile) return
    await supabase.from('projects').update({ status: 'archived' }).eq('id', modal.project.id)
    await loadData(profile.agency_id)
    setModal({ type: 'none' })
  }

  // ── Grupavimas ──────────────────────────────────────────────────────────────

  function getGroups() {
    if (groupBy === 'project') {
      const groups: { key: string; label: string; color?: string; tasks: Task[]; projectId?: string }[] = []

      // Projektai
      projects.filter(p => p.status === 'active').forEach(p => {
        groups.push({
          key: p.id,
          label: p.name + (p.client ? ` · ${p.client.company_name}` : ''),
          color: p.color,
          projectId: p.id,
          tasks: tasks.filter(t => t.project_id === p.id),
        })
      })

      // Be projekto
      const withoutProject = tasks.filter(t => !t.project_id)
      if (withoutProject.length > 0 || groups.length === 0) {
        groups.push({
          key: 'no-project',
          label: lt.agencyTasks.noProject,
          tasks: withoutProject,
        })
      }

      return groups
    } else {
      // groupBy === 'client'
      const groups: { key: string; label: string; clientId?: string; tasks: Task[] }[] = []

      clients.forEach(c => {
        const clientTasks = tasks.filter(t => t.client_id === c.id)
        groups.push({ key: c.id, label: c.company_name, clientId: c.id, tasks: clientTasks })
      })

      // Be kliento
      const withoutClient = tasks.filter(t => !t.client_id)
      if (withoutClient.length > 0) {
        groups.push({ key: 'no-client', label: lt.agencyTasks.noClient, tasks: withoutClient })
      }

      return groups
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>
  if (loading) return (
    <div style={{ display: 'flex' }}>
      <Sidebar role={profile.role} agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240, padding: '2rem' }}>{lt.common.loading}</div>
    </div>
  )

  const groups = getGroups()

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role={profile.role} agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />

      <div className="main-content" style={{ marginLeft: 240 }}>
        {/* Antraštė */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{lt.agencyTasks.title}</h1>

          <div style={{ display: 'flex', gap: 8 }}>
            {profile.role === 'agency_admin' && (
              <button
                onClick={() => setModal({ type: 'project' })}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: '1px solid #e5e5e5',
                  background: '#fff', color: '#555', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                {lt.agencyTasks.newProject}
              </button>
            )}
            <button
              onClick={() => { setPreselect(null); setModal({ type: 'task' }) }}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none',
                background: '#6c63ff', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              {lt.agencyTasks.newTask}
            </button>
          </div>
        </div>

        {/* View toggle + Group toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {/* View */}
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['list', 'calendar'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  background: view === v ? '#fff' : 'transparent',
                  color: view === v ? '#111' : '#999',
                  boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {v === 'list' ? lt.agencyTasks.listView : lt.agencyTasks.calendarView}
              </button>
            ))}
          </div>

          {/* Group by – tik list view */}
          {view === 'list' && (
            <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 10, padding: 3, gap: 2 }}>
              {(['project', 'client'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  style={{
                    padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                    background: groupBy === g ? '#fff' : 'transparent',
                    color: groupBy === g ? '#111' : '#999',
                    boxShadow: groupBy === g ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {g === 'project' ? lt.agencyTasks.groupByProject : lt.agencyTasks.groupByClient}
                </button>
              ))}
            </div>
          )}

          {/* Projekto edit mygtukai (list/project view) */}
          {view === 'list' && groupBy === 'project' && profile.role === 'agency_admin' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {projects.filter(p => p.status === 'active').map(p => (
                <button
                  key={p.id}
                  onClick={() => setModal({ type: 'project', project: p })}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${p.color}44`, background: `${p.color}11`, color: p.color,
                    fontWeight: 600,
                  }}
                  title="Redaguoti projektą"
                >
                  {p.name} ✏
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {view === 'list' ? (
          <div>
            {groups.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#ccc', fontSize: 15 }}>
                {lt.agencyTasks.noTasks}
              </div>
            ) : (
              groups.map(g => (
                <GroupSection
                  key={g.key}
                  label={g.label}
                  color={'color' in g ? g.color : undefined}
                  tasks={g.tasks}
                  onTaskClick={t => setModal({ type: 'task', task: t })}
                  onAddTask={() => {
                    setPreselect({
                      clientId: 'clientId' in g ? g.clientId : undefined,
                      projectId: 'projectId' in g ? g.projectId : undefined,
                    })
                    setModal({ type: 'task' })
                  }}
                />
              ))
            )}
          </div>
        ) : (
          <CalendarView
            tasks={tasks}
            projects={projects}
            onTaskClick={t => setModal({ type: 'task', task: t })}
          />
        )}
      </div>

      {/* Modals */}
      {modal.type === 'task' && (
        <TaskModal
          task={modal.task}
          clients={clients}
          projects={projects}
          members={members}
          agencyId={profile.agency_id}
          onClose={() => { setModal({ type: 'none' }); setPreselect(null) }}
          onSave={handleSaveTask}
          onDelete={modal.task ? handleDeleteTask : undefined}
        />
      )}
      {modal.type === 'project' && (
        <ProjectModal
          project={modal.project}
          clients={clients}
          agencyId={profile.agency_id}
          onClose={() => setModal({ type: 'none' })}
          onSave={handleSaveProject}
          onArchive={modal.project ? handleArchiveProject : undefined}
        />
      )}
    </div>
  )
}
