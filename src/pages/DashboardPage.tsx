import clsx from 'clsx'
import { CalendarCheck, Clock, IndianRupee, Plus, Table2, TrendingUp, Wallet, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { PageHeader, TableState, td, th } from '@/components/ui/Table'
import { useBookings, useDashboardSummary, useRevenue, useUpcoming } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatDate, formatINR, formatINRShort, formatTimeRange } from '@/lib/format'
import type { DateRange } from '@/lib/types'
import { isToday, isTomorrow, parseISO } from 'date-fns'

const ranges: { value: DateRange | undefined; label: string }[] = [
  { value: undefined, label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
]

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  label: string
  value: string
  sub?: string
  icon: typeof Wallet
  loading: boolean
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-turf-50 text-turf">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-28 animate-pulse rounded bg-cream" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight text-navy tabular-nums">{value}</p>
      )}
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function dayLabel(date: string) {
  const d = parseISO(date)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return formatDate(date, 'EEE, d MMM')
}

function RevenueChart() {
  const { data, isPending, error } = useRevenue(6)
  const [asTable, setAsTable] = useState(false)
  // Label only the latest month on the chart; the axis, tooltip and table carry the rest.
  const chartData = data?.map((d, i) => ({ ...d, tip: i === data.length - 1 && d.revenue > 0 ? formatINRShort(d.revenue) : '' }))

  return (
    <section className="card p-5 lg:col-span-2" aria-labelledby="revenue-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="revenue-title" className="font-semibold text-navy">
            Payments received
          </h2>
          <p className="text-sm text-muted">Net of refunds, last 6 months</p>
        </div>
        <button type="button" className="btn-ghost text-xs" onClick={() => setAsTable((v) => !v)}>
          {asTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {isPending ? (
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-cream" />
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{errorMessage(error)}</p>
      ) : asTable ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className={th}>Month</th>
              <th className={clsx(th, 'text-right')}>Received</th>
              <th className={clsx(th, 'text-right')}>Bookings</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.month} className="border-b border-line last:border-0">
                <td className={td}>{r.label}</td>
                <td className={clsx(td, 'text-right tabular-nums')}>{formatINR(r.revenue)}</td>
                <td className={clsx(td, 'text-right tabular-nums')}>{r.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-4 h-64" role="img" aria-label="Column chart of payments received per month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#eceef2" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#e7e9ee' }} tick={{ fill: '#6b7385', fontSize: 12 }} tickFormatter={(v: string) => v.split(' ')[0]} />
              <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: '#6b7385', fontSize: 12 }} tickFormatter={formatINRShort} />
              <Tooltip
                cursor={{ fill: '#f2f4f1' }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof data)[number] | undefined
                  if (!active || !p) return null
                  return (
                    <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-card">
                      <p className="font-medium text-navy">{p.label}</p>
                      <p className="mt-1 flex items-center gap-2 text-navy">
                        <span className="h-2.5 w-2.5 rounded-sm bg-turf" aria-hidden />
                        {formatINR(p.revenue)}
                      </p>
                      <p className="text-xs text-muted">{p.bookings} bookings that month</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="revenue" fill="#097e52" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                <LabelList dataKey="tip" position="top" offset={8} fontSize={12} fontWeight={600} fill="#192335" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export function DashboardPage() {
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const summary = useDashboardSummary(range)
  const upcoming = useUpcoming(6)
  const recent = useBookings({ range, limit: 8, page: 1 })
  const s = summary.data
  const rangeLabel = ranges.find((r) => r.value === range)?.label ?? 'All time'

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quick look at bookings, payments and what's coming up."
        actions={
          <Link to="/bookings?new=1" className="btn-primary">
            <Plus className="h-4 w-4" /> New booking
          </Link>
        }
      />

      <div className="mb-5 inline-flex rounded-lg border border-line bg-white p-1" role="group" aria-label="Date range">
        {ranges.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r.value)}
            aria-pressed={range === r.value}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition',
              range === r.value ? 'bg-navy text-white' : 'text-muted hover:text-navy',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {summary.error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage(summary.error)}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Court bookings"
          icon={CalendarCheck}
          loading={summary.isPending}
          value={String(s?.totalBookings ?? 0)}
          sub={s ? `${s.bookingsByStatus.UPCOMING} upcoming · ${s.bookingsByStatus.CANCELLED} cancelled` : undefined}
        />
        <StatCard
          label="Total payments"
          icon={Wallet}
          loading={summary.isPending}
          value={formatINR(s?.totalPayments)}
          sub={s?.paymentsBreakdown.refunded ? `${formatINR(s.paymentsBreakdown.refunded)} refunded` : `${rangeLabel}, net of refunds`}
        />
        <StatCard label="Today's revenue" icon={TrendingUp} loading={summary.isPending} value={formatINR(s?.todayRevenue)} sub="Payments received today" />
        <StatCard
          label="Outstanding"
          icon={IndianRupee}
          loading={summary.isPending}
          value={formatINR(s?.outstandingAmount)}
          sub={s ? `of ${formatINR(s.bookingValue)} booked` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <RevenueChart />

        <section className="card p-5" aria-labelledby="upcoming-title">
          <div className="flex items-center justify-between">
            <h2 id="upcoming-title" className="font-semibold text-navy">
              Upcoming appointments
            </h2>
            <Link to="/bookings?status=UPCOMING" className="text-sm font-medium text-turf hover:underline">
              View all
            </Link>
          </div>
          {upcoming.isPending ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-cream" />
              ))}
            </div>
          ) : upcoming.error ? (
            <p className="mt-4 text-sm text-red-600">{errorMessage(upcoming.error)}</p>
          ) : upcoming.data.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted">No upcoming bookings.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {upcoming.data.map((b) => (
                <li key={b.id}>
                  <Link to={`/bookings?view=${b.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-cream">
                    <span
                      className={clsx(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xs font-semibold',
                        b.status === 'ONGOING' ? 'bg-amber-50 text-amber-800' : 'bg-turf-50 text-turf',
                      )}
                    >
                      <Clock className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy">{b.customerName}</span>
                      <span className="block text-xs text-muted">
                        {dayLabel(b.bookingDate)} · {formatTimeRange(b.timeIn, b.timeOut)}
                      </span>
                    </span>
                    {b.status === 'ONGOING' ? <BookingStatusBadge status="ONGOING" /> : <span className="text-sm font-medium text-navy tabular-nums">{formatINR(b.totalAmount)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 overflow-hidden" aria-labelledby="bookings-title">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 id="bookings-title" className="font-semibold text-navy">
              Bookings
            </h2>
            <p className="text-sm text-muted">{rangeLabel} · latest first</p>
          </div>
          <Link to="/bookings" className="btn-secondary">
            Manage bookings
          </Link>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="border-y border-line bg-cream/60">
              <tr>
                <th className={th}>Booking</th>
                <th className={th}>Customer</th>
                <th className={th}>Date & time</th>
                <th className={clsx(th, 'text-right')}>Amount</th>
                <th className={clsx(th, 'text-right')}>Paid</th>
                <th className={th}>Payment</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <TableState
                loading={recent.isPending}
                error={recent.error ? errorMessage(recent.error) : null}
                empty={!!recent.data && recent.data.data.length === 0}
                colSpan={7}
                emptyText="No bookings in this period."
              />
              {recent.data?.data.map((b) => (
                <tr key={b.id} className="hover:bg-cream/50">
                  <td className={td}>
                    <Link to={`/bookings?view=${b.id}`} className="font-medium text-turf hover:underline">
                      {b.bookingCode}
                    </Link>
                  </td>
                  <td className={td}>
                    <span className="block font-medium">{b.customerName}</span>
                    <span className="block text-xs text-muted">{b.customerPhone}</span>
                  </td>
                  <td className={td}>
                    <span className="block">{formatDate(b.bookingDate)}</span>
                    <span className="block text-xs text-muted">{formatTimeRange(b.timeIn, b.timeOut)}</span>
                  </td>
                  <td className={clsx(td, 'text-right tabular-nums')}>{formatINR(b.totalAmount)}</td>
                  <td className={clsx(td, 'text-right tabular-nums')}>{formatINR(b.amountPaid)}</td>
                  <td className={td}>
                    <PaymentStatusBadge status={b.paymentStatus} />
                  </td>
                  <td className={td}>
                    <BookingStatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
