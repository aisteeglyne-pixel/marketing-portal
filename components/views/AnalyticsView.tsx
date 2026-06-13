'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase'
import { clientColor, clientInitials } from '@/lib/portal-helpers'
import type { Client, ContentPost } from '@/types'

interface AnalyticsViewProps {
  profile: any
  posts: ContentPost[]
  clients: Client[]
  onOpenClient: (client: Client) => void
}

interface Snapshot {
  id: string
  agency_id: string
  client_id: string
  platform: string
  metric_date: string
  metric: string
  value: number
  source: string
  created_at: string
}

const PLATFORM_DEFS = [
  { id: 'Instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'Facebook',  label: 'Facebook',  color: '#1877F2' },
  { id: 'LinkedIn',  label: 'LinkedIn',  color: '#0A66C2' },
  { id: 'TikTok',    label: 'TikTok',    color: '#010101' },
]

const STATUS_COLS = [
  { id: 'draft',     label: 'Paruošta',     color: 'var(--text-muted)' },
  { id: 'review',    label: 'Tvirtinimui',  color: '#F59E0B' },
  { id: 'approved',  label: 'Patvirtinta',  color: '#10B981' },
  { id: 'published', label: 'Paskelbta',    color: 'var(--primary)' },
]

const TYPE_ROWS = [
  { id: 'post',  label: '📝 Posts' },
  { id: 'story', label: '📖 Stories' },
  { id: 'reel',  label: '🎬 Reels' },
]

const METRIC_DEFS = [
  { id: 'followers',     label: 'Sekėjai' },
  { id: 'reach',         label: 'Pasiekiamumas' },
  { id: 'engagement',    label: 'Įsitraukimas' },
  { id: 'profile_views', label: 'Profilio peržiūros' },
]
const METRIC_LABEL = (m: string) => METRIC_DEFS.find(d => d.id === m)?.label || m
const fmtNum = (n: number) => new Intl.NumberFormat('lt-LT').format(n)

export default function AnalyticsView({ profile, posts, clients, onOpenClient }: AnalyticsViewProps) {
  const [tab, setTab] = useState<'content' | 'metrics'>('content')

  return (
    <div className="view active">
      {/* ===== Tab'ai ===== */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
        <div onClick={() => setTab('content')} style={{ padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: tab === 'content' ? 'var(--text)' : 'var(--text-muted)', borderBottom: tab === 'content' ? '2.5px solid var(--primary)' : '2.5px solid transparent' }}>📝 Turinys</div>
        <div onClick={() => setTab('metrics')} style={{ padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: tab === 'metrics' ? 'var(--text)' : 'var(--text-muted)', borderBottom: tab === 'metrics' ? '2.5px solid var(--primary)' : '2.5px solid transparent' }}>📈 Rezultatai</div>
      </div>

      {tab === 'content' ? <ContentTab posts={posts} clients={clients} onOpenClient={onOpenClient} /> : <MetricsTab profile={profile} clients={clients} />}
    </div>
  )
}

// ============================================================
// TURINIO STATISTIKA (buvęs vaizdas)
// ============================================================
function ContentTab({ posts, clients, onOpenClient }: { posts: ContentPost[]; clients: Client[]; onOpenClient: (c: Client) => void }) {
  const [period, setPeriod] = useState('thisMonth')
  const now = new Date()

  let fromDate: Date, toDate: Date, periodLabel: string
  if (period === 'thisMonth') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    periodLabel = fromDate.toLocaleString('lt-LT', { month: 'long', year: 'numeric' })
  } else if (period === 'lastMonth') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    toDate = new Date(now.getFullYear(), now.getMonth(), 0)
    periodLabel = fromDate.toLocaleString('lt-LT', { month: 'long', year: 'numeric' })
  } else if (period === 'last3') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    periodLabel = 'Paskutiniai 3 mėnesiai'
  } else {
    fromDate = new Date(now.getFullYear(), 0, 1)
    toDate = new Date(now.getFullYear(), 11, 31)
    periodLabel = now.getFullYear().toString()
  }

  const inPeriod = (p: ContentPost) => {
    if (!p.publish_date && !p.published_at && !p.created_at) return false
    const d = new Date(p.publish_date || p.published_at || p.created_at)
    return d >= fromDate && d <= toDate
  }

  const allPeriod = posts.filter(inPeriod)
  const periodPublished = allPeriod.filter(p => p.status === 'published')
  const stories = periodPublished.filter(p => p.content_type === 'story').length
  const reels = periodPublished.filter(p => p.content_type === 'reel').length
  const regular = periodPublished.length - stories - reels

  const platformCount: Record<string, number> = {}
  allPeriod.forEach(p => { platformCount[p.platform] = (platformCount[p.platform] || 0) + 1 })
  const total = Object.values(platformCount).reduce((a, b) => a + b, 0) || 1

  const typeOf = (p: ContentPost) => p.content_type || 'post'

  return (
    <>
      <div className="analytics-toolbar" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <select className="select-box" value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="thisMonth">Šis mėnuo</option>
          <option value="lastMonth">Praėjęs mėnuo</option>
          <option value="last3">Paskutiniai 3 mėnesiai</option>
          <option value="thisYear">Šie metai</option>
        </select>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>📅 {periodLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Paskelbti įrašai</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Sora, sans-serif' }}>{periodPublished.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {regular} post{regular !== 1 ? 'ai' : ''} · {stories} stor{stories !== 1 ? 'ies' : 'y'} · {reels} reel{reels !== 1 ? 'ai' : 'as'}
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12 }}>Platformų skirstymas</div>
          <div>
            {PLATFORM_DEFS.map(pd => {
              const cnt = platformCount[pd.id] || 0
              const pct = Math.round(cnt / total * 100)
              return (
                <div key={pd.id} className="platform-stat-row" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: pd.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{pd.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: pd.color }}>{cnt}</div>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
                    <div style={{ background: pd.color, width: `${pct}%`, height: 6, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {clients.map(c => {
        const cp = allPeriod.filter(p => p.client_id === c.id)
        const color = clientColor(c.company_name)
        const totalCols = STATUS_COLS.map(s => cp.filter(p => p.status === s.id).length)
        const grandTotal = totalCols.reduce((a, b) => a + b, 0)
        const thStyle: CSSProperties = { textAlign: 'center', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }
        return (
          <div key={c.id} className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }} onClick={() => onOpenClient(c)}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{clientInitials(c.company_name)}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.company_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(c.social_channels || []).join(' · ') || 'Klientas'}</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ ...thStyle, textAlign: 'left', padding: '8px 12px' }}>Tipas</th>
                    {STATUS_COLS.map(s => <th key={s.id} style={thStyle}>{s.label}</th>)}
                    <th style={thStyle}>Iš viso</th>
                  </tr>
                </thead>
                <tbody>
                  {TYPE_ROWS.map(t => {
                    const typeItems = cp.filter(p => typeOf(p) === t.id)
                    const counts = STATUS_COLS.map(s => typeItems.filter(p => p.status === s.id).length)
                    const rowTotal = counts.reduce((a, b) => a + b, 0)
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>{t.label}</td>
                        {counts.map((v, i) => (
                          <td key={i} style={{ textAlign: 'center', padding: '10px 8px', fontSize: 14, fontWeight: v > 0 ? 700 : 400, color: v > 0 ? STATUS_COLS[i].color : 'var(--text-muted)', opacity: v > 0 ? 1 : 0.45 }}>{v}</td>
                        ))}
                        <td style={{ textAlign: 'center', padding: '10px 8px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{rowTotal}</td>
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Iš viso</td>
                    {totalCols.map((v, i) => (
                      <td key={i} style={{ textAlign: 'center', padding: '10px 8px', fontSize: 14, fontWeight: 800, color: STATUS_COLS[i].color }}>{v}</td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '10px 8px', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </>
  )
}

// ============================================================
// REZULTATŲ METRIKOS (metrics_snapshots)
// ============================================================
function MetricsTab({ profile, clients }: { profile: any; clients: Client[] }) {
  const supabase = createClient()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [selClient, setSelClient] = useState<string>(clients[0]?.id || '')
  const [selPlatform, setSelPlatform] = useState('Instagram')
  const [chartMetric, setChartMetric] = useState('followers')
  const [showImport, setShowImport] = useState(false)
  const [csv, setCsv] = useState('')
  const [msg, setMsg] = useState('')
  // Rankinės įvesties forma
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10))
  const [fMetric, setFMetric] = useState('followers')
  const [fValue, setFValue] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('metrics_snapshots')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('metric_date')
      setSnapshots((data || []).map((s: any) => ({ ...s, value: Number(s.value) })))
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const scoped = snapshots.filter(s => s.client_id === selClient && s.platform === selPlatform)

  async function addSnapshot() {
    const value = Number(fValue)
    if (!selClient) { flash('⚠️ Pasirink klientą'); return }
    if (!fValue || isNaN(value)) { flash('⚠️ Įvesk skaičių'); return }
    const row = { agency_id: profile.agency_id, client_id: selClient, platform: selPlatform, metric_date: fDate, metric: fMetric, value, source: 'manual' }
    const { data, error } = await supabase.from('metrics_snapshots')
      .upsert(row, { onConflict: 'client_id,platform,metric_date,metric' }).select().single()
    if (error || !data) { flash('⚠️ ' + (error?.message || 'klaida')); return }
    const norm = { ...data, value: Number(data.value) }
    setSnapshots(prev => [...prev.filter(s => !(s.client_id === selClient && s.platform === selPlatform && s.metric_date === fDate && s.metric === fMetric)), norm])
    setFValue('')
    flash('✅ Įrašyta')
  }

  async function importCsv() {
    if (!selClient) { flash('⚠️ Pasirink klientą'); return }
    const lines = csv.trim().split('\n').map(l => l.trim()).filter(Boolean)
    const rows: any[] = []
    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map(x => x.trim())
      const [d, metric, val] = parts
      if (!d || !metric || val === undefined || isNaN(Number(val))) continue
      rows.push({ agency_id: profile.agency_id, client_id: selClient, platform: selPlatform, metric_date: d, metric, value: Number(val), source: 'csv' })
    }
    if (!rows.length) { flash('⚠️ Nerasta tinkamų eilučių (formatas: data,metrika,reikšmė)'); return }
    const { data, error } = await supabase.from('metrics_snapshots')
      .upsert(rows, { onConflict: 'client_id,platform,metric_date,metric' }).select()
    if (error) { flash('⚠️ ' + error.message); return }
    const norm = (data || []).map((s: any) => ({ ...s, value: Number(s.value) }))
    setSnapshots(prev => {
      const keys = new Set(norm.map((s: Snapshot) => `${s.client_id}|${s.platform}|${s.metric_date}|${s.metric}`))
      return [...prev.filter(s => !keys.has(`${s.client_id}|${s.platform}|${s.metric_date}|${s.metric}`)), ...norm]
    })
    setCsv(''); setShowImport(false)
    flash(`✅ Importuota: ${norm.length}`)
  }

  async function deleteSnapshot(id: string) {
    const { error } = await supabase.from('metrics_snapshots').delete().eq('id', id)
    if (error) { flash('⚠️ ' + error.message); return }
    setSnapshots(prev => prev.filter(s => s.id !== id))
  }

  // KPI: paskutinė reikšmė + pokytis nuo prieš tai buvusios
  function kpi(metric: string) {
    const pts = scoped.filter(s => s.metric === metric).sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    if (pts.length === 0) return null
    const latest = pts[pts.length - 1]
    const prev = pts.length > 1 ? pts[pts.length - 2] : null
    const delta = prev ? latest.value - prev.value : null
    const pct = prev && prev.value !== 0 ? Math.round((latest.value - prev.value) / prev.value * 100) : null
    return { value: latest.value, date: latest.metric_date, delta, pct }
  }

  const chartPoints = scoped.filter(s => s.metric === chartMetric)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .map(s => ({ date: s.metric_date, value: s.value }))

  const platColor = PLATFORM_DEFS.find(p => p.id === selPlatform)?.color || 'var(--primary)'

  if (loading) return <div className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Kraunamos metrikos...</div>
  if (clients.length === 0) return <div className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Pirma pridėk klientą (Admin valdymas), tada galėsi sekti rezultatus.</div>

  return (
    <>
      {/* Įrankių juosta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="select-box" value={selClient} onChange={e => setSelClient(e.target.value)}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          {PLATFORM_DEFS.map(p => (
            <span key={p.id} onClick={() => setSelPlatform(p.id)}
              style={{ padding: '6px 12px', borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${selPlatform === p.id ? p.color : 'var(--border)'}`, background: selPlatform === p.id ? p.color : 'var(--surface)', color: selPlatform === p.id ? '#fff' : 'var(--text)' }}>
              {p.label}
            </span>
          ))}
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowImport(v => !v)}>📥 Importuoti CSV</button>
        {msg && <span style={{ fontSize: 12.5, fontWeight: 700, color: msg.startsWith('⚠️') ? '#DC2626' : 'var(--success)' }}>{msg}</span>}
      </div>

      {/* CSV importas */}
      {showImport && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>CSV importas → {clients.find(c => c.id === selClient)?.company_name} / {selPlatform}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginBottom: 8 }}>Viena eilutė = <code>data,metrika,reikšmė</code> · pvz. <code>2026-06-01,followers,1240</code> · metrikos: followers, reach, engagement, profile_views</div>
          <textarea className="form-input" rows={5} value={csv} onChange={e => setCsv(e.target.value)} placeholder={'2026-06-01,followers,1240\n2026-06-01,reach,8800\n2026-06-08,followers,1305'} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={importCsv}>Importuoti</button>
            <button className="btn btn-outline btn-sm" onClick={() => { setShowImport(false); setCsv('') }}>Atšaukti</button>
          </div>
        </div>
      )}

      {/* KPI kortelės */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {METRIC_DEFS.map(md => {
          const k = kpi(md.id)
          return (
            <div key={md.id} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)', marginBottom: 6 }}>{md.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{k ? fmtNum(k.value) : '—'}</div>
              {k && k.delta !== null ? (
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: k.delta > 0 ? 'var(--success)' : k.delta < 0 ? '#DC2626' : 'var(--text-muted)' }}>
                  {k.delta > 0 ? '▲' : k.delta < 0 ? '▼' : '—'} {fmtNum(Math.abs(k.delta))}{k.pct !== null ? ` (${k.pct > 0 ? '+' : ''}${k.pct}%)` : ''}
                </div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{k ? 'pirmas matavimas' : 'nėra duomenų'}</div>}
            </div>
          )
        })}
      </div>

      {/* Grafikas */}
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Dinamika</div>
          <select className="select-box" style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 10px' }} value={chartMetric} onChange={e => setChartMetric(e.target.value)}>
            {METRIC_DEFS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <LineChart points={chartPoints} color={platColor} />
      </div>

      {/* Rankinė įvestis */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>Pridėti reikšmę rankiniu būdu</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Data</label>
            <input type="date" className="form-input" value={fDate} onChange={e => setFDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Metrika</label>
            <select className="select-box" value={fMetric} onChange={e => setFMetric(e.target.value)}>
              {METRIC_DEFS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Reikšmė</label>
            <input type="number" className="form-input" value={fValue} onChange={e => setFValue(e.target.value)} placeholder="pvz. 1240" style={{ width: 130 }} onKeyDown={e => e.key === 'Enter' && addSnapshot()} />
          </div>
          <button className="btn btn-primary" onClick={addSnapshot}>+ Pridėti</button>
        </div>
      </div>

      {/* Įrašų sąrašas */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>Įrašai ({selPlatform})</div>
        {scoped.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Dar nėra duomenų. Pridėk rankiniu būdu arba importuok CSV.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Metrika</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reikšmė</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {[...scoped].sort((a, b) => b.metric_date.localeCompare(a.metric_date) || a.metric.localeCompare(b.metric)).map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontSize: 13 }}>{s.metric_date}</td>
                  <td style={{ padding: '8px', fontSize: 13 }}>{METRIC_LABEL(s.metric)} {s.source === 'csv' && <span className="text-muted" style={{ fontSize: 10 }}>· csv</span>}</td>
                  <td style={{ padding: '8px', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{fmtNum(s.value)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span onClick={() => deleteSnapshot(s.id)} title="Ištrinti" style={{ cursor: 'pointer', fontSize: 12, opacity: 0.5 }}>🗑</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ============================================================
// Paprastas SVG linijinis grafikas (be priklausomybių)
// ============================================================
function LineChart({ points, color }: { points: { date: string; value: number }[]; color: string }) {
  if (points.length === 0) return <div className="text-muted" style={{ fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Nėra duomenų grafikui</div>
  const W = 640, H = 200, pad = 36
  const vals = points.map(p => p.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const stepX = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0
  const xy = points.map((p, i) => ({
    x: points.length > 1 ? pad + i * stepX : W / 2,
    y: H - pad - ((p.value - min) / range) * (H - pad * 2),
  }))
  const path = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* y kraštinės */}
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} style={{ stroke: 'var(--border)' }} strokeWidth="1" />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} style={{ stroke: 'var(--border)' }} strokeWidth="1" />
      <text x={pad - 6} y={pad + 4} textAnchor="end" fontSize="10" style={{ fill: 'var(--text-muted)' }}>{fmtNum(max)}</text>
      <text x={pad - 6} y={H - pad} textAnchor="end" fontSize="10" style={{ fill: 'var(--text-muted)' }}>{fmtNum(min)}</text>
      {/* linija */}
      {points.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {/* taškai */}
      {xy.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          {(i === 0 || i === xy.length - 1) && (
            <text x={p.x} y={H - pad + 14} textAnchor="middle" fontSize="9.5" style={{ fill: 'var(--text-muted)' }}>{points[i].date.slice(5)}</text>
          )}
        </g>
      ))}
      {/* paskutinė reikšmė */}
      <text x={xy[xy.length - 1].x} y={xy[xy.length - 1].y - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{fmtNum(points[points.length - 1].value)}</text>
    </svg>
  )
}
