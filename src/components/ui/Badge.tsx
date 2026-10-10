import clsx from 'clsx'
import { humanize } from '@/lib/format'
import type { AccountStatus, BookingStatus, EnquiryStatus, InvoiceStatus, PaymentKind, PaymentStatus } from '@/lib/types'

type Tone = 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'violet'

const tones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
}

export function Badge({ tone, children, dot = true }: { tone: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        tones[tone],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

const bookingTone: Record<BookingStatus, Tone> = {
  UPCOMING: 'blue',
  ONGOING: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
}
export const BookingStatusBadge = ({ status }: { status: BookingStatus }) => (
  <Badge tone={bookingTone[status]}>{humanize(status)}</Badge>
)

const paymentTone: Record<PaymentStatus, Tone> = {
  PENDING: 'gray',
  ADVANCE: 'amber',
  PAID: 'green',
  REFUND: 'violet',
}
export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge tone={paymentTone[status]}>{status === 'REFUND' ? 'Refunded' : humanize(status)}</Badge>
)

const invoiceTone: Record<InvoiceStatus, Tone> = {
  UNPAID: 'gray',
  PARTIAL: 'amber',
  PAID: 'green',
  REFUNDED: 'violet',
  CANCELLED: 'red',
}
export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => (
  <Badge tone={invoiceTone[status]}>{humanize(status)}</Badge>
)

const kindTone: Record<PaymentKind, Tone> = { ADVANCE: 'amber', PAID: 'green', REFUND: 'violet' }
export const PaymentKindBadge = ({ kind }: { kind: PaymentKind }) => (
  <Badge tone={kindTone[kind]}>{humanize(kind)}</Badge>
)

export const AccountStatusBadge = ({ status }: { status: AccountStatus }) => (
  <Badge tone={status === 'ACTIVE' ? 'green' : 'gray'}>{humanize(status)}</Badge>
)

const enquiryTone: Record<EnquiryStatus, Tone> = { NEW: 'blue', CONTACTED: 'amber', CLOSED: 'gray' }
export const EnquiryStatusBadge = ({ status }: { status: EnquiryStatus }) => (
  <Badge tone={enquiryTone[status]}>{humanize(status)}</Badge>
)
