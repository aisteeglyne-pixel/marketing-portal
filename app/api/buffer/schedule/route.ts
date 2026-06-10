import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const { clientId, profileId, text, scheduledAt, postId } = await request.json()

  if (!clientId || !profileId || !text) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )

  const { data: client } = await supabase
    .from('clients')
    .select('buffer_token')
    .eq('id', clientId)
    .single()

  if (!client?.buffer_token) {
    return NextResponse.json({ success: false, error: 'no_token' })
  }

  try {
    const body = new URLSearchParams({
      'profile_ids[]': profileId,
      text,
      access_token: client.buffer_token,
      ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
    })

    const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const json = await res.json()

    if (!res.ok || !json.success) {
      return NextResponse.json({ success: false, error: json.message || 'Buffer error' })
    }

    // Atnaujinti įrašo statusą DB
    if (postId) {
      await supabase
        .from('content_posts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', postId)
    }

    return NextResponse.json({ success: true, bufferId: json.updates?.[0]?.id })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message })
  }
}
