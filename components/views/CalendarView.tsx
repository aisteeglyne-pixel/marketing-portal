'use client'

import { useState } from 'react'
import { PLATFORM_COLORS, DAYS_LT, MONTHS_LT } from '@/lib/portal-constants'
import { clientColor, clientInitials } from '@/lib/portal-helpers'
import type { Client, ContentPost } from '@/types'

interface CalendarViewProps {
  posts: ContentPost[]
  clientMap: Record<string, Client>
  onNewPost: () => void
  onSelectPost: (post: ContentPost) => void
}

export default function CalendarView({ posts, clientMap, onNewPost, onSelectPost }: CalendarViewProps) {
  const [calDate, setCalDate] = useState(new Date())
  const [platformFilter, setPlatformFilter] = useState('all')
  const now = new Date()
  const year = calDate.getFullYear()
  const month = calDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const totalCells = Math.ceil((adjustedFirst + daysInMonth) / 7) * 7

  function postsForDay(day: number) {
    return posts.filter(p => {
      if (!p.publish_date) return false
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false
      const d = new Date(p.publish_date)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const statusIcon = (s: string) => s === 'draft' ? '✏️' : s === 'review' ? '🔎' : ['approved','published','scheduled'].includes(s) ? '✅' : ''

  return (
    <div className="view active">
      <div className="calendar-toolbar">
        <div className="cal-nav">
          <button className="btn btn-outline btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
          <div className="cal-month">{MONTHS_LT[month]} {year}</div>
          <button className="btn btn-outline btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setCalDate(new Date())}>Šiandien</button>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary btn-sm" onClick={onNewPost}>+ Naujas įrašas</button>
        </div>
      </div>
      <div className="cal-filter" style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Filtras:</span>
        <span className={`platform-filter${platformFilter === 'all' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setPlatformFilter('all')}>Visi</span>
        {Object.entries(PLATFORM_COLORS).map(([p, c]) => (
          <span key={p} className={`platform-filter${platformFilter === p ? ' active' : ''}`} style={{ color: c, cursor: 'pointer' }} onClick={() => setPlatformFilter(p)}>● {p}</span>
        ))}
      </div>
      <div className="calendar-grid">
        <div className="cal-header">
          {DAYS_LT.map(d => <div key={d} className="cal-header-day">{d}</div>)}
        </div>
        <div className="cal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {Array.from({ length: totalCells }).map((_, i) => {
            let day: number, otherMonth = false
            if (i < adjustedFirst) {
              day = daysInPrevMonth - adjustedFirst + 1 + i
              otherMonth = true
            } else if (i >= adjustedFirst + daysInMonth) {
              day = i - adjustedFirst - daysInMonth + 1
              otherMonth = true
            } else {
              day = i - adjustedFirst + 1
            }
            const dayPosts = otherMonth ? [] : postsForDay(day)
            const visible = dayPosts.slice(0, 4)
            const isToday = !otherMonth && now.getDate() === day && now.getMonth() === month && now.getFullYear() === year
            return (
              <div key={i} className={`cal-cell${otherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`}
                style={{ minHeight: 84, padding: 6, background: 'var(--surface)', borderRadius: 8, border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)', opacity: otherMonth ? 0.4 : 1, position: 'relative' }}>
                <div className="cal-day-num" style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--primary)' : 'var(--text)', marginBottom: 4 }}>{day}</div>
                {visible.map(post => {
                  const isStory = post.content_type === 'story'
                  const pColor = isStory ? '#fa709a' : (PLATFORM_COLORS[post.platform] || '#FF68D8')
                  const client = post.client_id ? clientMap[post.client_id] : null
                  return (
                    <div key={post.id} className={`cal-post${isStory ? ' is-story' : ''}`}
                      onClick={e => { e.stopPropagation(); onSelectPost(post) }}
                      title={`${client?.company_name || '—'} · ${post.title} · ${post.platform}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 4px', borderRadius: 4, marginBottom: 2, background: `${pColor}18`, color: isStory ? '#c05c7e' : pColor, overflow: 'hidden', cursor: 'pointer' }}>
                      {client && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 3, background: clientColor(client.company_name), color: '#fff', fontSize: 7, fontWeight: 900, flexShrink: 0 }} title={client.company_name}>
                          {clientInitials(client.company_name)}
                        </span>
                      )}
                      {post.media_url && !post.media_url.match(/\.(mp4|mov|webm)/i)
                        ? <img src={post.media_url} style={{ width: 10, height: 10, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} alt="" />
                        : <div className="cal-post-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: pColor, flexShrink: 0 }} />}
                      <span style={{ fontSize: 9, fontWeight: 800, opacity: 0.7, flexShrink: 0 }}>{post.platform.slice(0, 2).toUpperCase()}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title.substring(0, 10)}{post.title.length > 10 ? '…' : ''}</span>
                      <span style={{ fontSize: 9, flexShrink: 0, marginLeft: 'auto' }} title={post.status}>{statusIcon(post.status)}</span>
                    </div>
                  )
                })}
                {dayPosts.length > 4 && <div className="cal-more" style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>+{dayPosts.length - 4} daugiau</div>}
                {!otherMonth && (
                  <div className="cal-add-btn" onClick={onNewPost} title="Naujas įrašas">+</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
