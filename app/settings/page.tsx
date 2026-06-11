'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'

const TABS = [
  { key: 'profile',   label: '👤 Profilis' },
  { key: 'agency',    label: '🏢 Agentūra' },
  { key: 'brand',     label: '🎨 Brand Hub' },
  { key: 'team',      label: '👥 Komanda' },
  { key: 'billing',   label: '💳 Planas' },
]

const BRAND_COLORS = [
  '#6c63ff', '#4338CA', '#E1306C', '#1877F2', '#0A66C2',
  '#16A34A', '#D97706', '#DC2626', '#000000', '#6B7280',
]

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [agencyWebsite, setAgencyWebsite] = useState('')

  // Brand hub
  const [brandColors, setBrandColors] = useState<string[]>(['#6c63ff', '#4338CA', '#1a1a2e'])
  const [brandVoice, setBrandVoice] = useState('Profesionali, draugiška, kūrybiška')
  const [brandFonts, setBrandFonts] = useState('Sora, Inter')

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
      setFullName(p.full_name || '')
      setAgencyName(p.agency?.name || '')
      setAgencyWebsite(p.agency?.website || '')

      // Load team (all profiles in same agency)
      const { data: teamData } = await supabase.from('profiles').select('*').eq('agency_id', p.agency_id)
      setTeam(teamData || [])
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  async function handleSaveProfile() {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)
    if (profile.agency_id) {
      await supabase.from('agencies').update({ name: agencyName }).eq('id', profile.agency_id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const roleLabel: Record<string, string> = {
    agency_admin: 'Administratorius',
    agency_member: 'Komandos narys',
    client: 'Klientas',
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role={profile.role} agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Nustatymai</h1>
          <p style={{ fontSize: 13, color: '#888' }}>Paskyros ir agentūros konfigūracija</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Sidebar tabs */}
          <div className="card" style={{ padding: '8px' }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400,
                  background: activeTab === tab.key ? '#EEF2FF' : 'transparent',
                  color: activeTab === tab.key ? '#4338CA' : '#555',
                  marginBottom: 2, transition: 'all 0.15s',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>

            {/* Profilis */}
            {activeTab === 'profile' && (
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1.25rem' }}>Asmeninė informacija</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Vardas ir pavardė</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>El. paštas</label>
                    <input value={profile.email || ''} disabled
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, background: '#fafafa', color: '#aaa' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Rolė</label>
                    <div style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, background: '#fafafa', color: '#555' }}>
                      {roleLabel[profile.role] || profile.role}
                    </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={saving}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: saved ? '#D1FAE5' : '#6c63ff', color: saved ? '#065F46' : '#fff', transition: 'background 0.3s', alignSelf: 'flex-start' }}>
                    {saved ? '✓ Išsaugota' : saving ? 'Saugoma...' : 'Išsaugoti'}
                  </button>
                </div>
              </div>
            )}

            {/* Agentūra */}
            {activeTab === 'agency' && (
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1.25rem' }}>Agentūros informacija</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Agentūros pavadinimas</label>
                    <input value={agencyName} onChange={e => setAgencyName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Subdomain</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <div style={{ padding: '9px 12px', borderRadius: '8px 0 0 8px', border: '1px solid #e0e0e0', borderRight: 'none', background: '#fafafa', fontSize: 13, color: '#aaa' }}>
                        portal.dar.lt/
                      </div>
                      <input value={profile.agency?.subdomain || ''} disabled
                        style={{ flex: 1, padding: '9px 12px', borderRadius: '0 8px 8px 0', border: '1px solid #e0e0e0', fontSize: 14, background: '#fafafa', color: '#555' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Svetainė</label>
                    <input value={agencyWebsite} onChange={e => setAgencyWebsite(e.target.value)} placeholder="https://"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none' }} />
                  </div>
                  <button onClick={handleSaveProfile} disabled={saving}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: saved ? '#D1FAE5' : '#6c63ff', color: saved ? '#065F46' : '#fff', transition: 'background 0.3s', alignSelf: 'flex-start' }}>
                    {saved ? '✓ Išsaugota' : saving ? 'Saugoma...' : 'Išsaugoti'}
                  </button>
                </div>
              </div>
            )}

            {/* Brand Hub */}
            {activeTab === 'brand' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card">
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1.25rem' }}>🎨 Brand Hub</h2>
                  <p style={{ fontSize: 13, color: '#888', marginBottom: '1.25rem' }}>
                    Centralizuotas agentūros brand'o valdymas. Spalvos ir balso kryptis bus naudojamos AI turinio generavimui.
                  </p>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 10 }}>Pagrindinės spalvos</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {brandColors.map((color, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: color, border: '2px solid #fff', boxShadow: '0 0 0 1px #e0e0e0', cursor: 'pointer' }} />
                        </div>
                      ))}
                      <div style={{ width: 36, height: 36, borderRadius: 9, border: '2px dashed #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#ccc', cursor: 'pointer' }}>+</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {BRAND_COLORS.map(c => (
                        <button key={c} onClick={() => setBrandColors(prev => [...prev.slice(0, 4), c])}
                          style={{ width: 24, height: 24, borderRadius: 6, background: c, border: '2px solid #fff', boxShadow: '0 0 0 1px #e0e0e0', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Brand Voice</label>
                    <p style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Apibūdinkite savo brand'o kalbos stilių — tai bus naudojama AI generuojant tekstus</p>
                    <textarea value={brandVoice} onChange={e => setBrandVoice(e.target.value)} rows={3}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Šriftai</label>
                    <input value={brandFonts} onChange={e => setBrandFonts(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, outline: 'none' }} />
                  </div>

                  {/* Preview */}
                  <div style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', border: '1px solid #C7D2FE', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4338CA', marginBottom: 8 }}>Brand peržiūra</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {brandColors.map((c, i) => (
                        <div key={i} style={{ width: 20, height: 20, borderRadius: 5, background: c }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>"{brandVoice}"</div>
                  </div>
                </div>
              </div>
            )}

            {/* Komanda */}
            {activeTab === 'team' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700 }}>👥 Komandos nariai</h2>
                  <button style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#6c63ff', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    + Pakviesti
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {team.map(member => (
                    <div key={member.id} style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #f0f0f0', background: '#fafafa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#4338CA', flexShrink: 0 }}>
                          {(member.full_name || member.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.full_name || '(be vardo)'}
                          </div>
                          <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: member.role === 'agency_admin' ? '#EEF2FF' : '#F3F4F6', color: member.role === 'agency_admin' ? '#4338CA' : '#6B7280', fontWeight: 600 }}>
                          {roleLabel[member.role] || member.role}
                        </span>
                        {member.id !== profile.id && (
                          <button style={{ fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Pašalinti</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Billing */}
            {activeTab === 'billing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card">
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1rem' }}>💳 Dabartinis planas</h2>
                  <div style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', border: '1px solid #C7D2FE', borderRadius: 12, padding: '20px 24px', marginBottom: '1rem' }}>
                    <div style={{ fontSize: 12, color: '#6366F1', fontWeight: 700, marginBottom: 4 }}>DABARTINIS PLANAS</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>Agency</div>
                    <div style={{ fontSize: 13, color: '#6366F1' }}>Visas funkcionalumas · Iki 20 klientų</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { name: 'Solo', price: '€29/mėn', desc: 'Turinys, failai, ataskaitos' },
                      { name: 'Freelancer', price: '€59/mėn', desc: '+ Tikslai, klientai, užduotys' },
                      { name: 'Agency', price: '€99/mėn', desc: '+ Komanda, Brand Hub, chat' },
                    ].map(plan => (
                      <div key={plan.name} style={{ padding: '16px', borderRadius: 10, border: `2px solid ${plan.name === 'Agency' ? '#6c63ff' : '#f0f0f0'}`, background: plan.name === 'Agency' ? '#EEF2FF' : '#fff', textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#6c63ff', marginBottom: 6 }}>{plan.price}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{plan.desc}</div>
                        {plan.name !== 'Agency' && (
                          <button style={{ marginTop: 10, padding: '5px 14px', borderRadius: 8, border: '1px solid #6c63ff', background: 'transparent', color: '#6c63ff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Pereiti
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

const roleLabel: Record<string, string> = {
  agency_admin: 'Administratorius',
  agency_member: 'Komandos narys',
  client: 'Klientas',
}
