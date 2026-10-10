import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

/** Debounced search box. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  // Reset the box when the value changes from outside (e.g. "Clear filters").
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setDraft(value)
  }
  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onChange(draft.trim()), 350)
    return () => clearTimeout(t)
  }, [draft, value, onChange])

  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field pl-9"
      />
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPage: (page: number) => void
}) {
  if (total === 0) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <p>
        Showing <span className="font-medium text-navy">{from}</span>–<span className="font-medium text-navy">{to}</span> of{' '}
        <span className="font-medium text-navy">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className="btn-ghost" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** Loading / error / empty states shared by every table. */
export function TableState({
  loading,
  error,
  empty,
  colSpan,
  emptyText = 'Nothing here yet.',
  onRetry,
}: {
  loading: boolean
  error: string | null
  empty: boolean
  colSpan: number
  emptyText?: string
  onRetry?: () => void
}) {
  if (!loading && !error && !empty) return null
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-muted">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </span>
        ) : error ? (
          <span className="text-red-600">
            {error}{' '}
            {onRetry && (
              <button type="button" onClick={onRetry} className="font-semibold underline">
                Retry
              </button>
            )}
          </span>
        ) : (
          <span className="inline-flex flex-col items-center gap-2">
            <Inbox className="h-8 w-8 text-line" />
            {emptyText}
          </span>
        )}
      </td>
    </tr>
  )
}

export const th = 'px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted uppercase whitespace-nowrap'
export const td = 'px-4 py-3.5 text-sm text-navy whitespace-nowrap'
