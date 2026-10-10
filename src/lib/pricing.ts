// Mirrors Backend/src/pricing/pricing.calc.ts for a live estimate in the booking form.
// The server recalculates on save, so this is only a preview.
import { parseISO } from 'date-fns'
import type { PricingPlan } from './types'

export const OPEN_MIN = 6 * 60
export const CLOSE_MIN = 24 * 60
const NIGHT_START_MIN = 18 * 60
const SLOT = 30

/** "06:00", "06:30", … "24:00" */
export const TIME_OPTIONS = Array.from({ length: (CLOSE_MIN - OPEN_MIN) / SLOT + 1 }, (_, i) => {
  const m = OPEN_MIN + i * SLOT
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function planFor(date: string, minute: number): PricingPlan['id'] {
  const day = parseISO(date).getDay()
  if (day === 0 || day === 6) return 'weekend'
  return minute >= NIGHT_START_MIN ? 'weekday-night' : 'weekday-day'
}

export function estimatePrice(input: {
  plans: PricingPlan[]
  date: string
  timeIn: string
  timeOut: string
  additionalGuests: number
  pricePerHour?: number
  maxGuests?: number
  pricePerGuest?: number
}) {
  const start = toMinutes(input.timeIn)
  const end = toMinutes(input.timeOut)
  if (!input.date || !input.plans.length || end <= start) return null

  const find = (id: PricingPlan['id']) => input.plans.find((p) => p.id === id)
  let turf = 0
  for (let m = start; m < end; m += SLOT) turf += ((find(planFor(input.date, m))?.pricePerHour ?? 0) * SLOT) / 60

  const first = find(planFor(input.date, start))
  const totalHours = (end - start) / 60
  const turfAmount = input.pricePerHour != null ? input.pricePerHour * totalHours : turf
  const pricePerGuest = input.pricePerGuest ?? first?.pricePerGuest ?? 0
  const additionalGuestAmount = input.additionalGuests * pricePerGuest

  return {
    planName: first?.name ?? '',
    totalHours,
    pricePerHour: input.pricePerHour ?? turfAmount / totalHours,
    turfAmount,
    maxGuests: input.maxGuests ?? first?.maxGuests ?? 0,
    pricePerGuest,
    additionalGuestAmount,
    totalAmount: turfAmount + additionalGuestAmount,
  }
}
