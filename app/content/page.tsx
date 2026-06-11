'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { ContentPost } from '@/types'
import { lt } from '@/lib/i18n/lt'

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook:  '#1877F2',
  LinkedIn:  '#0A66C2',
  TikTok:    '#000000',
  X:         '#14171A',
  YouTube:   '#FF0000',
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Juodraštis',    bg: '#F3F4F6', color: '#6B7280' },
  review:    { label: 'Peržiūra',      bg: '#FEF3C7', color: '#92400E' },
  approved:  { label: 'Patvirtinta',   bg: '#D1FAE5', color: '#065F46' },
  rejected:  { label: 'Atmesta',       bg: '#FEE2E2', color: '#991B1B' },
  published: { label: 'Paskelbta',     bg: '#EEF2FF', color: '#3730A3' },
  scheduled: { label: 'Suplanuota',    bg: '#E0F2FE', color: '#075985' },
}

const TABS = [
  { key: 'all',       label: 'Visi įrašai' },
  { key: 'review',    label: 'Laukia tvirtinimo' },
  { key: 'approved',  label: 'Patvirtinta' },
  { key: 'scheduled', label: 'Suplanuota' },
  { key: 'published', label: 'Paskelbta' },
  { key: 'draft',     label: 'Juodraščiai' },
]

export default function ContentPage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [clients, setClients] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role !== 'agency_admin') { router.push('/client-home'); return }
      setProfile(p)

      const [{ data: postsData }, { data: clientsData }] = await Promise.all([
        supabase.from('content_posts').select('*').eq('agency_id', p.agency_id).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, company_name').eq('agency_id', p.agency_id),
      ])
      setPosts(postsData || [])
      const map: Record<string, string> = {}
      ;(clientsData || []).forEach((c: any) => { map[c.id] = c.company_name })
      setClients(map)
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  // Counts per tab
  const counts: Record<string, number> = { all: posts.length }
  Object.keys(STATUS_META).forEach(s => {
    counts[s] = posts.filter(p => p.status === s).length
  })

  // Filtered
  let filtered = activeTab === 'all' ? posts : posts.filter(p => p.status === activeTab)
  if (platformFilter !== 'all') filtered = filtered.filter(p => p.platform === platformFilter)
  if (search.trim()) filtered = filtered.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()))

  const platforms = ['all', ...Array.from(new Set(posts.map(p => p.platform).filter(Boolean)))]

  const reviewPosts = posts.filter(p => p.status === 'review')

  async function handleApprove(postId: string) {
    await supabase.from('content_posts').update({ status: 'approved' }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' as ContentPost['status'] } : p))
  }

  async function handleReject(postId: string) {
    await supabase.from('content_posts').update({ status: 'rejected' }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'rejected' as ContentPost['status'] } : p))
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} agencyId={profile.agency_id} />
      <div className="main-content" style={{ marginLeft: 240 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Turinio valdymas</h1>
            <p style={{ fontSize: 13, color: '#888' }}>{posts.length} įrašai viso · {counts['review'] || 0} laukia tvirtinimo</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ieškoti įrašų..."
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, width: 200, outline: 'none' }}
            />
            <button className="btn-primary" style={{ fontSize: 13 }}>+ Naujas įrašas</button>
          </div>
        </div>

        {/* Approval banner if any pending */}
        {reviewPosts.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #FEF3C7, #FFF9ED)',
            border: '1px solid #FDE68A', borderRadius: 12,
            padding: '14px 20px', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>⏳ {reviewPosts.length} įrašai laukia tvirtinimo</span>
              <span style={{ fontSize: 12, color: '#92400E', marginLeft: 8 }}>Peržiūrėkite ir patvirtinkite arba atmeskite</span>
            </div>
            <button onClick={() => setActiveTab('review')} style={{
              background: '#D97706', color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Žiūrėti →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #f0f0f0', marginBottom: '1.25rem' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
                background: 'none', fontWeight: activeTab === tab.key ? 700 : 400,
                color: activeTab === tab.key ? '#6c63ff' : '#666',
                borderBottom: activeTab === tab.key ? '2px solid #6c63ff' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {tab.label}
              {counts[tab.key] > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 10,
                  background: activeTab === tab.key ? '#EEF2FF' : '#f0f0f0',
                  color: activeTab === tab.key ? '#4338CA' : '#888',
                  fontWeight: 600,
                }}>{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Platform pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {platforms.map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${platformFilter === p ? '#6c63ff' : '#e0e0e0'}`,
                background: platformFilter === p ? '#EEF2FF' : '#fff',
                color: platformFilter === p ? '#4338CA' : (p !== 'all' ? PLATFORM_COLORS[p] || '#666' : '#666'),
                fontWeight: platformFilter === p ? 700 : 400,
              }}>
              {p === 'all' ? 'Visos platformos' : p}
            </button>
          ))}
        </div>

        {/* Posts table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 1fr 80px',
            padding: '10px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0',
            fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <span>Pavadinimas</span>
            <span>Klientas</span>
            <span>Platforma</span>
            <span>Statusas</span>
            <span>Data</span>
            <span style={{ textAlign: 'right' }}>Veiksmai</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
              Įrašų nerasta
            </div>
          ) : (
            filtered.map((post, i) => {
              const sm = STATUS_META[post.status] || STATUS_META.draft
              return (
                <div key={post.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px 1fr 80px',
                  padding: '12px 16px', alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f8f8f8' : 'none',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {/* Title */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{post.title || '(Be pavadinimo)'}</div>
                    {post.body && (
                      <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                        {post.body}
                      </div>
                    )}
                  </div>
                  {/* Client */}
                  <div style={{ fontSize: 12, color: '#555' }}>
                    {post.client_id ? (clients[post.client_id] || '—') : '—'}
                  </div>
                  {/* Platform */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLORS[post.platform] || '#ccc' }} />
                    <span style={{ fontSize: 12, color: '#555' }}>{post.platform || '—'}</span>
                  </div>
                  {/* Status */}
                  <div>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                      background: sm.bg, color: sm.color,
                    }}>{sm.label}</span>
                  </div>
                  {/* Date */}
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {post.publish_date ? new Date(post.publish_date).toLocaleDateString('lt-LT') : '—'}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {post.status === 'review' && (
                      <>
                        <button onClick={() => handleApprove(post.id)}
                          title="Patvirtinti"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #D1FAE5', background: '#D1FAE5', color: '#065F46', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✓
                        </button>
                        <button onClick={() => handleReject(post.id)}
                          title="Atmesti"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #FEE2E2', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✕
                        </button>
                      </>
                    )}
                    {post.status !== 'review' && (
                      <a href={`/clients/${post.client_id}#turinys`}
                        style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e0e0e0', background: '#fafafa', color: '#666', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
