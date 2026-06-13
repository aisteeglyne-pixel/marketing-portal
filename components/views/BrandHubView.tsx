'use client'

import { useState } from 'react'

interface BrandHubViewProps {
  showToast: (msg: string) => void
}

const MEDIA_TILES = [
  { bg: 'linear-gradient(135deg,#667eea,#764ba2)', lbl: 'Summer 1' },
  { bg: 'linear-gradient(135deg,#f093fb,#f5576c)', lbl: 'Product' },
  { bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', lbl: 'Lifestyle' },
  { bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', lbl: 'Eco 1' },
  { bg: 'linear-gradient(135deg,#fa709a,#fee140)', lbl: 'Story' },
  { bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', lbl: 'Brand' },
  { bg: 'linear-gradient(135deg,#fccb90,#d57eeb)', lbl: 'Summer 2' },
]

export default function BrandHubView({ showToast }: BrandHubViewProps) {
  const [voice, setVoice] = useState('Profesionali, šilta, kūrybiška. Kalbame tiesiogiai ir aiškiai, vengdami korporatyvinio žargono. Vertiname autentiškumą.')
  const [tones, setTones] = useState<Record<string, number>>({ Formalumas: 35, 'Drąsa': 65, 'Žaismingumas': 45, Emocionalumas: 70 })
  const [hashtags, setHashtags] = useState(['#rinkodara', '#turinys', '#socialiniaitinklai', '#lt'])
  const [newTag, setNewTag] = useState('')
  const [pillars, setPillars] = useState([
    { emoji: '🎓', name: 'Mokomasis turinys', color: '#FF68D8', posts: 12 },
    { emoji: '🏆', name: 'Atvejai ir sėkmės istorijos', color: '#22C55E', posts: 8 },
    { emoji: '📦', name: 'Produkto pristatymas', color: '#F59E0B', posts: 15 },
    { emoji: '🤝', name: 'Komandinė kultūra', color: '#E1306C', posts: 5 },
  ])

  function addHashtag() {
    const t = newTag.trim()
    if (!t) return
    const tag = t.startsWith('#') ? t : '#' + t
    if (!hashtags.includes(tag)) setHashtags(prev => [...prev, tag])
    setNewTag('')
  }

  function copyHashtag(h: string) {
    navigator.clipboard?.writeText(h)
    showToast(`📋 Nukopijuota: ${h}`)
  }

  return (
    <div className="view active">
      <div className="brand-grid">
        <div className="card">
          <div className="section-title">Brand Voice</div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>Apibrėžkite brand komunikacijos stilių. AI naudos šias gaires turiniui generuoti.</p>
          <textarea className="voice-card form-input" rows={3} value={voice} onChange={e => setVoice(e.target.value)} style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
          <div className="tone-sliders" style={{ marginTop: 16 }}>
            {Object.entries(tones).map(([label, val]) => (
              <div key={label} className="tone-row">
                <span className="tone-label">{label}</span>
                <input type="range" className="tone-slider" min={0} max={100} value={val}
                  onChange={e => setTones(prev => ({ ...prev, [label]: Number(e.target.value) }))} style={{ flex: 1 }} />
                <span className="tone-value">{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="section-title">Brand spalvos</div>
          <div className="color-swatches">
            {['#FF68D8','#FF6B6B','#1E181C','#F6EAF2','#22C55E'].map(c => (
              <div key={c} className="swatch" style={{ background: c, cursor: 'pointer' }} title={c} onClick={() => { navigator.clipboard?.writeText(c); showToast(`🎨 Nukopijuota: ${c}`) }} />
            ))}
            <div className="swatch add-swatch" style={{ cursor: 'pointer' }} onClick={() => showToast('🎨 Spalvų pridėjimas — netrukus')}>+</div>
          </div>
          <div className="section-title" style={{ marginTop: 20 }}>Hashtagai</div>
          <div className="hashtag-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {hashtags.map(h => (
              <span key={h} className="hashtag-chip" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary-dark)', fontWeight: 600, cursor: 'pointer' }} title="Spausk — nukopijuos" onClick={() => copyHashtag(h)}>{h}</span>
            ))}
          </div>
          <input className="form-input" style={{ marginTop: 10 }} placeholder="Pridėti hashtag ir spauskite Enter"
            value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHashtag()} />
        </div>
        <div className="card">
          <div className="section-title">Medijų biblioteka</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {MEDIA_TILES.map(t => (
              <div key={t.lbl} style={{ height: 60, borderRadius: 8, background: t.bg, cursor: 'pointer', display: 'flex', alignItems: 'flex-end', padding: 4 }} onClick={() => showToast(`🖼️ ${t.lbl}`)}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{t.lbl}</span>
              </div>
            ))}
            <div style={{ height: 60, borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }} onClick={() => showToast('📁 Įkėlimas — netrukus')}>+</div>
          </div>
        </div>
        <div className="card">
          <div className="section-title">Turinio ramsčiai</div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>Apibrėžkite pasikartojančias turinio temas strategijos nuoseklumui.</p>
          {pillars.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${p.color}` }}>
              <span style={{ fontSize: 16 }}>{p.emoji}</span>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <span className="text-muted">{p.posts} įr.</span>
              <button className="btn btn-ghost btn-sm" onClick={() => showToast(`✏️ Redagavimas — netrukus`)}>✏️</button>
            </div>
          ))}
          <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => {
            const name = prompt('Naujo ramsčio pavadinimas:')
            if (name) setPillars(prev => [...prev, { emoji: '📌', name, color: '#FF68D8', posts: 0 }])
          }}>+ Pridėti ramstį</button>
        </div>
      </div>
    </div>
  )
}
