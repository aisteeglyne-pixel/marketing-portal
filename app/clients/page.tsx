'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X', 'YouTube']

export default function ClientsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    channels: [] as string[],
  })
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
    }
    load()
  }, [])

  function toggleChannel(ch: string) {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter(c => c !== ch)
        : [...f.channels, ch],
    }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { data, error: err } = await supabase.from('clients').insert({
      agency_id: profile.agency_id,
      company_name: form.company_name.trim(),
      social_channels: form.channels,
      buffer_token: null,
      logo_url: null,
    }).select().single()

    if (err) {
      setError('Klaida kuriant klientą. Bandykite dar kartą.')
      setSubmitting(false)
      return
    }

    // Nukreipti į naują kliento puslapį
    router.push(`/clients/${data.id}`)
  }

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role={profile.role} agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        {!showForm ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '60vh', color: '#bbb', gap: 16,
          }}>
            <span style={{ fontSize: 40 }}>👥</span>
            <p style={{ fontSize: 15 }}>{lt.clients.selectPrompt}</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + {lt.clients.newClient}
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: 22, fontWeight: 600 }}>+ {lt.clients.newClient}</h1>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa' }}>✕</button>
            </div>

            <div className="card">
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Įmonės pavadinimas</label>
                  <input
                    value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="UAB Pavyzdys"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{lt.clients.channels}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {PLATFORMS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleChannel(p)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                          border: `1px solid ${form.channels.includes(p) ? 'var(--brand-600)' : '#e5e5e5'}`,
                          background: form.channels.includes(p) ? 'var(--brand-600)' : '#fff',
                          color: form.channels.includes(p) ? '#fff' : '#555',
                          fontWeight: form.channels.includes(p) ? 600 : 400,
                        }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div style={{ fontSize: 13, color: '#791F1F', background: '#FCEBEB', padding: '10px 14px', borderRadius: 8 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Kuriama...' : 'Sukurti klientą'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    {lt.common.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#666',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
