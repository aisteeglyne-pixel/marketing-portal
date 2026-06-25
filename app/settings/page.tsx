'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Agentūra
  const [agName, setAgName] = useState('')
  const [agColor, setAgColor] = useState('#FF68D8')
  const [agLogo, setAgLogo] = useState<string | null>(null)
  const [agSaving, setAgSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  // Vartotojas
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [profSaving, setProfSaving] = useState(false)

  // Slaptažodis
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const isAdmin = profile?.role === 'agency_admin'

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }
      setProfile(p)
      setFullName(p.full_name || '')
      setEmail(user.email || '')
      if (p.agency) {
        setAgName(p.agency.name || '')
        setAgColor(p.agency.primary_color || '#FF68D8')
        setAgLogo(p.agency.logo_url || null)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('⚠️ Tik paveikslėliai'); return }
    setLogoUploading(true)
    const path = `logos/${profile.agency_id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    const { error } = await supabase.storage.from('client-files').upload(path, file)
    if (error) { showToast('⚠️ ' + error.message); setLogoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
    setAgLogo(publicUrl)
    setLogoUploading(false)
    showToast('🖼️ Logo įkeltas — nepamiršk išsaugoti')
  }

  async function saveAgency() {
    if (agSaving) return
    setAgSaving(true)
    const { error } = await supabase.from('agencies')
      .update({ name: agName.trim(), primary_color: agColor, logo_url: agLogo })
      .eq('id', profile.agency_id)
    setAgSaving(false)
    showToast(error ? '⚠️ ' + error.message : '✅ Agentūros nustatymai išsaugoti')
  }

  async function saveProfile() {
    if (profSaving) return
    setProfSaving(true)
    const { error: nameErr } = await supabase.rpc('update_my_full_name', { p_name: fullName })
    let emailErr: string | null = null
    const { data: authData } = await supabase.auth.getUser()
    const emailChanged = !!email.trim() && email.trim() !== authData.user?.email
    if (authData.user && emailChanged) {
      const { error } = await supabase.auth.updateUser({ email: email.trim() })
      if (error) emailErr = error.message
    }
    setProfSaving(false)
    if (nameErr) { showToast('⚠️ ' + nameErr.message); return }
    if (emailErr) { showToast('⚠️ El. paštas: ' + emailErr); return }
    showToast(emailChanged
      ? '✅ Išsaugota. El. pašto pakeitimą reikia patvirtinti laiške.'
      : '✅ Profilis išsaugotas')
  }

  async function savePassword() {
    if (pwSaving) return
    if (pw1.length < 6) { showToast('⚠️ Bent 6 simboliai'); return }
    if (pw1 !== pw2) { showToast('⚠️ Slaptažodžiai nesutampa'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setPwSaving(false)
    if (error) { showToast('⚠️ ' + error.message); return }
    setPw1(''); setPw2('')
    showToast('🔒 Slaptažodis pakeistas')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Kraunama...</div>
    </div>
  )

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 18 }
  const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '28px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <button className="btn btn-ghost" onClick={() => router.push(isAdmin ? '/dashboard' : '/client-home')}>← Atgal</button>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Nustatymai</h1>
        </div>

        {isAdmin && (
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🏢 Agentūros profilis</div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Pavadinimas</label>
              <input style={input} value={agName} onChange={e => setAgName(e.target.value)} placeholder="Agentūros pavadinimas" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Brand spalva</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={agColor} onChange={e => setAgColor(e.target.value)}
                  style={{ width: 46, height: 38, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                <input style={{ ...input, maxWidth: 140 }} value={agColor} onChange={e => setAgColor(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={label}>Logotipas</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {agLogo
                  ? <img src={agLogo} alt="logo" style={{ height: 40, maxWidth: 160, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 4 }} />
                  : <div style={{ height: 40, width: 40, borderRadius: 8, background: 'var(--bg)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🖼️</div>}
                <button className="btn btn-outline btn-sm" disabled={logoUploading} onClick={() => logoRef.current?.click()}>{logoUploading ? '⏳ Keliama...' : 'Įkelti logo'}</button>
                {agLogo && <button className="btn btn-ghost btn-sm" onClick={() => setAgLogo(null)}>Pašalinti</button>}
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
              </div>
            </div>
            <button className="btn btn-primary" disabled={agSaving} onClick={saveAgency}>{agSaving ? '⏳' : '💾'} Išsaugoti agentūrą</button>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>👤 Mano profilis</div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Vardas</label>
            <input style={input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Vardas Pavardė" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>El. paštas</label>
            <input type="email" style={input} value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={profSaving} onClick={saveProfile}>{profSaving ? '⏳' : '💾'} Išsaugoti profilį</button>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🔒 Slaptažodis</div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Naujas slaptažodis</label>
            <input type="password" style={input} value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Bent 6 simboliai" />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={label}>Pakartok</label>
            <input type="password" style={input} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" disabled={pwSaving} onClick={savePassword}>{pwSaving ? '⏳' : '🔒'} Keisti slaptažodį</button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1E181C', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
