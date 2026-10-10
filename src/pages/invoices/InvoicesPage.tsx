import clsx from 'clsx'
import { Download, Eye, Loader2, Printer } from 'lucide-react'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router'
import { DocumentActions } from '@/components/DocumentActions'
import { InvoiceStatusBadge, PaymentKindBadge } from '@/components/ui/Badge'
import { Field, Input, Select } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { PageHeader, Pagination, SearchInput, TableState, td, th } from '@/components/ui/Table'
import { downloadDocument, useInvoice, useInvoices, useUpdateInvoice } from '@/hooks/queries'
import { useUrlUpdater } from '@/hooks/useUrlUpdater'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import { formatDate, formatDateTime, formatINR, formatTimeRange, humanize } from '@/lib/format'
import type { Invoice, InvoiceStatus } from '@/lib/types'

const LIMIT = 10
const STATUSES: InvoiceStatus[] = ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED']

function DownloadButton({ bookingId, filename, label }: { bookingId: number; filename: string; label: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="btn-ghost"
      aria-label={label}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await downloadDocument('invoice', bookingId, filename)
        } catch (err) {
          toast.error(errorMessage(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  )
}

function InvoiceEditForm({ invoice }: { invoice: Invoice }) {
  const update = useUpdateInvoice()
  const [name, setName] = useState(invoice.customerName)
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status)
  const dirty = name.trim() !== invoice.customerName || status !== invoice.status

  return (
    <form
      className="space-y-4 rounded-xl border border-line p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (name.trim().length < 2) return toast.error('Enter the customer name')
        try {
          await update.mutateAsync({ id: invoice.id, input: { customerName: name.trim(), status } })
          toast.success('Invoice updated')
        } catch (err) {
          toast.error(errorMessage(err))
        }
      }}
    >
      <p className="font-semibold text-navy">Edit invoice</p>
      <Field label="Customer name" htmlFor="inv-name">
        <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Status" htmlFor="inv-status" hint="Normally set automatically from payments — recording a payment updates it again.">
        <Select id="inv-status" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </Field>
      <button type="submit" className="btn-primary w-full" disabled={!dirty || update.isPending}>
        {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save invoice
      </button>
    </form>
  )
}

function InvoiceDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { user } = useAuth()
  const { data: inv, isPending, error } = useInvoice(id)

  return (
    <Drawer
      open={id != null}
      onClose={onClose}
      title={inv?.invoiceCode ?? 'Invoice'}
      subtitle={inv && <InvoiceStatusBadge status={inv.status} />}
      footer={
        inv && (
          <Link to={`/invoices/${inv.id}/print`} target="_blank" className="btn-secondary">
            <Printer className="h-4 w-4" /> Print view
          </Link>
        )
      }
    >
      {isPending ? (
        <div className="h-40 animate-pulse rounded-lg bg-cream" />
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error)}</p>
      ) : (
        <div className="space-y-6 text-sm">
          <dl className="divide-y divide-line">
            {[
              ['Invoice code', inv.invoiceCode],
              ['Customer name', inv.customerName],
              ['Invoice date & time', formatDateTime(inv.invoiceDate)],
              ['Payment amount', formatINR(inv.amount)],
              ['Amount paid', formatINR(inv.paidAmount)],
              ['Paid date & time', formatDateTime(inv.paidAt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium text-navy">{v}</dd>
              </div>
            ))}
            {inv.booking && (
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted">Booking</dt>
                <dd className="text-right">
                  <Link to={`/bookings?view=${inv.booking.id}`} className="font-medium text-turf hover:underline">
                    {inv.booking.bookingCode}
                  </Link>
                  <span className="block text-xs text-muted">
                    {formatDate(inv.booking.bookingDate)} · {formatTimeRange(inv.booking.timeIn, inv.booking.timeOut)}
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <div className="rounded-xl bg-cream p-4">
            <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Invoice PDF</p>
            <DocumentActions type="invoice" bookingId={inv.bookingId} filename={`${inv.invoiceCode}.pdf`} customerEmail={inv.booking?.customerEmail} />
          </div>

          {inv.booking?.payments && inv.booking.payments.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Payments</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {inv.booking.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <PaymentKindBadge kind={p.kind} />
                    <span className="flex-1 tabular-nums">
                      {p.kind === 'REFUND' ? '−' : ''}
                      {formatINR(p.amount)} · {humanize(p.paymentType)}
                    </span>
                    <span className="text-xs text-muted">{formatDateTime(p.paidAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {user?.role === 'ADMIN' && <InvoiceEditForm key={`${inv.id}-${inv.updatedAt}`} invoice={inv} />}
        </div>
      )}
    </Drawer>
  )
}

export function InvoicesPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const status = (params.get('status') as InvoiceStatus | null) ?? undefined
  const from = params.get('from') ?? undefined
  const to = params.get('to') ?? undefined
  const page = Number(params.get('page') ?? 1)
  const viewId = params.get('view') ? Number(params.get('view')) : null
  const list = useInvoices({ q: q || undefined, status, from, to, page, limit: LIMIT })

  const update = useUrlUpdater()
  const onSearch = useCallback((value: string) => update({ q: value }), [update])

  return (
    <>
      <PageHeader title="Invoices" description="One invoice per booking, kept in step with its payments." />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchInput value={q} onChange={onSearch} placeholder="Search invoice, customer or booking" className="w-full sm:w-80" />
          <Select aria-label="Invoice status" value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined })} className="w-auto">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Invoices from" value={from ?? ''} max={to} onChange={(e) => update({ from: e.target.value || undefined })} className="w-auto" />
            <span className="text-sm text-muted">to</span>
            <Input type="date" aria-label="Invoices to" value={to ?? ''} min={from} onChange={(e) => update({ to: e.target.value || undefined })} className="w-auto" />
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream/60">
              <tr>
                <th className={th}>Invoice code</th>
                <th className={th}>Customer</th>
                <th className={th}>Invoice date</th>
                <th className={clsx(th, 'text-right')}>Payment amount</th>
                <th className={clsx(th, 'text-right')}>Paid</th>
                <th className={th}>Paid date</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <TableState
                loading={list.isPending}
                error={list.error ? errorMessage(list.error) : null}
                empty={!!list.data && list.data.data.length === 0}
                colSpan={8}
                emptyText="No invoices match these filters."
                onRetry={() => list.refetch()}
              />
              {list.data?.data.map((inv) => (
                <tr key={inv.id} className={clsx('hover:bg-cream/50', list.isPlaceholderData && 'opacity-60')}>
                  <td className={td}>
                    <button type="button" className="font-medium text-turf hover:underline" onClick={() => update({ view: String(inv.id) }, true)}>
                      {inv.invoiceCode}
                    </button>
                    {inv.booking && <span className="block text-xs text-muted">{inv.booking.bookingCode}</span>}
                  </td>
                  <td className={td}>{inv.customerName}</td>
                  <td className={td}>{formatDateTime(inv.invoiceDate)}</td>
                  <td className={clsx(td, 'text-right font-medium tabular-nums')}>{formatINR(inv.amount)}</td>
                  <td className={clsx(td, 'text-right tabular-nums')}>{formatINR(inv.paidAmount)}</td>
                  <td className={td}>{formatDateTime(inv.paidAt)}</td>
                  <td className={td}>
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className={clsx(td, 'text-right')}>
                    <button type="button" className="btn-ghost" onClick={() => update({ view: String(inv.id) }, true)} aria-label={`View ${inv.invoiceCode}`}>
                      <Eye className="h-4 w-4" />
                    </button>
                    <DownloadButton bookingId={inv.bookingId} filename={`${inv.invoiceCode}.pdf`} label={`Download ${inv.invoiceCode} PDF`} />
                    <Link to={`/invoices/${inv.id}/print`} target="_blank" className="btn-ghost" aria-label={`Print ${inv.invoiceCode}`}>
                      <Printer className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.data && (
          <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} limit={LIMIT} onPage={(p) => update({ page: String(p) }, true)} />
        )}
      </div>

      <InvoiceDrawer id={viewId} onClose={() => update({ view: undefined }, true)} />
    </>
  )
}
