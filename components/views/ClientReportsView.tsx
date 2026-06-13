'use client'

import { useState } from 'react'
import type { ContentPost } from '@/types'

interface Snapshot { id: string; platform: string; metric_date: string; metric: string; value: number }

interface Props {
  posts: ContentPost[]
  metrics: Snapshot[]
}

const PLATFORM_DEFS = [
  { id: 'Instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'Facebook',  label: 'Facebook',  color: '#1877F2' },
  { id: 'LinkedIn',  label: 'LinkedIn',  color: '#0A66C2' },
  { id: 'TikTok',    label: 'TikTok',    color: '#000000' },
]
const METRIC_DEFS = [
  { id: 'followers', label: 'Sekėjai' },
  { id: 'reach', label: 'Pasiekiamumas' },
  { id: 'engagement', label: 'Įsitraukimas' },
  { id: 'profile_views', label: 'Profilio peržiūros' },
]
const METRIC_LABEL = (m: string) => METRIC_DEFS.find(d => d.id === m)?.label || m
const fmtNum = (n: number) => new Intl.NumberFormat('lt-LT').format(n)

export default function ClientReportsView({ posts, metrics }: Props) {
  const platforms = PLATFORM_DEFS.filter(p => metrics.some(m => m.platform === p.id))
  const [selPlatform, setSelPlatform] = useState(platforms[0]?.id || 'Instagram')
  const [chartMetric, setChartMetric] = useState('followers')

  const scoped = metrics.filter(m => m.platform === selPlatform)
  const platColor = PLATFORM_DEFS.find(p => p.id === selPlatform)?.color || '#6c63ff'

  function kpi(metric: string) {
    const pts = scoped.filter(s => s.metric === metric).sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    if (pts.length === 0) return null
    const latest = pts[pts.length - 1]
    const prev = pts.length > 1 ? pts[pts.length - 2] : null
    const delta = prev ? latest.value - prev.value : null
    const pct = prev && prev.value !== 0 ? Math.round((latest.value - prev.value) / prev.value * 100) : null
    return { value: latest.value, delta, pct }
  }

  const chartPoints = scoped.filter(s => s.metric === chartMetric)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .map(s => ({ date: s.metric_date, value: s.value }))

  const published = posts.filter(p => p.status === 'published')
  const approved = posts.filter(p => p.status === 'approved')

  return (
    <div className="view active">
      {/* Turinio santrauka */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          ['Paskelbta įrašų', published.length, 'var(--primary)'],
          ['Patvirtinta', approved.length, '#10B981'],
          ['Iš viso įrašų', posts.length, 'var(--text)'],
        ].map(([l, v, c]) => (
          <div key={l as string} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: c as string, fontFamily: 'Sora, sans-serif' }}>{v as number}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      {metrics.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Socialinių tinklų rezultatų dar nėra. Agentūra juos įkels.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {platforms.map(p => (
              <span key={p.id} onClick={() => setSelPlatform(p.id)}
                style={{ padding: '6px 12px', borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${selPlatform === p.id ? p.color : 'var(--border)'}`, background: selPlatform === p.id ? p.color : 'var(--surface)', color: selPlatform === p.id ? '#fff' : 'var(--text)' }}>
                {p.label}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {METRIC_DEFS.map(md => {
              const k = kpi(md.id)
              return (
                <div key={md.id} className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)', marginBottom: 6 }}>{md.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{k ? fmtNum(k.value) : '—'}</div>
                  {k && k.delta !== null ? (
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: k.delta > 0 ? 'var(--success)' : k.delta < 0 ? '#DC2626' : 'var(--text-muted)' }}>
                      {k.delta > 0 ? '▲' : k.delta < 0 ? '▼' : '—'} {fmtNum(Math.abs(k.delta))}{k.pct !== null ? ` (${k.pct > 0 ? '+' : ''}${k.pct}%)` : ''}
                    </div>
                  ) : <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{k ? 'pirmas matavimas' : 'nėra duomenų'}</div>}
                </div>
              )
            })}
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Dinamika</div>
              <select className="select-box" style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 10px' }} value={chartMetric} onChange={e => setChartMetric(e.target.value)}>
                {METRIC_DEFS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <LineChart points={chartPoints} color={platColor} />
          </div>
        </>
      )}
    </div>
  )
}

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
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} style={{ stroke: 'var(--border)' }} strokeWidth="1" />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} style={{ stroke: 'var(--border)' }} strokeWidth="1" />
      <text x={pad - 6} y={pad + 4} textAnchor="end" fontSize="10" style={{ fill: 'var(--text-muted)' }}>{fmtNum(max)}</text>
      <text x={pad - 6} y={H - pad} textAnchor="end" fontSize="10" style={{ fill: 'var(--text-muted)' }}>{fmtNum(min)}</text>
      {points.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {xy.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          {(i === 0 || i === xy.length - 1) && (
            <text x={p.x} y={H - pad + 14} textAnchor="middle" fontSize="9.5" style={{ fill: 'var(--text-muted)' }}>{points[i].date.slice(5)}</text>
          )}
        </g>
      ))}
      <text x={xy[xy.length - 1].x} y={xy[xy.length - 1].y - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{fmtNum(points[points.length - 1].value)}</text>
    </svg>
  )
}
