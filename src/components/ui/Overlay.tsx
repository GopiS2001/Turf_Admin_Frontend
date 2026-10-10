import clsx from 'clsx'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

/** Native <dialog> keeps focus inside and closes on Escape. */
function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return ref
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-xl',
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
}) {
  const ref = useDialog(open)
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={clsx(
        'm-0 ml-auto h-dvh max-h-dvh w-full bg-white p-0 shadow-2xl backdrop:bg-navy/50 backdrop:backdrop-blur-[2px]',
        width,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-navy">{title}</h2>
              {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
            </div>
            <button type="button" onClick={onClose} className="btn-ghost -mr-2" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep it',
  icon: Icon = AlertTriangle,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  icon?: React.ComponentType<{ className?: string }>
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useDialog(open)
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 text-navy shadow-2xl backdrop:bg-navy/50"
    >
      {open && (
        <div className="p-6">
          <div className="flex gap-4">
            <span
              className={clsx(
                'grid h-10 w-10 shrink-0 place-items-center rounded-full',
                danger ? 'bg-red-50 text-red-600' : 'bg-turf-50 text-turf',
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-navy">{title}</h2>
              <div className="mt-1 text-sm text-muted">{message}</div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </button>
            <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
