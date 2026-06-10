'use client'

import { useState } from 'react'
import { lt } from '@/lib/i18n/lt'
import type { ContentPost } from '@/types'
import PostModal from './PostModal'

const STATUS_COLORS: Record<string, string> = {
  draft:     '#9CA3AF',
  review:    '#D97706',
  approved:  '#16A34A',
  rejected:  '#DC2626',
  published: '#4F46E5',
}

interface ContentCalendarProps {
  posts: ContentPost[]
  clientId: string
  role: 'agency_admin' | 'client'
  onPostsChange: (posts: ContentPost[]) => void
}

export default function ContentCalendar({ posts, clientId, role, onPostsChange }: ContentCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Kalendoriaus skaičiavimai
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun, 1=Mon...
  const firstDayAdj = (firstDay + 6) % 7 // pirmadienis = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Grupuoti įrašus pagal dieną
  const postsByDay: Record<number, ContentPost[]> = {}
  const unscheduled: ContentPost[] = []

  posts.forEach(post => {
    if (!post.publish_date) {
      unscheduled.push(post)
      return
    }
    const d = new Date(post.publish_date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!postsByDay[day]) postsByDay[day] = []
      postsByDay[day].push(post)
    }
  })

  function handlePostUpdate(updated: ContentPost) {
    onPostsChange(posts.map(p => p.id === updated.id ? updated : p))
    setSelectedPost(updated)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  // Ląstelės: tušti + dienos
  const cells: (number | null)[] = [
    ...Array(firstDayAdj).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Užpildyti iki pilnos savaitės
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Antraštė */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={navBtnStyle}>{lt.calendar.prev}</button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
            {lt.calendar.months[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>{lt.calendar.next}</button>
        </div>
        {role === 'agency_admin' && (
          <button className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }}>
            {lt.calendar.newPost}
          </button>
        )}
      </div>

      {/* Savaitės dienos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {lt.calendar.weekdays.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#aaa', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Kalendoriaus tinklelis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => (
          <div key={i} style={{
            minHeight: 90,
            borderRadius: 8,
            background: day ? (isToday(day) ? '#EEF2FF' : '#fafafa') : 'transparent',
            border: day ? `1px solid ${isToday(day) ? '#C7D2FE' : '#f0f0f0'}` : 'none',
            padding: day ? '6px' : 0,
          }}>
            {day && (
              <>
                <div style={{ fontSize: 12, fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? '#4338CA' : '#aaa', marginBottom: 4 }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(postsByDay[day] || []).slice(0, 3).map(post => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '2px 6px', borderRadius: 4, border: 'none',
                        background: STATUS_COLORS[post.status] + '22',
                        borderLeft: `3px solid ${STATUS_COLORS[post.status]}`,
                        fontSize: 11, color: '#333', cursor: 'pointer',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                      {post.title}
                    </button>
                  ))}
                  {(postsByDay[day] || []).length > 3 && (
                    <div style={{ fontSize: 10, color: '#aaa', paddingLeft: 4 }}>
                      +{(postsByDay[day] || []).length - 3}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Nesuplanuoti įrašai */}
      {unscheduled.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            {lt.calendar.unscheduled}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unscheduled.map(post => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                style={{
                  padding: '4px 10px', borderRadius: 20, border: 'none',
                  background: STATUS_COLORS[post.status] + '22',
                  borderLeft: `3px solid ${STATUS_COLORS[post.status]}`,
                  fontSize: 12, color: '#333', cursor: 'pointer',
                }}>
                {post.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modalas */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          clientId={clientId}
          role={role}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
        />
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #e5e5e5', borderRadius: 8,
  padding: '4px 12px', cursor: 'pointer', fontSize: 16, color: '#555',
}
