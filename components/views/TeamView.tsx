'use client'

interface TeamViewProps {
  team: any[]
  clientCount: number
}

export default function TeamView({ team, clientCount }: TeamViewProps) {
  return (
    <div className="view active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Komandos nariai</div>
          <div className="text-muted">{team.length} nariai · {clientCount} klientai</div>
        </div>
        <button className="btn btn-primary">+ Pakviesti</button>
      </div>
      <div className="team-grid">
        {team.map(member => (
          <div key={member.id} className="team-card">
            <div className="team-avatar" style={{ background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 auto 12px' }}>
              {(member.full_name || member.email || 'U').slice(0,2).toUpperCase()}
            </div>
            <div className="team-name" style={{ fontWeight: 700, fontSize: 14, textAlign: 'center', marginBottom: 2 }}>{member.full_name || '(be vardo)'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>{member.email}</div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: member.role === 'agency_admin' ? 'var(--primary-light)' : 'var(--bg)', color: member.role === 'agency_admin' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600 }}>
                {member.role === 'agency_admin' ? 'Admin' : 'Narys'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
