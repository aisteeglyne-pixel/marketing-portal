'use client'

export default function BrandHubView() {
  return (
    <div className="view active">
      <div className="brand-grid">
        <div className="card">
          <div className="section-title">Brand Voice</div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>Apibrėžkite brand komunikacijos stilių. AI naudos šias gaires turiniui generuoti.</p>
          <div className="voice-card">Profesionali, šilta, kūrybiška. Kalbame tiesiogiai ir aiškiai, vengdami korporatyvinio žargono. Vertiname autentiškumą.</div>
          <div className="tone-sliders" style={{ marginTop: 16 }}>
            {[['Formalumas', 35], ['Drąsa', 65], ['Žaismingumas', 45], ['Emocionalumas', 70]].map(([label, val]) => (
              <div key={label as string} className="tone-row">
                <span className="tone-label">{label}</span>
                <input type="range" className="tone-slider" min="0" max="100" defaultValue={val as number} style={{ flex: 1 }} />
                <span className="tone-value">{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="section-title">Brand spalvos</div>
          <div className="color-swatches">
            {['#6c63ff','#FF6B6B','#1E181C','#f0f0f8','#22C55E'].map(c => (
              <div key={c} className="swatch" style={{ background: c }} />
            ))}
            <div className="swatch add-swatch">+</div>
          </div>
          <div className="section-title" style={{ marginTop: 20 }}>Hashtagai</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {['#rinkodara','#turinys','#socialiniaitinklai','#lt'].map(h => (
              <span key={h} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'var(--primary-light)', color: 'var(--primary-dark)', fontWeight: 600 }}>{h}</span>
            ))}
          </div>
          <input className="form-input" style={{ marginTop: 10 }} placeholder="Pridėti hashtag ir spauskite Enter" />
        </div>
        <div className="card">
          <div className="section-title">Medijų biblioteka</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {Array.from({length:8}).map((_,i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 20 }}>🖼️</div>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12, width: '100%' }}>↑ Įkelti failus</button>
        </div>
        <div className="card">
          <div className="section-title">Turinio ramsčiai</div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>Apibrėžkite pasikartojančias turinio temas strategijos nuoseklumui.</p>
          {['Mokomasis turinys','Atvejai ir sėkmės istorijos','Produkto pristatymas','Komandinė kultūra'].map((pillar, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{pillar}</span>
            </div>
          ))}
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>+ Pridėti ramstį</button>
        </div>
      </div>
    </div>
  )
}
