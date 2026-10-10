import clsx from 'clsx'
import { Mail, Phone } from 'lucide-react'
import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router'
import { EnquiryStatusBadge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Form'
import { PageHeader, Pagination, SearchInput } from '@/components/ui/Table'
import { useEnquiries, useUpdateEnquiry } from '@/hooks/queries'
import { useUrlUpdater } from '@/hooks/useUrlUpdater'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { EnquiryStatus } from '@/lib/types'

const LIMIT = 10

export function EnquiriesPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const status = (params.get('status') as EnquiryStatus | null) ?? undefined
  const page = Number(params.get('page') ?? 1)
  const list = useEnquiries({ q: q || undefined, status, page, limit: LIMIT })
  const updateStatus = useUpdateEnquiry()

  const update = useUrlUpdater()
  const onSearch = useCallback((value: string) => update({ q: value }), [update])

  return (
    <>
      <PageHeader title="Enquiries" description="Messages sent from the website contact form." />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <SearchInput value={q} onChange={onSearch} placeholder="Search name, email or subject" className="w-full sm:w-72" />
        <Select aria-label="Enquiry status" value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined })} className="w-auto">
          <option value="">All</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="CLOSED">Closed</option>
        </Select>
      </div>

      {list.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="card h-32 animate-pulse" />
          ))}
        </div>
      ) : list.error ? (
        <p className="card p-6 text-sm text-red-600">{errorMessage(list.error)}</p>
      ) : list.data.data.length === 0 ? (
        <p className="card p-10 text-center text-sm text-muted">No enquiries yet.</p>
      ) : (
        <div className={clsx('space-y-3', list.isPlaceholderData && 'opacity-60')}>
          {list.data.data.map((e) => (
            <article key={e.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-navy">{e.subject}</h2>
                  <p className="text-sm text-muted">
                    {e.name} · {formatDateTime(e.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <EnquiryStatusBadge status={e.status} />
                  <Select
                    aria-label={`Status for enquiry from ${e.name}`}
                    value={e.status}
                    onChange={async (ev) => {
                      try {
                        await updateStatus.mutateAsync({ id: e.id, status: ev.target.value as EnquiryStatus })
                        toast.success('Status updated')
                      } catch (err) {
                        toast.error(errorMessage(err))
                      }
                    }}
                    className="w-auto py-1.5"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="CLOSED">Closed</option>
                  </Select>
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-navy/80">{e.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`tel:${e.phone.replace(/\s/g, '')}`} className="btn-secondary py-1.5">
                  <Phone className="h-4 w-4" /> {e.phone}
                </a>
                <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.subject}`)}`} className="btn-secondary py-1.5">
                  <Mail className="h-4 w-4" /> {e.email}
                </a>
              </div>
            </article>
          ))}
          <div className="card">
            <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} limit={LIMIT} onPage={(p) => update({ page: String(p) }, true)} />
          </div>
        </div>
      )}
    </>
  )
}
