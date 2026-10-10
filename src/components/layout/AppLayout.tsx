import clsx from 'clsx'
import {
  CalendarCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { useAuth } from '@/lib/useAuth'
import { humanize } from '@/lib/format'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/enquiries', label: 'Enquiries', icon: Mail },
  { to: '/profile', label: 'Profile Settings', icon: Settings },
]

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className="h-9 w-9" />
      <span className="leading-none">
        <span className="font-display block text-[26px] tracking-wider text-white">
          90<span className="text-accent">s</span> TURF
        </span>
        <span className="block text-[9px] font-semibold tracking-[0.3em] text-white/50 uppercase">Admin</span>
      </span>
    </span>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="px-6 py-6">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-turf text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="m-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <Avatar name={user.name} src={user.profileImage} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-xs text-white/50">{humanize(user.role)}</p>
          </div>
          <button type="button" onClick={() => setConfirmingLogout(true)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        message="You will need your password to sign in again."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        icon={LogOut}
        danger
        onConfirm={logout}
        onClose={() => setConfirmingLogout(false)}
      />
    </div>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const current = nav.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))

  useEffect(() => {
    document.title = `${current?.label ?? 'Admin'} · 90s Turf Admin`
  }, [current])

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <div className={clsx('no-print fixed inset-0 z-40 lg:hidden', open ? '' : 'pointer-events-none')}>
        <div
          className={clsx('absolute inset-0 bg-navy/50 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <aside
          className={clsx('absolute inset-y-0 left-0 w-72 transition-transform', open ? 'translate-x-0' : '-translate-x-full')}
          aria-hidden={!open}
        >
          <SidebarContent onNavigate={() => setOpen(false)} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-5 right-3 rounded-lg p-2 text-white/70 hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </aside>
      </div>

      <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold">{current?.label ?? '90s Turf Admin'}</span>
      </header>

      {/* Full width beside the sidebar — no max-width, so wide screens don't leave empty side gutters. */}
      <main className="w-full px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
