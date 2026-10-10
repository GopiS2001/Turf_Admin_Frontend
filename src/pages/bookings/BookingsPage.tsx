import clsx from 'clsx'
import { Eye, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router'
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { PageHeader, Pagination, SearchInput, TableState, td, th } from '@/components/ui/Table'
import { useBookingCounts, useBookings, useCancelBooking, useDeleteBooking, type BookingFilters } from '@/hooks/queries'
import { useUrlUpdater } from '@/hooks/useUrlUpdater'
import { errorMessage } from '@/lib/api'
import { formatDate, formatINR, formatTimeRange } from '@/lib/format'
import type { Booking, BookingStatus, DateRange, PaymentStatus } from '@/lib/types'
import { BookingDetailDrawer } from './BookingDetailDrawer'
import { BookingFormDrawer } from './BookingFormDrawer'

const tabs: { value: BookingStatus | undefined; label: string; key: BookingStatus | 'ALL' }[] = [
  { value: undefined, label: 'All', key: 'ALL' },
  { value: 'UPCOMING', label: 'Upcoming', key: 'UPCOMING' },
  { value: 'ONGOING', label: 'Ongoing', key: 'ONGOING' },
  { value: 'COMPLETED', label: 'Completed', key: 'COMPLETED' },
  { value: 'CANCELLED', label: 'Cancelled', key: 'CANCELLED' },
]

const ranges: { value: DateRange | ''; label: string }[] = [
  { value: '', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
]

const LIMIT = 10

export function BookingsPage() {
  const [params] = useSearchParams()
  const status = (params.get('status') as BookingStatus | null) ?? undefined
  const range = (params.get('range') as DateRange | null) ?? undefined
  const from = params.get('from') ?? undefined
  const to = params.get('to') ?? undefined
  const q = params.get('q') ?? ''
  const paymentStatus = (params.get('payment') as PaymentStatus | null) ?? undefined
  const page = Number(params.get('page') ?? 1)
  const viewId = params.get('view') ? Number(params.get('view')) : null

  const customReady = range !== 'custom' || (!!from && !!to && from <= to)
  const filterBase: BookingFilters = {
    range: customReady ? range : undefined,
    from: range === 'custom' && customReady ? from : undefined,
    to: range === 'custom' && customReady ? to : undefined,
    q: q || undefined,
    paymentStatus,
  }
  const list = useBookings({ ...filterBase, status, page, limit: LIMIT })
  const counts = useBookingCounts(filterBase)

  const [formOpen, setFormOpen] = useState(params.get('new') === '1')
  const [editing, setEditing] = useState<Booking | null>(null)
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const [toDelete, setToDelete] = useState<Booking | null>(null)
  const cancel = useCancelBooking()
  const remove = useDeleteBooking()

  /** Update URL params; filter changes go back to page 1. */
  const update = useUrlUpdater()

  const onSearch = useCallback((value: string) => update({ q: value }), [update])

  // `?new=1` (from the dashboard's "New booking" button) only opens the form once.
  useEffect(() => {
    if (params.has('new')) update({}, true)
  }, [params, update])

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Create, update and track every turf booking."
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New booking
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-3" role="tablist" aria-label="Booking status">
          {tabs.map((t) => {
            const active = status === t.value
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => update({ status: t.value })}
                className={clsx(
                  '-mb-px flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium whitespace-nowrap transition',
                  active ? 'border-turf text-turf' : 'border-transparent text-muted hover:text-navy',
                )}
              >
                {t.label}
                <span className={clsx('rounded-full px-2 py-0.5 text-xs tabular-nums', active ? 'bg-turf-50 text-turf' : 'bg-cream text-muted')}>
                  {counts.data?.[t.key] ?? '–'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchInput value={q} onChange={onSearch} placeholder="Search name, phone or code" className="w-full sm:w-72" />
          <Select
            aria-label="Date range"
            value={range ?? ''}
            onChange={(e) => update({ range: e.target.value || undefined, from: undefined, to: undefined })}
            className="w-auto"
          >
            {ranges.map((r) => (
              <option key={r.label} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="date" aria-label="From date" value={from ?? ''} max={to} onChange={(e) => update({ from: e.target.value || undefined })} className="w-auto" />
              <span className="text-sm text-muted">to</span>
              <Input type="date" aria-label="To date" value={to ?? ''} min={from} onChange={(e) => update({ to: e.target.value || undefined })} className="w-auto" />
            </div>
          )}
          <Select aria-label="Payment status" value={paymentStatus ?? ''} onChange={(e) => update({ payment: e.target.value || undefined })} className="w-auto">
            <option value="">Any payment</option>
            <option value="PENDING">Pending</option>
            <option value="ADVANCE">Advance</option>
            <option value="PAID">Paid</option>
            <option value="REFUND">Refunded</option>
          </Select>
          {(q || range || paymentStatus) && (
            <button type="button" className="btn-ghost text-sm" onClick={() => update({ q: undefined, range: undefined, from: undefined, to: undefined, payment: undefined })}>
              Clear filters
            </button>
          )}
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream/60">
              <tr>
                <th className={th}>Booking</th>
                <th className={th}>Customer</th>
                <th className={th}>Date & time</th>
                <th className={clsx(th, 'text-right')}>Hours</th>
                <th className={clsx(th, 'text-right')}>Extra guests</th>
                <th className={clsx(th, 'text-right')}>Total</th>
                <th className={clsx(th, 'text-right')}>Paid</th>
                <th className={th}>Payment</th>
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
                colSpan={10}
                emptyText={range === 'custom' && !customReady ? 'Pick a start and end date.' : 'No bookings match these filters.'}
                onRetry={() => list.refetch()}
              />
              {list.data?.data.map((b) => (
                <tr key={b.id} className={clsx('hover:bg-cream/50', list.isPlaceholderData && 'opacity-60')}>
                  <td className={td}>
                    <button type="button" onClick={() => update({ view: String(b.id) }, true)} className="font-medium text-turf hover:underline">
                      {b.bookingCode}
                    </button>
                  </td>
                  <td className={td}>
                    <span className="block font-medium">{b.customerName}</span>
                    <span className="block text-xs text-muted">{b.customerPhone}</span>
                  </td>
                  <td className={td}>
                    <span className="block">{formatDate(b.bookingDate)}</span>
                    <span className="block text-xs text-muted">{formatTimeRange(b.timeIn, b.timeOut)}</span>
                  </td>
                  <td className={clsx(td, 'text-right tabular-nums')}>{b.totalHours}</td>
                  <td className={clsx(td, 'text-right tabular-nums')}>{b.additionalGuests}</td>
                  <td className={clsx(td, 'text-right font-medium tabular-nums')}>{formatINR(b.totalAmount)}</td>
                  <td className={clsx(td, 'text-right tabular-nums')}>{formatINR(b.amountPaid)}</td>
                  <td className={td}>
                    <PaymentStatusBadge status={b.paymentStatus} />
                  </td>
                  <td className={td}>
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className={clsx(td, 'text-right')}>
                    <button type="button" className="btn-ghost" onClick={() => update({ view: String(b.id) }, true)} aria-label={`View ${b.bookingCode}`}>
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.data && (
          <Pagination
            page={list.data.meta.page}
            totalPages={list.data.meta.totalPages}
            total={list.data.meta.total}
            limit={LIMIT}
            onPage={(p) => update({ page: String(p) }, true)}
          />
        )}
      </div>

      <BookingDetailDrawer
        bookingId={viewId}
        onClose={() => update({ view: undefined }, true)}
        onEdit={(b) => {
          setEditing(b)
          setFormOpen(true)
        }}
        onCancel={setToCancel}
        onDelete={setToDelete}
      />

      <BookingFormDrawer
        open={formOpen}
        booking={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(b) => !editing && update({ view: String(b.id) }, true)}
      />

      <ConfirmDialog
        open={!!toCancel}
        title={`Cancel ${toCancel?.bookingCode}?`}
        message={
          <>
            The slot will be freed for other customers.
            {toCancel && toCancel.amountPaid > 0 && ` ${formatINR(toCancel.amountPaid)} has been paid — record a refund afterwards if needed.`}
          </>
        }
        confirmLabel="Cancel booking"
        danger
        busy={cancel.isPending}
        onClose={() => setToCancel(null)}
        onConfirm={async () => {
          try {
            await cancel.mutateAsync(toCancel!.id)
            toast.success(`${toCancel!.bookingCode} cancelled`)
            setToCancel(null)
          } catch (err) {
            toast.error(errorMessage(err))
          }
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.bookingCode}?`}
        message="This permanently removes the booking with its invoice and payment history. To keep records, cancel it instead."
        confirmLabel="Delete permanently"
        danger
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(toDelete!.id)
            toast.success(`${toDelete!.bookingCode} deleted`)
            setToDelete(null)
            update({ view: undefined }, true)
          } catch (err) {
            toast.error(errorMessage(err))
          }
        }}
      />
    </>
  )
}
