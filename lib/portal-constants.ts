export const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C', Facebook: '#1877F2', LinkedIn: '#0A66C2',
  TikTok: '#010101', X: '#1DA1F2', YouTube: '#FF0000',
}

export const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Juodraštis',  bg: '#F3F4F6', color: '#6B7280' },
  review:    { label: 'Peržiūra',    bg: '#FEF3C7', color: '#92400E' },
  approved:  { label: 'Patvirtinta', bg: '#D1FAE5', color: '#065F46' },
  rejected:  { label: 'Atmesta',     bg: '#FEE2E2', color: '#991B1B' },
  published: { label: 'Paskelbta',   bg: '#EEF2FF', color: '#3730A3' },
  scheduled: { label: 'Suplanuota',  bg: '#E0F2FE', color: '#075985' },
}

export const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200, Facebook: 63206, LinkedIn: 3000, TikTok: 2200, X: 280, YouTube: 5000,
}

export const DAYS_LT = ['Pir', 'Ant', 'Tre', 'Ket', 'Pen', 'Šeš', 'Sek']

export const MONTHS_LT = ['Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis','Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis']
