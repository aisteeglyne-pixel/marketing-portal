'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { ContentPost } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'JuodraÅ¡tis', review: 'PerÅ¾iÅ«roje', approved: 'Patvirtinta',
  rejected: 'Atmesta', published: 'Paskelbta'
}

export default function ClientContentPage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [comment, setComment] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser(); const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*, agency:agencies(*)').eq('id', user.id).single()
      if (!p || p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)
      const { data } = await supabase.from('content_posts').select('*').eq('client_id', p.client_id).order('created_at', { ascending: false })
      setPosts(data || [])
    }
    load()
  }, [])

  async function updateStatus(postId: string, status: 'approved' | 'rejected') {
    setLoading(postId)
    if (comment[postId]) {
      await supabase.from('comments').insert({ content_post_id: postId, author_id: profile.id, text: comment[postId] })
    }
    await supabase.from('content_posts').update({ status }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
    setComment(prev => ({ ...prev, [postId]: '' }))
    setLoading(null)
  }

  if (!profile) return <div style={{ padding: '2rem' }}>Kraunama...</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '1.5rem' }}>Turinys</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.length === 0 && <div className="card" style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Kol kas turinio nÅ¯ra</div>}
          {posts.map(post => (
            <div key={post.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{post.title}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge badge-${post.status}`}>{STATUS_LABELS[post.status]}</span>
                    <span style={{ fontSize: 12, color: '#888' }}>{post.platform}</span>
                  </div>
                </div>
                {post.publish_date && <span style={{ fontSize: 12, color: '#888' }}>Planuojama: {new Date(post.publish_date).toLocaleDateString('lt-LT')}</span>}
              </div>
              {post.caption && <p style={{ fontSize: 14, color: '#555', marginBottom: '1rem', lineHeight: 1.6 }}>{post.caption}</p>}
              {post.status === 'review' && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '1rem' }}>
                  <textarea value={comment[post.id] || ''} onChange={e => setComment(prev => ({ ...prev, [post.id]: e.target.value }))} placeholder="Komentaras agentÅ«rai)(neprivaloma)..." rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none', marginBottom: '0.75rem' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => updateStatus(post.id, 'approved')} disabled={loading === post.id} style={{ background: '#EAF3DE', color: '#27500A', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>â Patvirinti</button>
                    <button onClick={() => updateStatus(post.id, 'rejected')} disabled={loading === post.id} style={{ background: '#FCEBEB', color: '#791F1F4', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>â Atmesti</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
