'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import ContentCalendar from '@/components/ContentCalendar'
import { useRouter } from 'next/navigation'
import { lt } from '@/lib/i18n/lt'
import type { ContentPost } from '@/types'

export default function ClientContentPage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase
        .from('profiles')
        .select('*, agency:agencies(*)')
        .eq('id', user.id)
        .single()
      if (!p || p.role === 'agency_admin') { router.push('/dashboard'); return }
      setProfile(p)

      const { data } = await supabase
        .from('content_posts')
        .select('*')
        .eq('client_id', p.client_id)
        .order('created_at', { ascending: false })
      setPosts(data || [])
    }
    load()
  }, [])

  if (!profile) return <div style={{ padding: '2rem' }}>{lt.common.loading}</div>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="client" agencyName={profile.agency?.name} agencyLogo={profile.agency?.logo_url} />
      <div className="main-content" style={{ marginLeft: 240 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: '1.5rem' }}>{lt.clientContent.title}</h1>
        <div className="card" style={{ padding: '1.25rem' }}>
          <ContentCalendar
            posts={posts}
            clientId={profile.client_id}
            role="client"
            onPostsChange={setPosts}
          />
        </div>
      </div>
    </div>
  )
}
