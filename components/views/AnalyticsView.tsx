'use client'

import { useState } from 'react'
import { PLATFORM_COLORS } from '@/lib/portal-constants'
import type { Client, ContentPost } from '@/types'

interface AnalyticsViewProps {
  posts: ContentPost[]
  clients: Client[]
  onOpenClient: (client: Client) => void
}

export default function AnalyticsView({ posts, clients, onOpenClient }: AnalyticsViewProps) {
  const [analyticsPeriod, setAnalyticsPeriod] = useState('thisMonth')

  function getAnalyticsPosts() {
    const n = new Date()
    if (analyticsPeriod === 'thisMonth') return posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= new Date(n.getFullYear(), n.getMonth(), 1))
    if (analyticsPeriod === 'lastMonth') { const s = new Date(n.getFullYear(), n.getMonth()-1, 1); const e = new Date(n.getFullYear(), n.getMonth(), 1); return posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= s && new Date(p.published_at) < e) }
    if (analyticsPeriod === 'last3') return posts.filter(p => p.status === 'published' && p.published_at && new Date(p.published_at) >= new Date(n.getFullYear(), n.getMonth()-3, 1))
    return posts.filter(p => p.status === 'published')
  }

  const analyticsPosts = getAnalyticsPosts()
  const byPlatform: Record<string, number> = {}
  analyticsPosts.forEach(p => { byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1 })
  const maxPlatformCount = Math.max(...Object.values(byPlatform), 1)

  return (
    <div className="view active">
      <div className="analytics-toolbar" style={{ marginBottom: 20 }}>
        <select className="select-box" value={analyticsPeriod} onChange={e => setAnalyticsPeriod(e.target.value)}>
          <option value="thisMonth">Šis mėnuo</option>
          <option value="lastMonth">Praėjęs mėnuo</option>
          <option value="last3">Paskutiniai 3 mėnesiai</option>
          <option value="thisYear">Šie metai</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Paskelbti įrašai</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Sora, sans-serif' }}>{analyticsPosts.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>iš {posts.length} viso įrašų</div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12 }}>Platforma</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(byPlatform).sort((a,b) => b[1]-a[1]).map(([platform, count]) => (
              <div key={platform}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: PLATFORM_COLORS[platform] || '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800 }}>{platform.slice(0,2).toUpperCase()}</div>
                  <span style={{ fontSize: 12, flex: 1 }}>{platform}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(count/maxPlatformCount*100)}%`, height: '100%', background: PLATFORM_COLORS[platform] || 'var(--primary)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
            {Object.keys(byPlatform).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Duomenų nėra</div>}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
        {clients.map(client => {
          const cp = analyticsPosts.filter(p => p.client_id === client.id)
          return (
            <div key={client.id} className="card" style={{ cursor: 'pointer' }} onClick={() => onOpenClient(client)}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{client.company_name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--primary)' }}>{cp.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>paskelbti įrašai</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
