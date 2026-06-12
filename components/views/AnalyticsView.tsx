'use client'

import { useState, type CSSProperties } from 'react'
import { clientColor, clientInitials } from '@/lib/portal-helpers'
import type { Client, ContentPost } from '@/types'

interface AnalyticsViewProps {
  posts: ContentPost[]
  clients: Client[]
  onOpenClient: (client: Client) => void
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

export default function AnalyticsView({ posts, clients, onOpenClient }: AnalyticsViewProps) {
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
    <div className="view active">
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

      {/* Lentelė per klientą: tipas × statusas */}
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
    </div>
  )
}
