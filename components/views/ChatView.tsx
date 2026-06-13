'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { clientColor, fmtTime } from '@/lib/portal-helpers'
import type { Client, ChatChannel, ChatMessage } from '@/types'

interface ChatViewProps {
  profile: any
  clients: Client[]
  team: any[]
  onUnreadChange?: (total: number) => void
}

const GENERAL_NAME = '#bendras'

export default function ChatView({ profile, clients, team, onUnreadChange }: ChatViewProps) {
  const supabase = createClient()
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [lastRead, setLastRead] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewChan, setShowNewChan] = useState(false)
  const [ncName, setNcName] = useState('')

  const activeIdRef = useRef<string | null>(null)
  const channelsRef = useRef<ChatChannel[]>([])
  const lastReadRef = useRef<Record<string, string>>({})
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { channelsRef.current = channels }, [channels])
  useEffect(() => { lastReadRef.current = lastRead }, [lastRead])

  // Bendro unread skaičiaus pranešimas į sidebar'ą
  useEffect(() => {
    if (onUnreadChange) onUnreadChange(Object.values(unread).reduce((a, b) => a + b, 0))
  }, [unread])

  // Autoscroll į apačią
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  // ===== Inicializacija: užtikrinti kanalus + narystę + suskaičiuoti unread =====
  useEffect(() => {
    let cancelled = false
    async function init() {
      // 1. Esami kanalai
      const { data: existing } = await supabase
        .from('channels')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('created_at')
      let chans: ChatChannel[] = existing || []

      // 2. Trūkstamų auto-kūrimas: #bendras + po vieną klientui
      const toCreate: { agency_id: string; client_id: string | null; name: string }[] = []
      if (!chans.some(c => c.client_id === null && !c.is_dm)) {
        toCreate.push({ agency_id: profile.agency_id, client_id: null, name: GENERAL_NAME })
      }
      for (const cl of clients) {
        if (!chans.some(c => c.client_id === cl.id)) {
          toCreate.push({ agency_id: profile.agency_id, client_id: cl.id, name: cl.company_name })
        }
      }
      if (toCreate.length) {
        const { data: created } = await supabase.from('channels').insert(toCreate).select()
        if (created) chans = [...chans, ...created]
      }

      // 3. Narystė: užtikrinti channel_members eilutę man kiekvienam kanalui
      const { data: myMembers } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at')
        .eq('profile_id', profile.id)
      const memberSet = new Set((myMembers || []).map(m => m.channel_id))
      const newMembers = chans.filter(c => !memberSet.has(c.id))
        .map(c => ({ channel_id: c.id, profile_id: profile.id, last_read_at: new Date().toISOString() }))
      if (newMembers.length) {
        await supabase.from('channel_members').insert(newMembers)
      }

      const lr: Record<string, string> = {}
      ;(myMembers || []).forEach(m => { lr[m.channel_id] = m.last_read_at })
      newMembers.forEach(m => { lr[m.channel_id] = m.last_read_at })

      // 4. Unread skaičiavimas (žinutės naujesnės už last_read, ne mano)
      const counts: Record<string, number> = {}
      await Promise.all(chans.map(async c => {
        const since = lr[c.id] || '1970-01-01'
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', c.id)
          .gt('created_at', since)
          .neq('author_id', profile.id)
        counts[c.id] = count || 0
      }))

      if (cancelled) return
      // Rikiuojam: #bendras pirmas, tada klientai
      chans.sort((a, b) => {
        if (a.client_id === null && b.client_id !== null) return -1
        if (a.client_id !== null && b.client_id === null) return 1
        return a.name.localeCompare(b.name)
      })
      setChannels(chans)
      setLastRead(lr)
      setUnread(counts)
      setLoading(false)
      const first = chans.find(c => c.client_id === null) || chans[0]
      if (first) openChannel(first.id)
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== Realtime: visos naujos žinutės =====
  useEffect(() => {
    const sub = supabase
      .channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new as ChatMessage
        if (!channelsRef.current.some(c => c.id === m.channel_id)) return
        if (m.channel_id === activeIdRef.current) {
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
          markRead(m.channel_id)
        } else if (m.author_id !== profile.id) {
          setUnread(prev => ({ ...prev, [m.channel_id]: (prev[m.channel_id] || 0) + 1 }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openChannel(id: string) {
    setActiveId(id)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', id)
      .order('created_at')
      .limit(400)
    setMessages(data || [])
    markRead(id)
  }

  async function markRead(id: string) {
    const now = new Date().toISOString()
    setUnread(prev => prev[id] ? { ...prev, [id]: 0 } : prev)
    setLastRead(prev => ({ ...prev, [id]: now }))
    await supabase.from('channel_members')
      .update({ last_read_at: now })
      .eq('channel_id', id)
      .eq('profile_id', profile.id)
  }

  async function send() {
    const body = text.trim()
    if (!body || !activeId || sending) return
    setSending(true)
    setText('')
    const { error } = await supabase.from('messages').insert({
      channel_id: activeId,
      author_id: profile.id,
      body,
    })
    setSending(false)
    if (error) { setText(body); return }
    // Žinutė atkeliaus per realtime ir bus pridėta automatiškai
  }

  async function createChannel() {
    let name = ncName.trim()
    if (!name) return
    if (!name.startsWith('#')) name = '#' + name
    const { data, error } = await supabase.from('channels').insert({
      agency_id: profile.agency_id,
      client_id: null,
      name,
    }).select().single()
    if (error || !data) return
    await supabase.from('channel_members').insert({
      channel_id: data.id, profile_id: profile.id, last_read_at: new Date().toISOString(),
    })
    setChannels(prev => [...prev, data])
    setLastRead(prev => ({ ...prev, [data.id]: new Date().toISOString() }))
    setShowNewChan(false); setNcName('')
    openChannel(data.id)
  }

  const authorName = (id?: string | null) => {
    if (!id) return 'Nežinomas'
    const m = team.find(x => x.id === id)
    return m ? (m.full_name || m.email) : 'Nežinomas'
  }
  const authorInitials = (id?: string | null) => authorName(id).slice(0, 2).toUpperCase()

  const active = channels.find(c => c.id === activeId) || null
  const generalChans = channels.filter(c => c.client_id === null)
  const clientChans = channels.filter(c => c.client_id !== null)

  function channelIcon(c: ChatChannel) {
    if (c.client_id === null) return <span style={{ fontWeight: 800, opacity: 0.7 }}>#</span>
    const cl = clients.find(x => x.id === c.client_id)
    return <span style={{ width: 9, height: 9, borderRadius: 3, background: clientColor(cl?.company_name || c.name), flexShrink: 0 }} />
  }

  function ChannelRow({ c }: { c: ChatChannel }) {
    const isActive = activeId === c.id
    const u = unread[c.id] || 0
    const label = c.client_id === null ? c.name.replace(/^#/, '') : c.name
    return (
      <div onClick={() => openChannel(c.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', fontSize: 13, fontWeight: u ? 800 : 600, cursor: 'pointer', background: isActive ? 'var(--primary)' : undefined, color: isActive ? '#fff' : undefined }}>
        {channelIcon(c)}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {u > 0 && (
          <span style={{ fontSize: 11, fontWeight: 800, minWidth: 18, textAlign: 'center', padding: '1px 6px', borderRadius: 10, background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--primary)', color: '#fff' }}>{u}</span>
        )}
      </div>
    )
  }

  if (loading) return (
    <div className="view active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 110px)', color: 'var(--text-muted)' }}>
      Kraunamas chatas...
    </div>
  )

  return (
    <div className="view active">
      <div style={{ display: 'flex', height: 'calc(100vh - 110px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

        {/* ==== Kairė: kanalų sąrašas ==== */}
        <div style={{ width: 225, borderRight: '1px solid var(--border)', background: '#FAFAFC', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px 8px', fontSize: 13, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Kanalai
            <span title="Naujas kanalas" style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: 16 }} onClick={() => setShowNewChan(v => !v)}>＋</span>
          </div>
          {showNewChan && (
            <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input className="form-input" style={{ fontSize: 12, padding: '7px 10px' }} placeholder="kanalo-pavadinimas" value={ncName}
                onChange={e => setNcName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createChannel()} autoFocus />
              <button className="btn btn-primary btn-sm" onClick={createChannel}>Sukurti</button>
            </div>
          )}

          {generalChans.map(c => <ChannelRow key={c.id} c={c} />)}

          {clientChans.length > 0 && (
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', padding: '12px 16px 4px' }}>Klientai</div>
          )}
          {clientChans.map(c => <ChannelRow key={c.id} c={c} />)}
        </div>

        {/* ==== Dešinė: žinutės ==== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Antraštė */}
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>
              {active ? (active.client_id === null ? active.name : `# ${active.name}`) : '—'}
            </span>
            {active?.client_id && (
              <span className="text-muted" style={{ fontSize: 12 }}>· kliento kanalas (vidinis)</span>
            )}
          </div>

          {/* Žinučių srautas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 ? (
              <div className="text-muted" style={{ margin: 'auto', textAlign: 'center', fontSize: 13 }}>
                Žinučių dar nėra. Parašyk pirmą 👇
              </div>
            ) : messages.map((m, i) => {
              const prev = messages[i - 1]
              const grouped = prev && prev.author_id === m.author_id && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000)
              const mine = m.author_id === profile.id
              return (
                <div key={m.id} style={{ display: 'flex', gap: 10, marginTop: grouped ? -8 : 0 }}>
                  <div style={{ width: 34, flexShrink: 0 }}>
                    {!grouped && (
                      <span style={{ width: 34, height: 34, borderRadius: '50%', background: clientColor(authorName(m.author_id)), color: '#fff', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {authorInitials(m.author_id)}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {!grouped && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{mine ? 'Tu' : authorName(m.author_id)}</span>
                        <span className="text-muted" style={{ fontSize: 11 }}>{fmtTime(m.created_at) || new Date(m.created_at).toLocaleDateString('lt-LT')}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Rašymo laukelis */}
          <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                className="form-input"
                rows={1}
                placeholder={active ? `Rašyk į ${active.client_id === null ? active.name : '#' + active.name}...` : 'Pasirink kanalą'}
                value={text}
                disabled={!active}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                style={{ flex: 1, resize: 'none', fontFamily: 'inherit', maxHeight: 120 }}
              />
              <button className="btn btn-primary" disabled={!active || sending || !text.trim()} onClick={send}>
                {sending ? '⏳' : 'Siųsti'}
              </button>
            </div>
            <div className="text-muted" style={{ fontSize: 10.5, marginTop: 4 }}>Enter — siųsti · Shift+Enter — nauja eilutė</div>
          </div>
        </div>
      </div>
    </div>
  )
}
