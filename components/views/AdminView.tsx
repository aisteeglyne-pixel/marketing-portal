'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { clientColor, clientInitials } from '@/lib/portal-helpers'
import type { Client, ContentPost } from '@/types'

interface AdminViewProps {
  profile: any
  clients: Client[]
  team: any[]
  posts: ContentPost[]
  onOpenClient: (client: Client) => void
  onClientCreated: (client: Client) => void
  onClientUpdated: (client: Client) => void
  onClientDeleted: (clientId: string) => void
  onTeamUpdated: (member: any) => void
  showToast: (msg: string) => void
}

type AdminTab = 'clients' | 'team' | 'invite' | 'new-client' | 'permissions'

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: '📸', Facebook: '📘', LinkedIn: '💼', TikTok: '🎵', X: '✖️', YouTube: '▶️',
}

const ROLE_PERMS: Record<string, Record<string, boolean>> = {
  Admin:      { calendar: true, posts: true, approvals: true, analytics: true, clients: true, team: true, admin: true },
  Manager:    { calendar: true, posts: true, approvals: true, analytics: true, clients: true, team: false, admin: false },
  Designer:   { calendar: true, posts: true, approvals: false, analytics: false, clients: false, team: false, admin: false },
  Copywriter: { calendar: true, posts: true, approvals: false, analytics: false, clients: false, team: false, admin: false },
}

const PERM_LABELS: Record<string, string> = {
  calendar: 'Kalendorius', posts: 'Įrašai', approvals: 'Patvirtinimai',
  analytics: 'Analitika', clients: 'Klientų erdvės', team: 'Komandos valdymas', admin: 'Admin skyrius',
}

export default function AdminView({ profile, clients, team, posts, onOpenClient, onClientCreated, onClientUpdated, onClientDeleted, onTeamUpdated, showToast }: AdminViewProps) {
  const supabase = createClient()
  const [tab, setTab] = useState<AdminTab>('clients')
  // Naujas klientas
  const [ncName, setNcName] = useState('')
  const [ncPlatforms, setNcPlatforms] = useState<string[]>([])
  const [ncSaving, setNcSaving] = useState(false)
  // Pakvietimas
  const [invClient, setInvClient] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [invSaving, setInvSaving] = useState(false)
  const [invLink, setInvLink] = useState('')

  const TABS: [AdminTab, string][] = [
    ['clients', '🏢 Klientai'],
    ['team', '👥 Komanda'],
    ['invite', '📨 Pakviesti'],
    ['new-client', '➕ Naujas projektas'],
    ['permissions', '🔐 Teisės'],
  ]

  async function createNewClient() {
    const name = ncName.trim()
    if (!name) { showToast('⚠️ Įvesk brendo pavadinimą'); return }
    setNcSaving(true)
    const { data, error } = await supabase.from('clients').insert({
      agency_id: profile.agency_id,
      company_name: name,
      social_channels: ncPlatforms,
    }).select().single()
    setNcSaving(false)
    if (error) { showToast('⚠️ Nepavyko sukurti: ' + error.message); return }
    onClientCreated(data)
    setNcName(''); setNcPlatforms([])
    showToast(`✅ Klientas „${name}" sukurtas`)
    setTab('clients')
  }

  async function renameClient(c: Client) {
    const name = prompt('Naujas kliento pavadinimas:', c.company_name)
    if (!name || name.trim() === c.company_name) return
    const { data, error } = await supabase.from('clients').update({ company_name: name.trim() }).eq('id', c.id).select().single()
    if (error) { showToast('⚠️ ' + error.message); return }
    onClientUpdated(data)
    showToast('💾 Pervadinta')
  }

  async function removeClient(c: Client) {
    const postCount = posts.filter(p => p.client_id === c.id).length
    if (!confirm(`Pašalinti klientą „${c.company_name}"?${postCount > 0 ? ` Jis turi ${postCount} įrašų — jie liks be kliento arba šalinimas gali nepavykti.` : ''} Šio veiksmo atšaukti negalima.`)) return
    const { error } = await supabase.from('clients').delete().eq('id', c.id)
    if (error) { showToast('⚠️ Nepavyko pašalinti: ' + error.message); return }
    onClientDeleted(c.id)
    showToast('🗑️ Klientas pašalintas')
  }

  async function toggleRole(m: any) {
    const newRole = m.role === 'agency_admin' ? 'agency_member' : 'agency_admin'
    if (m.id === profile.id) { showToast('⚠️ Savo rolės keisti negalima'); return }
    const { data, error } = await supabase.from('profiles').update({ role: newRole }).eq('id', m.id).select().single()
    if (error) { showToast('⚠️ ' + error.message); return }
    onTeamUpdated(data)
    showToast(`🎭 Rolė pakeista: ${newRole === 'agency_admin' ? 'Admin' : 'Manager'}`)
  }

  async function toggleActive(m: any) {
    if (m.id === profile.id) { showToast('⚠️ Savęs deaktyvuoti negalima'); return }
    const { data, error } = await supabase.from('profiles').update({ is_active: !m.is_active }).eq('id', m.id).select().single()
    if (error) { showToast('⚠️ ' + error.message); return }
    onTeamUpdated(data)
    showToast(data.is_active ? '✅ Narys aktyvuotas' : '🚫 Narys deaktyvuotas')
  }

  async function sendInvite() {
    if (!invClient) { showToast('⚠️ Pasirink klientą'); return }
    if (invSaving) return
    setInvSaving(true)
    setInvLink('')
    const { data, error } = await supabase.from('client_invites').insert({
      agency_id: profile.agency_id,
      client_id: invClient,
      email: invEmail.trim() || null,
    }).select('token').single()
    setInvSaving(false)
    if (error || !data) { showToast('⚠️ ' + (error?.message || 'Nepavyko sukurti pakvietimo')); return }
    const link = `${window.location.origin}/invite?token=${data.token}`
    setInvLink(link)
    navigator.clipboard?.writeText(link).catch(() => {})
    showToast('🔗 Pakvietimo nuoroda paruošta ir nukopijuota')
  }

  const agencyTeam = team.filter(m => m.role !== 'client')

  return (
    <div className="view active" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 26 }}>⚙️</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Admin valdymas</div>
          <div className="text-muted" style={{ fontSize: 12 }}>Tik Admin rolės nariai mato šią sekciją</div>
        </div>
      </div>

      {/* Tab'ai */}
      <div className="approvals-tabs" style={{ marginTop: 16 }}>
        {TABS.map(([key, label]) => (
          <div key={key} className={`approval-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {/* ===== KLIENTAI ===== */}
      {tab === 'clients' && (
        <div>
          <div className="admin-section-hd" style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 10px' }}>Visi klientai ({clients.length})</div>
          {clients.map(c => {
            const color = clientColor(c.company_name)
            const postCount = posts.filter(p => p.client_id === c.id).length
            return (
              <div key={c.id} className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 8 }}>
                <div className="admin-card-avatar" style={{ width: 38, height: 38, borderRadius: 10, background: color, color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{clientInitials(c.company_name)}</div>
                <div className="admin-card-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="admin-card-name" style={{ fontSize: 13, fontWeight: 700 }}>{c.company_name}</div>
                  <div className="admin-card-sub" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {(c.social_channels || []).length} platformos · <span style={{ color: 'var(--primary)' }}>{postCount} įrašai</span>
                  </div>
                </div>
                <div className="admin-card-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => onOpenClient(c)}>Atidaryti</button>
                  <button className="btn btn-sm btn-outline" style={{ color: 'var(--primary)' }} onClick={() => renameClient(c)}>✏️ Redaguoti</button>
                  <button className="btn btn-sm" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none' }} onClick={() => removeClient(c)}>🗑 Pašalinti</button>
                </div>
              </div>
            )
          })}
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setTab('new-client')}>➕ Pridėti naują klientą</button>
        </div>
      )}

      {/* ===== KOMANDA ===== */}
      {tab === 'team' && (
        <div>
          <div className="admin-section-hd" style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 10px' }}>Komandos nariai ({agencyTeam.length})</div>
          {agencyTeam.map(m => {
            const isAdmin = m.role === 'agency_admin'
            const isSelf = m.id === profile.id
            return (
              <div key={m.id} className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 8, opacity: m.is_active === false ? 0.5 : 1 }}>
                <div className="admin-card-avatar" style={{ width: 38, height: 38, borderRadius: '50%', background: clientColor(m.email || ''), color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(m.full_name || m.email || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="admin-card-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="admin-card-name" style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.full_name || m.email}
                    <span className="admin-role-badge" style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: isAdmin ? '#FF68D822' : '#BE185D22', color: isAdmin ? '#FF68D8' : '#BE185D' }}>{isAdmin ? 'Admin' : 'Manager'}</span>
                    {m.is_active === false && <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>Neaktyvus</span>}
                  </div>
                  <div className="admin-card-sub" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>
                </div>
                <div className="admin-card-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => toggleRole(m)}>🎭 Keisti rolę</button>
                  {isSelf
                    ? <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Tu pats</span>
                    : <button className="btn btn-sm" style={{ background: m.is_active === false ? '#D1FAE5' : '#FEE2E2', color: m.is_active === false ? '#065F46' : '#DC2626', border: 'none' }} onClick={() => toggleActive(m)}>{m.is_active === false ? 'Aktyvuoti' : 'Deaktyvuoti'}</button>}
                </div>
              </div>
            )
          })}
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setTab('invite')}>➕ Pakviesti komandos narį</button>
        </div>
      )}

      {/* ===== PAKVIESTI ===== */}
      {tab === 'invite' && (
        <div style={{ maxWidth: 520 }}>
          <div className="admin-section-hd" style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 10px' }}>Pakviesti klientą į portalą</div>
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 22 }}>
            <div className="form-group">
              <label className="form-label">Klientas</label>
              <select className="select-box" style={{ width: '100%' }} value={invClient} onChange={e => setInvClient(e.target.value)}>
                <option value="">— Pasirinkite klientą —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">El. paštas <span className="text-muted" style={{ fontWeight: 400 }}>(neprivaloma)</span></label>
              <input className="form-input" value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="klientas@imone.lt" />
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
              🔗 Sukursime unikalią pakvietimo nuorodą (galioja 14 d.). Nukopijuok ją ir nusiųsk klientui — atidaręs jis susikurs slaptažodį ir matys tik savo erdvę.
            </div>
            <button className="btn btn-primary" disabled={invSaving} onClick={sendInvite}>{invSaving ? '⏳ Kuriama...' : '🔗 Sukurti pakvietimo nuorodą'}</button>

            {invLink && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>✅ Nuoroda paruošta — nusiųsk klientui</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ flex: 1, fontSize: 11, background: 'var(--bg)', padding: '8px 10px', borderRadius: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invLink}</code>
                  <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard?.writeText(invLink); showToast('📋 Nuoroda nukopijuota') }}>Kopijuoti</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== NAUJAS KLIENTAS ===== */}
      {tab === 'new-client' && (
        <div style={{ maxWidth: 560 }}>
          <div className="admin-section-hd" style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 10px' }}>Naujas kliento projektas</div>
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div className="form-label">1. Brendo pavadinimas *</div>
              <input className="form-input" value={ncName} onChange={e => setNcName(e.target.value)} placeholder="pvz. NewBrand, StartupLT, CaféMia..." style={{ marginTop: 5 }} />
            </div>
            <div>
              <div className="form-label">2. Platformos</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {Object.entries(PLATFORM_ICONS).map(([p, icon]) => {
                  const sel = ncPlatforms.includes(p)
                  return (
                    <label key={p} onClick={() => setNcPlatforms(prev => sel ? prev.filter(x => x !== p) : [...prev, p])}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: sel ? 'var(--primary)' : 'var(--surface)', color: sel ? '#fff' : 'var(--text)', transition: 'all 0.15s' }}>
                      {icon} {p}
                    </label>
                  )
                })}
              </div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              💡 Komandos priskyrimas ir projekto spalva — kitame atnaujinime.
            </div>
            <button className="btn btn-primary" disabled={ncSaving} onClick={createNewClient}>{ncSaving ? '⏳ Kuriama...' : '➕ Sukurti klientą'}</button>
          </div>
        </div>
      )}

      {/* ===== TEISĖS ===== */}
      {tab === 'permissions' && (
        <div>
          <div className="admin-section-hd" style={{ fontSize: 13, fontWeight: 700, margin: '14px 0 10px' }}>Rolių teisės</div>
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>Teisė</th>
                  {Object.keys(ROLE_PERMS).map(r => <th key={r} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERM_LABELS).map(([key, label], ri) => (
                  <tr key={key} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>{label}</td>
                    {Object.keys(ROLE_PERMS).map(role => (
                      <td key={role} style={{ textAlign: 'center', padding: '10px 16px' }}>
                        <span style={{ fontSize: 16 }}>{ROLE_PERMS[role][key] ? '✅' : '—'}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#92400E' }}>
            💡 Teisių redagavimas bus galimas kitame atnaujinime. Šiuo metu teisės nustatytos pagal rolę.
          </div>
        </div>
      )}
    </div>
  )
}
