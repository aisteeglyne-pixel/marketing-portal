'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Client, ClientBrand, BrandFont, BrandPillar, FileRecord } from '@/types'

interface Props {
  client: Client
  profile: any
  brand: ClientBrand | null
  files: FileRecord[]
  role: 'agency' | 'client'
  preview?: boolean
  onBrandChange: (b: ClientBrand) => void
  onFilesChange: (files: FileRecord[]) => void
  showToast: (msg: string) => void
}

interface Form {
  industry: string
  audience: string
  website: string
  voice: string
  colors: string[]
  fonts: BrandFont[]
  hashtags: string[]
  pillars: BrandPillar[]
}

function toForm(b: ClientBrand | null): Form {
  return {
    industry: b?.industry || '',
    audience: b?.audience || '',
    website: b?.website || '',
    voice: b?.voice || '',
    colors: b?.colors || [],
    fonts: b?.fonts || [],
    hashtags: b?.hashtags || [],
    pillars: b?.pillars || [],
  }
}

const OwnerTag = ({ who }: { who: 'client' | 'agency' }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginLeft: 8,
    background: who === 'client' ? '#E0F2FE' : '#F3E8FF',
    color: who === 'client' ? '#075985' : '#6B21A8',
  }}>
    {who === 'client' ? 'Klientas pildo' : 'Agentūra valdo'}
  </span>
)

export default function ClientBrandView({ client, profile, brand, files, role, preview = false, onBrandChange, onFilesChange, showToast }: Props) {
  const supabase = createClient()
  const [form, setForm] = useState<Form>(toForm(brand))
  const [newTag, setNewTag] = useState('')
  const [newColor, setNewColor] = useState('#FF68D8')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canEditClient = !preview
  const canEditStrategy = role === 'agency' && !preview
  const agencyId = client.agency_id

  const brandFiles = files.filter(f => f.client_id === client.id && f.file_type === 'brand')

  // Onboarding pažanga (kliento intake laukai)
  const steps = [
    { ok: !!form.industry.trim(), label: 'Veiklos sritis' },
    { ok: !!form.audience.trim(), label: 'Auditorija' },
    { ok: !!form.website.trim(), label: 'Svetainė' },
    { ok: !!form.voice.trim(), label: 'Brand balsas' },
    { ok: form.colors.length > 0, label: 'Spalvos' },
    { ok: form.fonts.length > 0, label: 'Šriftai' },
    { ok: form.hashtags.length > 0, label: 'Hashtagai' },
    { ok: brandFiles.length > 0, label: 'Failai' },
  ]
  const done = steps.filter(s => s.ok).length
  const pct = Math.round((done / steps.length) * 100)

  async function persist(next: Form) {
    const { data, error } = await supabase.from('client_brands').upsert({
      agency_id: agencyId,
      client_id: client.id,
      industry: next.industry.trim() || null,
      audience: next.audience.trim() || null,
      website: next.website.trim() || null,
      voice: next.voice.trim() || null,
      colors: next.colors,
      fonts: next.fonts,
      hashtags: next.hashtags,
      pillars: next.pillars,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' }).select().single()
    if (error) { showToast('⚠️ Nepavyko išsaugoti: ' + error.message); return }
    if (data) onBrandChange(data as ClientBrand)
  }

  // tekstiniai laukai: keičiam lokaliai, saugom prarandant fokusą
  const setField = (k: keyof Form, v: string) => setForm(prev => ({ ...prev, [k]: v }))
  const saveField = () => { if (canEditClient) persist(form) }

  // masyvai: keičiam ir saugom iškart
  function commit(next: Form) { setForm(next); persist(next) }

  function addColor() {
    if (!canEditClient || !newColor) return
    if (form.colors.includes(newColor)) return
    commit({ ...form, colors: [...form.colors, newColor] })
  }
  function removeColor(c: string) {
    if (!canEditClient) return
    commit({ ...form, colors: form.colors.filter(x => x !== c) })
  }
  function copyColor(c: string) { navigator.clipboard?.writeText(c); showToast('🎨 Nukopijuota: ' + c) }

  function addHashtag() {
    if (!canEditClient) return
    const t = newTag.trim()
    if (!t) return
    const tag = t.startsWith('#') ? t : '#' + t
    if (!form.hashtags.includes(tag)) commit({ ...form, hashtags: [...form.hashtags, tag] })
    setNewTag('')
  }
  function removeHashtag(h: string) {
    if (!canEditClient) return
    commit({ ...form, hashtags: form.hashtags.filter(x => x !== h) })
  }

  function addFont() {
    if (!canEditClient) return
    const name = prompt('Šrifto pavadinimas (pvz. Sora):')
    if (!name) return
    const usage = prompt('Kam naudojamas? (pvz. Antraštės):') || ''
    commit({ ...form, fonts: [...form.fonts, { name: name.trim(), usage: usage.trim() }] })
  }
  function removeFont(i: number) {
    if (!canEditClient) return
    commit({ ...form, fonts: form.fonts.filter((_, idx) => idx !== i) })
  }

  function addPillar() {
    if (!canEditStrategy) return
    const name = prompt('Naujo turinio ramsčio pavadinimas:')
    if (!name) return
    commit({ ...form, pillars: [...form.pillars, { emoji: '📌', name: name.trim(), color: '#FF68D8' }] })
  }
  function removePillar(i: number) {
    if (!canEditStrategy) return
    commit({ ...form, pillars: form.pillars.filter((_, idx) => idx !== i) })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    setUploading(true)
    const newRecs: FileRecord[] = []
    for (const file of selected) {
      const ext = file.name.split('.').pop()
      const rnd = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${client.id}/brand/${rnd}`
      const { data: upload, error } = await supabase.storage.from('client-files').upload(path, file)
      if (!error && upload) {
        const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
        const { data: rec } = await supabase.from('files').insert({
          agency_id: agencyId, client_id: client.id,
          file_name: file.name, file_url: publicUrl, file_type: 'brand',
          folder: 'Brand', uploaded_by: profile.id, uploaded_date: new Date().toISOString(),
        }).select().single()
        if (rec) newRecs.push(rec)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (newRecs.length) { onFilesChange([...newRecs, ...files]); showToast(`✅ Įkelta: ${newRecs.length}`) }
    else showToast('⚠️ Nepavyko įkelti')
  }

  const inputStyle = { width: '100%', fontFamily: 'inherit' as const }

  return (
    <div className="view active">
      {/* Onboarding pažanga */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>Brand paruošimas</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {role === 'client'
                ? 'Užpildyk savo brand informaciją — taip agentūra dirbs tiksliau nuo pirmos dienos.'
                : 'Kliento brand intake. Trūkstamus laukus gali užpildyti klientas arba jūs kartu.'}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: pct === 100 ? 'var(--success)' : 'var(--primary)' }}>{pct}%</div>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: 'var(--bg)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--primary)', transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {steps.map(s => (
            <span key={s.label} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: s.ok ? '#D1FAE5' : 'var(--bg)', color: s.ok ? '#065F46' : 'var(--text-muted)',
            }}>
              {s.ok ? '✓' : '○'} {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="brand-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Pagrindai */}
        <div className="card">
          <div className="section-title">Pagrindai <OwnerTag who="client" /></div>
          <label className="text-muted" style={{ fontSize: 12, display: 'block', marginTop: 8, marginBottom: 4 }}>Veiklos sritis</label>
          <input className="form-input" style={inputStyle} value={form.industry} disabled={!canEditClient}
            placeholder="pvz. Elektroninė prekyba, mada"
            onChange={e => setField('industry', e.target.value)} onBlur={saveField} />
          <label className="text-muted" style={{ fontSize: 12, display: 'block', marginTop: 10, marginBottom: 4 }}>Tikslinė auditorija</label>
          <input className="form-input" style={inputStyle} value={form.audience} disabled={!canEditClient}
            placeholder="pvz. 25–40 m. moterys Lietuvoje"
            onChange={e => setField('audience', e.target.value)} onBlur={saveField} />
          <label className="text-muted" style={{ fontSize: 12, display: 'block', marginTop: 10, marginBottom: 4 }}>Svetainė</label>
          <input className="form-input" style={inputStyle} value={form.website} disabled={!canEditClient}
            placeholder="https://"
            onChange={e => setField('website', e.target.value)} onBlur={saveField} />
        </div>

        {/* Brand balsas */}
        <div className="card">
          <div className="section-title">Brand balsas <OwnerTag who="client" /></div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>Trumpai aprašyk komunikacijos toną — komanda perskaitys prieš rašydama turinį.</p>
          <textarea className="form-input" rows={6} value={form.voice} disabled={!canEditClient}
            placeholder="pvz. Profesionali, šilta, kūrybiška. Kalbame tiesiogiai ir aiškiai, vengdami korporatyvinio žargono."
            style={{ ...inputStyle, resize: 'vertical' }}
            onChange={e => setField('voice', e.target.value)} onBlur={saveField} />
        </div>

        {/* Spalvos + Šriftai */}
        <div className="card">
          <div className="section-title">Brand spalvos <OwnerTag who="client" /></div>
          <div className="color-swatches" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {form.colors.map(c => (
              <div key={c} style={{ position: 'relative' }}>
                <div className="swatch" style={{ width: 38, height: 38, borderRadius: 9, background: c, cursor: 'pointer', border: '1px solid var(--border)' }}
                  title={c} onClick={() => copyColor(c)} />
                {canEditClient && (
                  <button onClick={() => removeColor(c)} title="Pašalinti"
                    style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', border: 'none', background: '#1E181C', color: '#fff', fontSize: 10, cursor: 'pointer', lineHeight: '16px', padding: 0 }}>×</button>
                )}
              </div>
            ))}
            {form.colors.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>Spalvų dar nėra</span>}
          </div>
          {canEditClient && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                style={{ width: 38, height: 34, padding: 0, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} />
              <button className="btn btn-outline btn-sm" onClick={addColor}>+ Pridėti spalvą</button>
            </div>
          )}

          <div className="section-title" style={{ marginTop: 20 }}>Šriftai</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {form.fonts.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{f.name}</span>
                {f.usage && <span className="text-muted" style={{ fontSize: 12 }}>{f.usage}</span>}
                {canEditClient && <button className="btn btn-ghost btn-sm" onClick={() => removeFont(i)}>🗑️</button>}
              </div>
            ))}
            {form.fonts.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>Šriftų dar nėra</span>}
          </div>
          {canEditClient && <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={addFont}>+ Pridėti šriftą</button>}
        </div>

        {/* Hashtagai */}
        <div className="card">
          <div className="section-title">Hashtagai <OwnerTag who="client" /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {form.hashtags.map(h => (
              <span key={h} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary-dark)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ cursor: 'pointer' }} title="Spausk — nukopijuos" onClick={() => { navigator.clipboard?.writeText(h); showToast('📋 ' + h) }}>{h}</span>
                {canEditClient && <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => removeHashtag(h)}>×</span>}
              </span>
            ))}
            {form.hashtags.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>Hashtagų dar nėra</span>}
          </div>
          {canEditClient && (
            <input className="form-input" style={{ marginTop: 10 }} placeholder="Pridėti hashtag ir spausk Enter"
              value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHashtag()} />
          )}
        </div>

        {/* Kliento failai */}
        <div className="card">
          <div className="section-title">Kliento failai <OwnerTag who="client" /></div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>Logotipai, brand gairės, esama medžiaga — viskas, ką turi.</p>
          {brandFiles.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
              {brandFiles.map(file => (
                <a key={file.id} href={file.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', padding: 12, background: 'var(--bg)', borderRadius: 9, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🎨</div>
                  <div style={{ fontSize: 12, fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.3 }}>{file.file_name}</div>
                </a>
              ))}
            </div>
          )}
          {canEditClient ? (
            <>
              <input ref={fileRef} type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>⬆️</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{uploading ? 'Keliama...' : 'Įkelti failus'}</div>
              </div>
            </>
          ) : brandFiles.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>Failų dar nėra</span>}
        </div>

        {/* Turinio ramsčiai — strategija, agentūros nuosavybė */}
        <div className="card">
          <div className="section-title">Turinio ramsčiai <OwnerTag who="agency" /></div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>Pasikartojančios turinio temos strategijos nuoseklumui. {role === 'client' && 'Šią dalį kuria agentūra.'}</p>
          {form.pillars.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${p.color}` }}>
              <span style={{ fontSize: 16 }}>{p.emoji}</span>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              {canEditStrategy && <button className="btn btn-ghost btn-sm" onClick={() => removePillar(i)}>🗑️</button>}
            </div>
          ))}
          {form.pillars.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>Ramsčių dar nėra</span>}
          {canEditStrategy && <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={addPillar}>+ Pridėti ramstį</button>}
        </div>
      </div>
    </div>
  )
}
