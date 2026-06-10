'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'
import { ContentPost } from '@/types'
import { lt } from '@/lib/i18n/lt'

export default function ContentPage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [filter, setFilter] = useState<string>('all')
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

      const { data } = await supabase
        .from('content_posts')
        .select('*')
        .eq('agency_id', p.agency_id)
        .order('created_at', { ascending: false })
      setPosts(data || [])
    }
    load()
  }, [])

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="agency_admin" agencyName={profile.agency?.name} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>{lt.content.title}</h1>
          <button className="btn-primary">{lt.content.newPost}</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['all', 'draft', 'review', 'approved', 'rejected', 'published'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={filter === s ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 13, padding: '6px 14px' }}>
              {s === 'all' ? lt.content.statuses.all : lt.content.statuses[s]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>
              {lt.content.noContent}
            </div>
          )}
          {filtered.map(post => (
            <div key={post.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{post.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge badge-${post.status}`}>
                    {lt.content.statuses[post.status as keyof typeof lt.content.statuses] || post.status}
                  </span>
                  <span style={{ fontSize: 12, color: '#888' }}>{post.platform}</span>
                  {post.publish_date && (
                    <span style={{ fontSize: 12, color: '#888' }}>
                      {new Date(post.publish_date).toLocaleDateString('lt-LT')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>{lt.content.edit}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
