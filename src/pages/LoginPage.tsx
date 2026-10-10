import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Logo } from '@/components/layout/AppLayout'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  async function onSubmit(values: Values) {
    setError(null)
    try {
      await login(values.email, values.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <img src="/login.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-navy/20" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo />
          <div>
            <h1 className="font-display text-7xl leading-[0.9] tracking-wide">
              Run the turf
              <br />
              <span className="text-accent">from one place.</span>
            </h1>
            <p className="mt-4 max-w-md text-white/70">Bookings, payments, invoices and players — all in the 90s Turf dashboard.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-sm">
          <div className="mb-8 rounded-xl bg-navy p-4 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold text-navy">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Admin accounts only.</p>

          {error && (
            <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-medium">Email</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input {...register('email')} type="email" autoComplete="username" autoFocus className={`field pl-9 ${errors.email ? 'field-error' : ''}`} />
            </span>
            {errors.email && <span className="mt-1.5 block text-xs text-red-600">{errors.email.message}</span>}
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Password</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`field pr-11 pl-9 ${errors.password ? 'field-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-cream hover:text-navy focus-visible:outline-2 focus-visible:outline-turf"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
            {errors.password && <span className="mt-1.5 block text-xs text-red-600">{errors.password.message}</span>}
          </label>

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-8 w-full py-3">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
