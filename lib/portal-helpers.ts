import { STATUS_META } from './portal-constants'

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label || status
}

export const TYPE_ICONS: Record<string, string> = { post: '📝', story: '📖', reel: '🎬' }

export function typeIcon(contentType?: string | null): string {
  return TYPE_ICONS[contentType || 'post'] || '📝'
}

const CLIENT_PALETTE = ['#C62828', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100', '#00838F', '#AD1457', '#4527A0']

export function clientColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return CLIENT_PALETTE[h % CLIENT_PALETTE.length]
}

export function clientInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('lt-LT')
}

export function fmtTime(d?: string | null): string {
  if (!d) return ''
  const t = new Date(d)
  if (t.getHours() === 0 && t.getMinutes() === 0) return ''
  return t.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })
}

export function isVideoUrl(url?: string | null): boolean {
  return !!url?.match(/\.(mp4|mov|webm)/i)
}
