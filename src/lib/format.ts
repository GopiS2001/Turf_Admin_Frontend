import { format, parseISO } from 'date-fns'

export const formatINR = (amount: number | null | undefined) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: amount != null && amount % 1 !== 0 ? 2 : 0,
  }).format(amount ?? 0)

/** Compact axis label: ₹12k */
export const formatINRShort = (amount: number) =>
  amount >= 1000 ? `₹${Math.round(amount / 100) / 10}k` : `₹${amount}`

/** "2026-10-08" → "Thu, 8 Oct 2026" */
export const formatDate = (iso: string | null | undefined, pattern = 'EEE, d MMM yyyy') =>
  iso ? format(parseISO(iso), pattern) : '—'

/** ISO datetime → "8 Oct 2026, 7:30 PM" */
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? format(new Date(iso), 'd MMM yyyy, h:mm a') : '—'

/** "19:30:00" | "24:00:00" → "7:30 PM" / "12:00 AM" */
export function formatTime(t: string | null | undefined) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const hh = h % 24
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}:${String(m).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
}

export const formatTimeRange = (timeIn: string, timeOut: string) =>
  `${formatTime(timeIn)} – ${formatTime(timeOut)}`

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')

/** "BANK_TRANSFER" → "Bank Transfer" */
export const humanize = (value: string | null | undefined) =>
  value
    ? value
        .toLowerCase()
        .split('_')
        .map((w) => (w === 'upi' ? 'UPI' : w[0].toUpperCase() + w.slice(1)))
        .join(' ')
    : '—'

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
