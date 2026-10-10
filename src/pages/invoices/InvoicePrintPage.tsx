import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { DocumentActions } from '@/components/DocumentActions'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { useInvoice } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatDate, formatDateTime, formatINR, formatTime, humanize } from '@/lib/format'

// Business details printed on the invoice — keep in step with Website/src/lib/site.ts.
const BUSINESS = {
  name: '90s Turf',
  address: 'Mannarpalayam Main Road, Mannarpalayam Pirivu, Salem, Tamil Nadu 636017',
  phone: '+91 98765 43210',
  email: 'hello@90sturf.in',
}

export function InvoicePrintPage() {
  const { id } = useParams()
  const { data: inv, isPending, error } = useInvoice(Number(id))

  useEffect(() => {
    if (inv) document.title = `${inv.invoiceCode} · ${BUSINESS.name}`
  }, [inv])

  if (isPending) return <p className="p-10 text-sm text-muted">Loading invoice…</p>
  if (error) return <p className="p-10 text-sm text-red-600">{errorMessage(error)}</p>

  const b = inv.booking
  // Nothing is owed on a cancelled or refunded invoice.
  const balance = inv.status === 'CANCELLED' || inv.status === 'REFUNDED' ? 0 : Math.max(0, inv.amount - inv.paidAmount)

  return (
    <div className="min-h-dvh bg-cream py-10 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-start justify-between gap-4 px-4">
        <DocumentActions type="invoice" bookingId={inv.bookingId} filename={`${inv.invoiceCode}.pdf`} customerEmail={b?.customerEmail} />
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <article className="mx-auto max-w-3xl bg-white p-10 shadow-card print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" className="h-12 w-12" />
            <div>
              <p className="font-display text-3xl leading-none tracking-wider text-navy">
                90<span className="text-turf">s</span> TURF
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted">{BUSINESS.address}</p>
              <p className="text-xs text-muted">
                {BUSINESS.phone} · {BUSINESS.email}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-navy">Invoice</p>
            <p className="mt-1 font-medium text-navy">{inv.invoiceCode}</p>
            <p className="text-sm text-muted">{formatDateTime(inv.invoiceDate)}</p>
            <div className="mt-2">
              <InvoiceStatusBadge status={inv.status} />
            </div>
          </div>
        </header>

        <section className="grid gap-6 py-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Billed to</p>
            <p className="mt-1 font-medium text-navy">{inv.customerName}</p>
            {b && <p className="text-sm text-muted">{b.customerPhone}</p>}
            {b?.customerEmail && <p className="text-sm text-muted">{b.customerEmail}</p>}
          </div>
          {b && (
            <div className="sm:text-right">
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">Booking</p>
              <p className="mt-1 font-medium text-navy">{b.bookingCode}</p>
              <p className="text-sm text-muted">
                {formatDate(b.bookingDate)} · {formatTime(b.timeIn)} – {formatTime(b.timeOut)}
              </p>
            </div>
          )}
        </section>

        {b && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy text-left">
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Rate</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-3">Turf booking</td>
                <td className="py-3 text-right tabular-nums">{b.totalHours} hr</td>
                <td className="py-3 text-right tabular-nums">{formatINR(b.pricePerHour)}</td>
                <td className="py-3 text-right tabular-nums">{formatINR(b.turfAmount)}</td>
              </tr>
              {b.additionalGuests > 0 && (
                <tr>
                  <td className="py-3">Additional guests (above {b.maxGuests})</td>
                  <td className="py-3 text-right tabular-nums">{b.additionalGuests}</td>
                  <td className="py-3 text-right tabular-nums">{formatINR(b.pricePerGuest)}</td>
                  <td className="py-3 text-right tabular-nums">{formatINR(b.additionalGuestAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Total</span>
            <span className="font-semibold tabular-nums">{formatINR(inv.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Paid</span>
            <span className="tabular-nums">{formatINR(inv.paidAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-navy pt-2 text-base">
            <span className="font-semibold">Balance due</span>
            <span className="font-semibold tabular-nums">{formatINR(balance)}</span>
          </div>
        </div>

        {b?.payments && b.payments.length > 0 && (
          <section className="mt-10">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Payment history</p>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-line">
                {b.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{formatDateTime(p.paidAt)}</td>
                    <td className="py-2">
                      {humanize(p.kind)} · {humanize(p.paymentType)}
                      {p.transactionId && <span className="text-muted"> · {p.transactionId}</span>}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {p.kind === 'REFUND' ? '−' : ''}
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="mt-12 border-t border-line pt-6 text-center text-xs text-muted">Thank you for playing at {BUSINESS.name}!</footer>
      </article>
    </div>
  )
}
