'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { clientColor, fmtTime } from '@/lib/portal-helpers'
import type { Client, ChatChannel, ChatMessage, MessageReaction } from '@/types'

interface ChatViewProps {
  profile: any
  clients: Client[]
  team: any[]
  onUnreadChange?: (total: number) => void
}

const GENERAL_NAME = '#bendras'

// ===== Kuruota emoji biblioteka (be priklausomybių) =====
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Veidai', emojis: ['😀', '😁', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '😘', '😜', '🤔', '🤨', '😐', '😴', '😎', '🥳', '😢', '😭', '😡', '🤯', '😱', '🤗', '🤩', '🥰', '😬', '🙄', '😤', '😅', '🫡'] },
  { label: 'Gestai', emojis: ['👍', '👎', '👌', '🤙', '✌️', '🤞', '👏', '🙌', '🙏', '💪', '👋', '🤝', '✋', '🤚', '👆', '👇', '👉', '👈', '🫶', '🤟'] },
  { label: 'Širdys', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❤️‍🔥', '💯', '💖', '💗', '💓', '💕'] },
  { label: 'Darbas', emojis: ['✅', '❌', '⚠️', '📌', '📎', '📝', '📅', '📊', '📈', '📉', '💼', '🗂️', '📁', '🔔', '⏰', '🎯', '🚀', '💡', '🔥', '⭐'] },
  { label: 'Objektai', emojis: ['🎉', '🎊', '🏆', '🎁', '☕', '🍕', '🍔', '🍻', '🥂', '💰', '💸', '📷', '🎬', '🎨', '🎵', '☑️', '✨', '👀', '🙈', '🤖'] },
]
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '🙏']

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'absolute', zIndex: 50, bottom: 'calc(100% + 6px)', right: 0,
        width: 280, maxHeight: 260, overflowY: 'auto', padding: 10,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {EMOJI_GROUPS.map(g => (
        <div key={g.label} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>{g.label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {g.emojis.map(e => (
              <span key={e} onClick={() => { onPick(e); onClose() }}
                style={{ fontSize: 20, cursor: 'pointer', padding: '3px 4px', borderRadius: 6, lineHeight: 1 }}
                onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                {e}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ChatView({ profile, clients, team, onUnreadChange }: ChatViewProps) {
  const supabase = createClient()
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [lastRead, setLastRead] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showNewChan, setShowNewChan] = useState(false)
  const [ncName, setNcName] = useState('')
  const [hoverMsg, setHoverMsg] = useState<string | null>(null)
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null)
  const [threadRootId, setThreadRootId] = useState<string | null>(null)

  const activeIdRef = useRef<string | null>(null)
  const channelsRef = useRef<ChatChannel[]>([])
  const messagesRef = useRef<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const threadBottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { channelsRef.current = channels }, [channels])
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Bendro unread skaičiaus pranešimas į sidebar'ą
  useEffect(() => {
    if (onUnreadChange) onUnreadChange(Object.values(unread).reduce((a, b) => a + b, 0))
  }, [unread])

  // Autoscroll — tik kai keičiasi pagrindinio srauto (root) žinučių kiekis
  const rootCount = messages.filter(m => !m.parent_id).length
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [rootCount])
  useEffect(() => { threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, threadRootId])

  // ===== Inicializacija: kanalai + narystė + unread =====
  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: existing } = await supabase
        .from('channels').select('*').eq('agency_id', profile.agency_id).order('created_at')
      let chans: ChatChannel[] = existing || []

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

      const { data: myMembers } = await supabase
        .from('channel_members').select('channel_id, last_read_at').eq('profile_id', profile.id)
      const memberSet = new Set((myMembers || []).map(m => m.channel_id))
      const newMembers = chans.filter(c => !memberSet.has(c.id))
        .map(c => ({ channel_id: c.id, profile_id: profile.id, last_read_at: new Date().toISOString() }))
      if (newMembers.length) await supabase.from('channel_members').insert(newMembers)

      const lr: Record<string, string> = {}
      ;(myMembers || []).forEach(m => { lr[m.channel_id] = m.last_read_at })
      newMembers.forEach(m => { lr[m.channel_id] = m.last_read_at })

      const counts: Record<string, number> = {}
      await Promise.all(chans.map(async c => {
        const since = lr[c.id] || '1970-01-01'
        const { count } = await supabase
          .from('messages').select('*', { count: 'exact', head: true })
          .eq('channel_id', c.id).gt('created_at', since).neq('author_id', profile.id)
        counts[c.id] = count || 0
      }))

      if (cancelled) return
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

  // ===== Realtime: žinutės + reakcijos =====
  useEffect(() => {
    const sub = supabase
      .channel('chat-stream')
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
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        const old = payload.old as { id: string }
        setMessages(prev => prev.filter(x => x.id !== old.id && x.parent_id !== old.id))
        setThreadRootId(prev => prev === old.id ? null : prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, payload => {
        const r = payload.new as MessageReaction
        if (!messagesRef.current.some(x => x.id === r.message_id)) return
        setReactions(prev => prev.some(x => x.id === r.id) ? prev : [...prev, r])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, payload => {
        const old = payload.old as { id: string }
        setReactions(prev => prev.filter(x => x.id !== old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openChannel(id: string) {
    setActiveId(id)
    setThreadRootId(null)
    const { data } = await supabase
      .from('messages').select('*').eq('channel_id', id).order('created_at').limit(400)
    const msgs = data || []
    setMessages(msgs)
    const ids = msgs.map(m => m.id)
    if (ids.length) {
      const { data: rx } = await supabase.from('message_reactions').select('*').in('message_id', ids)
      setReactions(rx || [])
    } else {
      setReactions([])
    }
    markRead(id)
  }

  async function markRead(id: string) {
    const now = new Date().toISOString()
    setUnread(prev => prev[id] ? { ...prev, [id]: 0 } : prev)
    setLastRead(prev => ({ ...prev, [id]: now }))
    await supabase.from('channel_members').update({ last_read_at: now })
      .eq('channel_id', id).eq('profile_id', profile.id)
  }

  // ===== Nuotraukos įkėlimas į client-files =====
  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'png'
    const rnd = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const path = `chat/${activeId}/${rnd}`
    const { error } = await supabase.storage.from('client-files').upload(path, file)
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(path)
    return publicUrl
  }

  // ===== Žinutės siuntimas (root arba gijos atsakymas) =====
  async function sendMessage(body: string, file: File | null, parentId: string | null) {
    if (!activeId) return
    if (!body && !file) return
    let imageUrl: string | null = null
    if (file) {
      imageUrl = await uploadImage(file)
      if (!imageUrl) return
    }
    await supabase.from('messages').insert({
      channel_id: activeId,
      author_id: profile.id,
      body: body || null,
      image_url: imageUrl,
      parent_id: parentId,
    })
    // Atkeliaus per realtime
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const mine = reactions.find(r => r.message_id === messageId && r.profile_id === profile.id && r.emoji === emoji)
    if (mine) {
      setReactions(prev => prev.filter(r => r.id !== mine.id))
      await supabase.from('message_reactions').delete().eq('id', mine.id)
    } else {
      const { data } = await supabase.from('message_reactions')
        .insert({ message_id: messageId, profile_id: profile.id, emoji }).select().single()
      if (data) setReactions(prev => prev.some(r => r.id === data.id) ? prev : [...prev, data])
    }
    setReactPickerFor(null)
  }

  async function createChannel() {
    let name = ncName.trim()
    if (!name) return
    if (!name.startsWith('#')) name = '#' + name
    const { data, error } = await supabase.from('channels')
      .insert({ agency_id: profile.agency_id, client_id: null, name }).select().single()
    if (error || !data) return
    await supabase.from('channel_members').insert({
      channel_id: data.id, profile_id: profile.id, last_read_at: new Date().toISOString(),
    })
    setChannels(prev => [...prev, data])
    setLastRead(prev => ({ ...prev, [data.id]: new Date().toISOString() }))
    setShowNewChan(false); setNcName('')
    openChannel(data.id)
  }

  async function deleteChannel(c: ChatChannel) {
    if (!confirm(`Ištrinti kanalą „${c.name}" su visomis žinutėmis? Atšaukti negalima.`)) return
    const { error } = await supabase.from('channels').delete().eq('id', c.id)
    if (error) return
    const remaining = channels.filter(x => x.id !== c.id)
    setChannels(remaining)
    if (activeId === c.id) {
      const next = remaining.find(x => x.client_id === null) || remaining[0] || null
      if (next) openChannel(next.id)
      else { setActiveId(null); setMessages([]); setReactions([]) }
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('Ištrinti šią žinutę?')) return
    const { error } = await supabase.from('messages').delete().eq('id', id)
    if (error) return
    setMessages(prev => prev.filter(x => x.id !== id && x.parent_id !== id))
    if (threadRootId === id) setThreadRootId(null)
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

  const rootMessages = messages.filter(m => !m.parent_id)
  const repliesOf = (rootId: string) =>
    messages.filter(m => m.parent_id === rootId).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const reactionsOf = (messageId: string) => reactions.filter(r => r.message_id === messageId)

  // Sugrupuotos reakcijos: emoji -> { count, mine }
  function groupedReactions(messageId: string) {
    const map: Record<string, { count: number; mine: boolean }> = {}
    for (const r of reactionsOf(messageId)) {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, mine: false }
      map[r.emoji].count++
      if (r.profile_id === profile.id) map[r.emoji].mine = true
    }
    return Object.entries(map)
  }

  function channelIcon(c: ChatChannel) {
    if (c.client_id === null) return <span style={{ fontWeight: 800, opacity: 0.7 }}>#</span>
    const cl = clients.find(x => x.id === c.client_id)
    return <span style={{ width: 9, height: 9, borderRadius: 3, background: clientColor(cl?.company_name || c.name), flexShrink: 0 }} />
  }

  function ChannelRow({ c }: { c: ChatChannel }) {
    const isActive = activeId === c.id
    const u = unread[c.id] || 0
    const label = c.client_id === null ? c.name.replace(/^#/, '') : c.name
    const deletable = c.client_id === null && c.name !== GENERAL_NAME
    return (
      <div onClick={() => openChannel(c.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px', fontSize: 13, fontWeight: u ? 800 : 600, cursor: 'pointer', background: isActive ? 'var(--primary)' : undefined, color: isActive ? '#1E181C' : undefined }}>
        {channelIcon(c)}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {deletable && isActive ? (
          <span onClick={e => { e.stopPropagation(); deleteChannel(c) }} title="Ištrinti kanalą" style={{ cursor: 'pointer', fontSize: 13 }}>🗑</span>
        ) : u > 0 ? (
          <span style={{ fontSize: 11, fontWeight: 800, minWidth: 18, textAlign: 'center', padding: '1px 6px', borderRadius: 10, background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--primary)', color: '#fff' }}>{u}</span>
        ) : null}
      </div>
    )
  }

  // ===== Vienos žinutės blokas (naudojamas sraute ir gijoje) =====
  function MessageBlock({ m, grouped, inThread }: { m: ChatMessage; grouped: boolean; inThread?: boolean }) {
    const mine = m.author_id === profile.id
    const reps = inThread ? [] : repliesOf(m.id)
    const grx = groupedReactions(m.id)
    return (
      <div
        onMouseEnter={() => setHoverMsg(m.id)}
        onMouseLeave={() => { setHoverMsg(prev => prev === m.id ? null : prev) }}
        style={{ position: 'relative', display: 'flex', gap: 10, marginTop: grouped ? -4 : 0, alignItems: 'flex-start' }}>
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
          {m.body && (
            <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
          )}
          {m.image_url && (
            <a href={m.image_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 4 }}>
              <img src={m.image_url} alt="" style={{ maxWidth: 260, maxHeight: 220, borderRadius: 10, border: '1px solid var(--border)', display: 'block' }} />
            </a>
          )}

          {/* Reakcijų pilės */}
          {grx.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
              {grx.map(([emoji, info]) => (
                <span key={emoji} onClick={() => toggleReaction(m.id, emoji)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '2px 7px', borderRadius: 11, cursor: 'pointer', userSelect: 'none',
                    background: info.mine ? 'rgba(226,61,190,0.16)' : 'var(--surface)',
                    border: `1px solid ${info.mine ? 'var(--primary)' : 'var(--border)'}` }}>
                  <span>{emoji}</span><span style={{ fontWeight: 700 }}>{info.count}</span>
                </span>
              ))}
            </div>
          )}

          {/* Gijos indikatorius (tik sraute) */}
          {!inThread && reps.length > 0 && (
            <div onClick={() => setThreadRootId(m.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '3px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'rgba(226,61,190,0.08)', border: '1px solid rgba(226,61,190,0.25)' }}>
              💬 {reps.length} {reps.length === 1 ? 'atsakymas' : reps.length < 10 ? 'atsakymai' : 'atsakymų'}
            </div>
          )}
        </div>

        {/* Veiksmų juosta (hover) */}
        {hoverMsg === m.id && (
          <div style={{ position: 'absolute', top: grouped ? -6 : 14, right: 0, display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {QUICK_REACTIONS.slice(0, 4).map(e => (
              <span key={e} onClick={() => toggleReaction(m.id, e)} title="Reaguoti"
                style={{ cursor: 'pointer', fontSize: 15, padding: '2px 4px', borderRadius: 5 }}>{e}</span>
            ))}
            <span onClick={e => { e.stopPropagation(); setReactPickerFor(prev => prev === m.id ? null : m.id) }} title="Daugiau emoji"
              style={{ cursor: 'pointer', fontSize: 14, padding: '2px 5px', borderRadius: 5, fontWeight: 800 }}>＋</span>
            {!inThread && (
              <span onClick={() => setThreadRootId(m.id)} title="Atsakyti gijoje"
                style={{ cursor: 'pointer', fontSize: 14, padding: '2px 5px', borderRadius: 5 }}>💬</span>
            )}
            {mine && (
              <span onClick={() => deleteMessage(m.id)} title="Ištrinti"
                style={{ cursor: 'pointer', fontSize: 13, padding: '2px 5px', borderRadius: 5, opacity: 0.6 }}>🗑</span>
            )}
          </div>
        )}

        {/* Emoji picker reakcijai */}
        {reactPickerFor === m.id && (
          <div style={{ position: 'absolute', top: 30, right: 0, zIndex: 60 }}>
            <div style={{ position: 'relative' }}>
              <EmojiPicker onPick={e => toggleReaction(m.id, e)} onClose={() => setReactPickerFor(null)} />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return (
    <div className="view active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 110px)', color: 'var(--text-muted)' }}>
      Kraunamas chatas...
    </div>
  )

  const threadRoot = threadRootId ? messages.find(m => m.id === threadRootId) || null : null

  return (
    <div className="view active" onClick={() => { setReactPickerFor(null) }}>
      <div style={{ display: 'flex', height: 'calc(100vh - 110px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

        {/* ==== Kairė: kanalai ==== */}
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

        {/* ==== Vidurys: pagrindinis srautas ==== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>
              {active ? (active.client_id === null ? active.name : `# ${active.name}`) : '—'}
            </span>
            {active?.client_id && (
              <span className="text-muted" style={{ fontSize: 12 }}>· kliento kanalas (vidinis)</span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rootMessages.length === 0 ? (
              <div className="text-muted" style={{ margin: 'auto', textAlign: 'center', fontSize: 13 }}>
                Žinučių dar nėra. Parašyk pirmą 👇
              </div>
            ) : rootMessages.map((m, i) => {
              const prev = rootMessages[i - 1]
              const grouped = !!prev && prev.author_id === m.author_id &&
                (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000)
              return <MessageBlock key={m.id} m={m} grouped={grouped} />
            })}
            <div ref={bottomRef} />
          </div>

          <Composer
            disabled={!active}
            placeholder={active ? `Rašyk į ${active.client_id === null ? active.name : '#' + active.name}...` : 'Pasirink kanalą'}
            onSubmit={(body, file) => sendMessage(body, file, null)}
          />
        </div>

        {/* ==== Dešinė: gijos panel'is ==== */}
        {threadRoot && (
          <div style={{ width: 360, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'var(--surface)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Gija</span>
              <span onClick={() => setThreadRootId(null)} title="Uždaryti" style={{ cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>✕</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MessageBlock m={threadRoot} grouped={false} inThread />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                {repliesOf(threadRoot.id).length === 0 ? (
                  <div className="text-muted" style={{ fontSize: 12, padding: '8px 0' }}>Dar nėra atsakymų.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
                    {repliesOf(threadRoot.id).map((r, i, arr) => {
                      const prev = arr[i - 1]
                      const grouped = !!prev && prev.author_id === r.author_id &&
                        (new Date(r.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000)
                      return <MessageBlock key={r.id} m={r} grouped={grouped} inThread />
                    })}
                  </div>
                )}
              </div>
              <div ref={threadBottomRef} />
            </div>
            <Composer
              disabled={!active}
              placeholder="Atsakyk gijoje..."
              compact
              onSubmit={(body, file) => sendMessage(body, file, threadRoot.id)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Rašymo laukelis su emoji ir nuotrauka (savarankiškas) =====
function Composer({ disabled, placeholder, compact, onSubmit }: {
  disabled?: boolean
  placeholder: string
  compact?: boolean
  onSubmit: (body: string, file: File | null) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  function pickFile(f: File | null) {
    setFile(f)
    setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return f ? URL.createObjectURL(f) : null })
  }

  async function submit() {
    if (disabled || busy) return
    const body = text.trim()
    if (!body && !file) return
    setBusy(true)
    await onSubmit(body, file)
    setBusy(false)
    setText('')
    pickFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding: compact ? '10px 16px' : '12px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
      {preview && (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
          <img src={preview} alt="" style={{ maxHeight: 90, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }} />
          <span onClick={() => { pickFile(null); if (fileRef.current) fileRef.current.value = '' }} title="Pašalinti"
            style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', background: '#1E181C', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</span>
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0] || null; if (f) pickFile(f) }} />
        <span onClick={() => !disabled && fileRef.current?.click()} title="Pridėti nuotrauką"
          style={{ cursor: disabled ? 'default' : 'pointer', fontSize: 19, padding: '6px 4px', opacity: disabled ? 0.4 : 0.75 }}>📎</span>

        <div style={{ position: 'relative' }}>
          <span onClick={e => { e.stopPropagation(); if (!disabled) setShowEmoji(v => !v) }} title="Emoji"
            style={{ cursor: disabled ? 'default' : 'pointer', fontSize: 19, padding: '6px 4px', opacity: disabled ? 0.4 : 0.75, display: 'inline-block' }}>😊</span>
          {showEmoji && (
            <EmojiPicker
              onPick={e => { setText(t => t + e); taRef.current?.focus() }}
              onClose={() => setShowEmoji(false)} />
          )}
        </div>

        <textarea
          ref={taRef}
          className="form-input"
          rows={1}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          style={{ flex: 1, resize: 'none', fontFamily: 'inherit', maxHeight: 120 }}
        />
        <button className="btn btn-primary" disabled={disabled || busy || (!text.trim() && !file)} onClick={submit}>
          {busy ? '⏳' : 'Siųsti'}
        </button>
      </div>
      {!compact && (
        <div className="text-muted" style={{ fontSize: 10.5, marginTop: 4 }}>Enter — siųsti · Shift+Enter — nauja eilutė · 📎 nuotrauka · 😊 emoji</div>
      )}
    </div>
  )
}
