import { zodResolver } from '@hookform/resolvers/zod'
import { Ban, FileText, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router'
import { z } from 'zod'
import { BookingStatusBadge, InvoiceStatusBadge, PaymentKindBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Field, Input, Select } from '@/components/ui/Form'
import { DocumentActions } from '@/components/DocumentActions'
import { ConfirmDialog, Drawer } from '@/components/ui/Overlay'
import { useAddPayment, useBooking, useDeletePayment } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import { formatDate, formatDateTime, formatINR, formatTime, humanize } from '@/lib/format'
import type { Booking } from '@/lib/types'

const paymentSchema = z.object({
  amount: z.preprocess((v) => Number(v), z.number({ error: 'Enter an amount' }).positive('Enter an amount above 0')),
  kind: z.enum(['PAYMENT', 'REFUND']),
  paymentType: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  transactionId: z.string().trim().max(100).optional(),
})
type PaymentIn = z.input<typeof paymentSchema>
type PaymentOut = z.output<typeof paymentSchema>

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-navy">{children}</dd>
    </div>
  )
}

function AddPaymentForm({ booking }: { booking: Booking }) {
  const add = useAddPayment()
  const balance = Math.max(0, booking.totalAmount - booking.amountPaid)
  const cancelled = booking.status === 'CANCELLED'
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentIn, unknown, PaymentOut>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      // Cancelled: offer to refund what was paid. Otherwise: collect the balance.
      amount: (cancelled ? booking.amountPaid : balance) || '',
      kind: cancelled ? 'REFUND' : 'PAYMENT',
      paymentType: 'UPI',
      transactionId: '',
    },
  })

  async function onSubmit(v: PaymentOut) {
    try {
      await add.mutateAsync({
        bookingId: booking.id,
        input: {
          amount: v.amount,
          paymentType: v.paymentType,
          kind: v.kind === 'REFUND' ? 'REFUND' : undefined,
          transactionId: v.transactionId || undefined,
        },
      })
      toast.success(v.kind === 'REFUND' ? 'Refund recorded' : 'Payment recorded')
      reset({ amount: '', kind: 'PAYMENT', paymentType: v.paymentType, transactionId: '' })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 rounded-xl border border-line p-4">
      <p className="text-sm font-semibold text-navy">Record a payment</p>
      <p className="text-xs text-muted">
        Balance due {formatINR(balance)}
        {cancelled && ' · cancelled bookings can only be refunded'}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Amount (₹)" htmlFor="p-amount" error={errors.amount?.message}>
          <Input id="p-amount" type="number" min={0} step="0.01" {...register('amount')} invalid={!!errors.amount} />
        </Field>
        <Field label="Type" htmlFor="p-kind">
          <Select id="p-kind" {...register('kind')}>
            {!cancelled && <option value="PAYMENT">Payment / advance</option>}
            <option value="REFUND">Refund</option>
          </Select>
        </Field>
        <Field label="Method" htmlFor="p-type">
          <Select id="p-type" {...register('paymentType')}>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </Select>
        </Field>
        <Field label="Transaction ID" htmlFor="p-txn">
          <Input id="p-txn" placeholder="Optional" {...register('transactionId')} />
        </Field>
      </div>
      <button type="submit" className="btn-primary mt-4 w-full" disabled={add.isPending}>
        {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save
      </button>
    </form>
  )
}

export function BookingDetailDrawer({
  bookingId,
  onClose,
  onEdit,
  onCancel,
  onDelete,
}: {
  bookingId: number | null
  onClose: () => void
  onEdit: (b: Booking) => void
  onCancel: (b: Booking) => void
  onDelete: (b: Booking) => void
}) {
  const { user } = useAuth()
  const { data: b, isPending, error } = useBooking(bookingId)
  const removePayment = useDeletePayment()
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null)
  const isAdmin = user?.role === 'ADMIN'
  const canEdit = b && b.status !== 'CANCELLED'
  const canCancel = b && (b.status === 'UPCOMING' || b.status === 'ONGOING')

  return (
    <Drawer
      open={bookingId != null}
      onClose={onClose}
      title={b ? b.bookingCode : 'Booking'}
      subtitle={b && <span className="inline-flex flex-wrap gap-2 pt-1"><BookingStatusBadge status={b.status} /> <PaymentStatusBadge status={b.paymentStatus} /></span>}
      footer={
        b && (
          <>
            {isAdmin && (
              <button type="button" className="btn-ghost mr-auto text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(b)}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
            {canCancel && (
              <button type="button" className="btn-secondary" onClick={() => onCancel(b)}>
                <Ban className="h-4 w-4" /> Cancel booking
              </button>
            )}
            {canEdit && (
              <button type="button" className="btn-primary" onClick={() => onEdit(b)}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )}
          </>
        )
      }
    >
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-cream" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error)}</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Customer</h3>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Customer name">{b.customerName}</Row>
              <Row label="Phone">
                <a href={`tel:${b.customerPhone.replace(/\s/g, '')}`} className="text-turf hover:underline">
                  {b.customerPhone}
                </a>
              </Row>
              {b.customerEmail && <Row label="Email">{b.customerEmail}</Row>}
              <Row label="Booked via">{humanize(b.source)}</Row>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Booking</h3>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Booking date">{formatDate(b.bookingDate)}</Row>
              <Row label="Time in">{formatTime(b.timeIn)}</Row>
              <Row label="Time out">{formatTime(b.timeOut)}</Row>
              <Row label="Total hours">{b.totalHours}</Row>
              <Row label="Price (per hour)">{formatINR(b.pricePerHour)}</Row>
              <Row label="Turf booking amount">{formatINR(b.turfAmount)}</Row>
              <Row label="Maximum guests">{b.maxGuests}</Row>
              <Row label="Price per guest">{formatINR(b.pricePerGuest)}</Row>
              <Row label="Additional guests">{b.additionalGuests}</Row>
              <Row label="Additional guest amount">{formatINR(b.additionalGuestAmount)}</Row>
              <Row label="Total amount">
                <span className="text-base">{formatINR(b.totalAmount)}</span>
              </Row>
              <Row label="Booked date & time">{formatDateTime(b.bookedAt)}</Row>
              {b.notes && <Row label="Notes">{b.notes}</Row>}
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Payment</h3>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Payment status">
                <PaymentStatusBadge status={b.paymentStatus} />
              </Row>
              <Row label="Total amount paid">{formatINR(b.amountPaid)}</Row>
              {b.amountPaid > b.totalAmount + 0.005 ? (
                <Row label="Overpaid">
                  <span className="text-amber-700">{formatINR(b.amountPaid - b.totalAmount)}</span>
                  <span className="block text-xs font-normal text-muted">The total went down after payment — record a refund.</span>
                </Row>
              ) : (
                <Row label="Balance">{formatINR(Math.max(0, b.totalAmount - b.amountPaid))}</Row>
              )}
              <Row label="Payment type">{humanize(b.paymentType)}</Row>
              <Row label="Transaction ID">{b.transactionId ?? '—'}</Row>
              <Row label="Payment date & time">{formatDateTime(b.paymentDate)}</Row>
              {b.invoice && (
                <Row label="Invoice">
                  <Link to={`/invoices?view=${b.invoice.id}`} className="inline-flex items-center gap-1.5 text-turf hover:underline">
                    <FileText className="h-4 w-4" /> {b.invoice.invoiceCode}
                  </Link>{' '}
                  <InvoiceStatusBadge status={b.invoice.status} />
                </Row>
              )}
            </dl>

            {b.payments && b.payments.length > 0 && (
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <PaymentKindBadge kind={p.kind} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium tabular-nums">
                        {p.kind === 'REFUND' ? '−' : ''}
                        {formatINR(p.amount)} · {humanize(p.paymentType)}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {formatDateTime(p.paidAt)}
                        {p.transactionId && ` · ${p.transactionId}`}
                      </span>
                    </span>
                    {isAdmin && (
                      <button type="button" className="btn-ghost text-muted hover:text-red-600" onClick={() => setPaymentToDelete(p.id)} aria-label="Delete payment">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {(b.status !== 'CANCELLED' || b.amountPaid > 0) && <AddPaymentForm key={`${b.id}-${b.status}-${b.amountPaid}-${b.totalAmount}`} booking={b} />}
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Documents</h3>
            <p className="mt-1 text-xs text-muted">
              Sent to the customer automatically when the booking is made and when it's fully paid (if they have an email).
            </p>
            <div className="mt-3 space-y-4">
              <div className="rounded-xl border border-line p-4">
                <p className="mb-3 text-sm font-semibold text-navy">Booking confirmation</p>
                <DocumentActions type="booking" bookingId={b.id} filename={`Booking-${b.bookingCode}.pdf`} customerEmail={b.customerEmail} compact />
              </div>
              {b.invoice && (
                <div className="rounded-xl border border-line p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
                    Invoice {b.invoice.invoiceCode} <InvoiceStatusBadge status={b.invoice.status} />
                  </p>
                  <DocumentActions type="invoice" bookingId={b.id} filename={`${b.invoice.invoiceCode}.pdf`} customerEmail={b.customerEmail} compact />
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={paymentToDelete != null}
        title="Delete this payment?"
        message="Use this only to fix a mistake. The booking and invoice totals will be recalculated."
        confirmLabel="Delete payment"
        danger
        busy={removePayment.isPending}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={async () => {
          try {
            await removePayment.mutateAsync(paymentToDelete!)
            toast.success('Payment deleted')
            setPaymentToDelete(null)
          } catch (err) {
            toast.error(errorMessage(err))
          }
        }}
      />
    </Drawer>
  )
}
