import clsx from 'clsx'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router'
import { AccountStatusBadge, Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { PageHeader, Pagination, SearchInput, TableState, td, th } from '@/components/ui/Table'
import { useDeleteUser, useUsers } from '@/hooks/queries'
import { useUrlUpdater } from '@/hooks/useUrlUpdater'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import { formatDate, humanize } from '@/lib/format'
import type { AccountStatus, Role, User } from '@/lib/types'
import { UserFormDrawer } from './UserFormDrawer'

const LIMIT = 10

export function UsersPage() {
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const role = (params.get('role') as Role | null) ?? undefined
  const status = (params.get('status') as AccountStatus | null) ?? undefined
  const page = Number(params.get('page') ?? 1)
  const list = useUsers({ q: q || undefined, role, status, page, limit: LIMIT })
  const remove = useDeleteUser()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [toDelete, setToDelete] = useState<User | null>(null)

  const update = useUrlUpdater()
  const onSearch = useCallback((value: string) => update({ q: value }), [update])

  return (
    <>
      <PageHeader
        title="Users"
        description="Customers and admins. Only admins can sign in to this dashboard."
        actions={
          isAdmin && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add user
            </button>
          )
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchInput value={q} onChange={onSearch} placeholder="Search name, email or phone" className="w-full sm:w-72" />
          <Select aria-label="Role" value={role ?? ''} onChange={(e) => update({ role: e.target.value || undefined })} className="w-auto">
            <option value="">All roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="ADMIN">Admins</option>
          </Select>
          <Select aria-label="Account status" value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined })} className="w-auto">
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream/60">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Phone</th>
                <th className={th}>Location</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th}>Joined</th>
                {isAdmin && (
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <TableState
                loading={list.isPending}
                error={list.error ? errorMessage(list.error) : null}
                empty={!!list.data && list.data.data.length === 0}
                colSpan={7}
                emptyText="No users match these filters."
                onRetry={() => list.refetch()}
              />
              {list.data?.data.map((u) => (
                <tr key={u.id} className={clsx('hover:bg-cream/50', list.isPlaceholderData && 'opacity-60')}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.profileImage} size="sm" />
                      <div>
                        <p className="font-medium">
                          {u.name}
                          {u.id === me?.id && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                        </p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{u.phone ?? '—'}</td>
                  <td className={td}>{[u.city, u.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className={td}>
                    <Badge tone={u.role === 'ADMIN' ? 'violet' : 'gray'} dot={false}>
                      {humanize(u.role)}
                    </Badge>
                  </td>
                  <td className={td}>
                    <AccountStatusBadge status={u.status} />
                  </td>
                  <td className={td}>{formatDate(u.createdAt.slice(0, 10), 'd MMM yyyy')}</td>
                  {isAdmin && (
                    <td className={clsx(td, 'text-right')}>
                      <button
                        type="button"
                        className="btn-ghost"
                        aria-label={`Edit ${u.name}`}
                        onClick={() => {
                          setEditing(u)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {u.id !== me?.id && (
                        <button type="button" className="btn-ghost hover:text-red-600" aria-label={`Delete ${u.name}`} onClick={() => setToDelete(u)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.data && (
          <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} limit={LIMIT} onPage={(p) => update({ page: String(p) }, true)} />
        )}
      </div>

      <UserFormDrawer open={formOpen} user={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.name}?`}
        message="Their account is removed. Past bookings stay, unlinked from the account. To keep the account, set it to Inactive instead."
        confirmLabel="Delete user"
        danger
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(toDelete!.id)
            toast.success(`${toDelete!.name} deleted`)
            setToDelete(null)
          } catch (err) {
            toast.error(errorMessage(err))
          }
        }}
      />
    </>
  )
}
