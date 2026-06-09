'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('Neteisingas el. paÅ¡tas arba slaptaÅ¾odis'); setLoading(false); return }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      router.push(profile?.role === 'agency_admin' ? '/dashboard' : '/client-home')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f7' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--brand-600)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>KlientÅ³ portalas</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Prisijunkite prie savo paskyros</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#444' }}>El. paÅ¡tas</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="vardas@imone.lt" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#444' }}>SlaptaÅ¾odis</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="â¢â¢â¢â¢â¢â¢â¢â¢" />
          </div>
          {error && <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 12px', borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '11px', fontSize: 15, marginTop: 4 }}>{loading ? 'Jungiamasi...' : 'Prisijungti'}</button>
        </form>
      </div>
    </div>
  )
}
