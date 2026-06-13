'use client'

import { fmtDate } from '@/lib/portal-helpers'
import type { Goal } from '@/types'

export default function ClientGoalsView({ goals }: { goals: Goal[] }) {
  return (
    <div className="view active">
      {goals.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Tikslų dar nėra. Agentūra juos nustatys kartu su tavimi.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {goals.map(goal => {
            const pct = goal.target_value > 0 ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) : 0
            const achieved = goal.current_value >= goal.target_value && goal.target_value > 0
            return (
              <div key={goal.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{goal.title}</span>
                    {achieved && <span style={{ background: '#EAF3DE', color: '#27500A', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>✓ Pasiekta</span>}
                  </div>
                  <span className="text-muted" style={{ fontSize: 13, fontWeight: 700 }}>
                    {goal.current_value} / {goal.target_value}{goal.unit ? ` ${goal.unit}` : ''}
                  </span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 99, height: 9, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: achieved ? '#27500A' : 'var(--primary)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{pct}%</span>
                  {goal.deadline && <span>Terminas: {fmtDate(goal.deadline)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
