'use client'

import { useState } from 'react'
import { PLATFORM_COLORS, DAYS_LT, MONTHS_LT } from '@/lib/portal-constants'
import type { ContentPost } from '@/types'

interface CalendarViewProps {
  posts: ContentPost[]
  onNewPost: () => void
  onSelectPost: (post: ContentPost) => void
}

export default function CalendarView({ posts, onNewPost, onSelectPost }: CalendarViewProps) {
  const [calDate, setCalDate] = useState(new Date())
  const [platformFilter, setPlatformFilter] = useState('all')
  const now = new Date()

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfMonth(year: number, month: number) {
    const d = new Date(year, month, 1).getDay()
    return d === 0 ? 6 : d - 1 // Mon=0
  }
  function getPostsForDay(day: number) {
    return posts.filter(p => {
      if (!p.publish_date) return false
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false
      const d = new Date(p.publish_date)
      return d.getFullYear() === calDate.getFullYear() && d.getMonth() === calDate.getMonth() && d.getDate() === day
    })
  }

  return (
    <div className="view active">
      <div className="calendar-toolbar">
        <div className="cal-nav">
          <button className="btn btn-outline btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
          <div className="cal-month">{MONTHS_LT[calDate.getMonth()]} {calDate.getFullYear()}</div>
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
          {Array.from({ length: getFirstDayOfMonth(calDate.getFullYear(), calDate.getMonth()) }).map((_, i) => (
            <div key={`empty-${i}`} className="cal-day" style={{ background: 'transparent', border: 'none' }} />
          ))}
          {Array.from({ length: getDaysInMonth(calDate.getFullYear(), calDate.getMonth()) }).map((_, i) => {
            const day = i + 1
            const dayPosts = getPostsForDay(day)
            const isToday = now.getDate() === day && now.getMonth() === calDate.getMonth() && now.getFullYear() === calDate.getFullYear()
            return (
              <div key={day} className="cal-day" style={{ minHeight: 80, padding: 8, background: 'var(--surface)', borderRadius: 8, border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                <div className="cal-day-num" style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--primary)' : 'var(--text)', marginBottom: 4 }}>{day}</div>
                {dayPosts.map(post => (
                  <div key={post.id} className="cal-post" onClick={() => onSelectPost(post)} style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, marginBottom: 2, background: PLATFORM_COLORS[post.platform] || 'var(--primary)', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    {post.title}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
