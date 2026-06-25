'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type InviteInfo = { company_name: string; agency_name: string; email: string | null }

export default function InvitePage() {
  const router = useRouter()
  const supabase = createClient()

  const [token, setToken] = useState<string | null>(null)
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const t = new URLSearchParams(window.location.search).get('token')
      if (!t) { setInvalid('Pakvietimo nuoroda neteisinga — trūksta tokeno.'); setLoading(false); return }
      setToken(t)
      const { data, error } = await supabase.rpc('get_invite', { p_token: t })
      const row = Array.isArray(data) ? data[0] : data
      if (error || !row) {
        setInvalid('Pakvietimas negalioja arba pasibaigė. Paprašyk agentūros naujos nuorodos.')
      } else {
        setInfo(row as InviteInfo)
        if ((row as InviteInfo).email) setEmail((row as InviteInfo).email as string)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !token) return
    setError('')
    if (password.length < 6) { setError('Slaptažodis turi būti bent 6 simbolių.'); return }
    if (password !== password2) { setError('Slaptažodžiai nesutampa.'); return }
    setSubmitting(true)

    // 1. Susikuriam paskyrą
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    if (signUpErr) {
      setError(signUpErr.message.includes('already registered')
        ? 'Šis el. paštas jau registruotas. Prisijunk per prisijungimo puslapį.'
        : 'Nepavyko susikurti paskyros: ' + signUpErr.message)
      setSubmitting(false); return
    }

    // 2. Užtikrinam sesiją (jei el. pašto patvirtinimas išjungtas — signUp jau grąžina sesiją)
    if (!signUpData.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInErr) {
        setError('Paskyra sukurta, bet reikia patvirtinti el. paštą prieš tęsiant. Patikrink pašto dėžutę.')
        setSubmitting(false); return
      }
    }

    // 3. Priimam pakvietimą — RPC nustato role/client_id/agency_id pagal tokeną (ne pagal vartotojo įvestį)
    const { error: acceptErr } = await supabase.rpc('accept_invite', { p_token: token })
    if (acceptErr) {
      setError('Nepavyko priimti pakvietimo: ' + acceptErr.message)
      setSubmitting(false); return
    }

    // 4. (neprivaloma) vardas profilyje
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user && fullName.trim()) {
      await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', authData.user.id)
    }

    router.push('/client-home')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f7' }}>
      <div style={{ color: '#888', fontSize: 14 }}>Kraunama...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f7', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        {invalid ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Pakvietimas negalioja</h1>
            <p style={{ color: '#888', fontSize: 14 }}>{invalid}</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <h1 style={{ fontSize: 22, fontWeight: 600 }}>Sveiki atvykę 👋</h1>
              <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>
                <strong>{info?.agency_name}</strong> kviečia tave į <strong>{info?.company_name}</strong> portalą.
                Susikurk slaptažodį ir pradėk.
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#444' }}>Vardas</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  placeholder="Vardas Pavardė" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#444' }}>El. paštas</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  placeholder="tu@imone.lt" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#444' }}>Slaptažodis</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  placeholder="Bent 6 simboliai" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#444' }}>Pakartok slaptažodį</label>
                <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  placeholder="••••••••" />
              </div>
              {error && (
                <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>{error}</div>
              )}
              <button type="submit" className="btn-primary" disabled={submitting}
                style={{ width: '100%', padding: '11px', fontSize: 15, marginTop: 4 }}>
                {submitting ? 'Kuriama...' : 'Sukurti paskyrą ir įeiti'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
