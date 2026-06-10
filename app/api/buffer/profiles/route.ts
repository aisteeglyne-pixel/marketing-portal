import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

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
    return NextResponse.json({ profiles: [], error: 'no_token' })
  }

  try {
    const res = await fetch(
      `https://api.bufferapp.com/1/profiles.json?access_token=${client.buffer_token}`
    )
    if (!res.ok) return NextResponse.json({ profiles: [], error: 'buffer_error' })
    const profiles = await res.json()
    return NextResponse.json({ profiles })
  } catch {
    return NextResponse.json({ profiles: [], error: 'fetch_error' })
  }
}
