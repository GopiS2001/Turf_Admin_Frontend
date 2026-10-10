import { Loader2, WifiOff } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/lib/useAuth'
import { LoginPage } from '@/pages/LoginPage'

// Pages load on demand so the first screen (and the login page) stays light.
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const BookingsPage = lazy(() => import('@/pages/bookings/BookingsPage').then((m) => ({ default: m.BookingsPage })))
const InvoicesPage = lazy(() => import('@/pages/invoices/InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const InvoicePrintPage = lazy(() => import('@/pages/invoices/InvoicePrintPage').then((m) => ({ default: m.InvoicePrintPage })))
const UsersPage = lazy(() => import('@/pages/users/UsersPage').then((m) => ({ default: m.UsersPage })))
const EnquiriesPage = lazy(() => import('@/pages/enquiries/EnquiriesPage').then((m) => ({ default: m.EnquiriesPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))

function Spinner({ full = false }: { full?: boolean }) {
  return (
    <div className={full ? 'grid min-h-dvh place-items-center text-muted' : 'grid place-items-center py-24 text-muted'}>
      <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
    </div>
  )
}

function RequireAuth() {
  const { user, isLoading, isOffline, retry } = useAuth()
  const location = useLocation()
  if (isLoading) return <Spinner full />
  // Server unreachable: the saved session may still be valid, so don't send the admin to the login page.
  if (isOffline)
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <WifiOff className="mx-auto h-8 w-8 text-muted" aria-hidden />
          <p className="mt-3 font-medium text-navy">Can't reach the server</p>
          <p className="mt-1 text-sm text-muted">Check your connection or that the API is running.</p>
          <button type="button" onClick={retry} className="btn-primary mt-6">
            Try again
          </button>
        </div>
      </div>
    )
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <Suspense fallback={<Spinner full />}>
      <Outlet />
    </Suspense>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-7xl text-turf">404</p>
      <p className="mt-2 text-muted">That page doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/invoices/:id/print" element={<InvoicePrintPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<Page><DashboardPage /></Page>} />
          <Route path="bookings" element={<Page><BookingsPage /></Page>} />
          <Route path="invoices" element={<Page><InvoicesPage /></Page>} />
          <Route path="users" element={<Page><UsersPage /></Page>} />
          <Route path="enquiries" element={<Page><EnquiriesPage /></Page>} />
          <Route path="profile" element={<Page><ProfilePage /></Page>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
