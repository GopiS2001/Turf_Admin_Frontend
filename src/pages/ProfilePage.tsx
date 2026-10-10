import { zodResolver } from '@hookform/resolvers/zod'
import { formatDistanceToNow } from 'date-fns'
import { Camera, Loader2, LogOut, Monitor, Smartphone } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { Avatar } from '@/components/ui/Avatar'
import { Field, Input } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Table'
import {
  useChangePassword,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
  useUpdateProfile,
  useUploadAvatar,
  type AuthSession,
} from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import { humanize } from '@/lib/format'
import { PASSWORD_MESSAGE, PASSWORD_RULE } from './users/UserFormDrawer'

const PHONE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/
const optional = (s: z.ZodString) => z.union([z.literal(''), s]).optional()

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100),
  phone: optional(z.string().trim().regex(PHONE, 'Enter a valid 10-digit mobile number')),
  address: optional(z.string().trim().max(255)),
  city: optional(z.string().trim().max(80)),
  state: optional(z.string().trim().max(80)),
  country: optional(z.string().trim().max(80)),
  zipCode: optional(z.string().trim().regex(/^[A-Za-z0-9\s-]{3,12}$/, 'Enter a valid postal code')),
})
type ProfileValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().regex(PASSWORD_RULE, PASSWORD_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
type PasswordValues = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const { user } = useAuth()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const upload = useUploadAvatar()
  const fileRef = useRef<HTMLInputElement>(null)

  const profile = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) })
  const password = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (user)
      profile.reset({
        name: user.name,
        phone: user.phone ?? '',
        address: user.address ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        country: user.country ?? '',
        zipCode: user.zipCode ?? '',
      })
  }, [user, profile])

  if (!user) return null
  const pe = profile.formState.errors
  const pw = password.formState.errors

  return (
    <>
      <PageHeader title="Profile settings" description="Your details and password." />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 text-center">
          <div className="flex justify-center">
            <Avatar name={user.name} src={user.profileImage} size="xl" />
          </div>
          <p className="mt-4 font-semibold text-navy">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs font-semibold tracking-wider text-turf uppercase">{humanize(user.role)}</p>
          <button type="button" className="btn-secondary mt-5" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (file.size > 2 * 1024 * 1024) return toast.error('Image must be 2 MB or smaller')
              try {
                await upload.mutateAsync({ id: user.id, file })
                toast.success('Photo updated')
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          />
        </section>

        <div className="space-y-6 lg:col-span-2">
          <form
            className="card p-6"
            noValidate
            onSubmit={profile.handleSubmit(async (v) => {
              try {
                await updateProfile.mutateAsync(Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val || undefined])))
                toast.success('Profile saved')
              } catch (err) {
                toast.error(errorMessage(err))
              }
            })}
          >
            <h2 className="font-semibold text-navy">Personal details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="pr-name" error={pe.name?.message}>
                <Input id="pr-name" {...profile.register('name')} invalid={!!pe.name} />
              </Field>
              <Field label="Email" htmlFor="pr-email" hint="Ask another admin to change your login email.">
                <Input id="pr-email" value={user.email} disabled readOnly />
              </Field>
              <Field label="Phone" htmlFor="pr-phone" error={pe.phone?.message}>
                <Input id="pr-phone" type="tel" {...profile.register('phone')} invalid={!!pe.phone} />
              </Field>
              <Field label="ZIP / postal code" htmlFor="pr-zip" error={pe.zipCode?.message}>
                <Input id="pr-zip" {...profile.register('zipCode')} invalid={!!pe.zipCode} />
              </Field>
              <Field label="Address" htmlFor="pr-address" className="sm:col-span-2">
                <Input id="pr-address" {...profile.register('address')} />
              </Field>
              <Field label="City" htmlFor="pr-city">
                <Input id="pr-city" {...profile.register('city')} />
              </Field>
              <Field label="State" htmlFor="pr-state">
                <Input id="pr-state" {...profile.register('state')} />
              </Field>
              <Field label="Country" htmlFor="pr-country">
                <Input id="pr-country" {...profile.register('country')} />
              </Field>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="submit" className="btn-primary" disabled={updateProfile.isPending || !profile.formState.isDirty}>
                {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save details
              </button>
            </div>
          </form>

          <form
            className="card p-6"
            noValidate
            onSubmit={password.handleSubmit(async (v) => {
              try {
                const { otherSessionsRevoked: n } = await changePassword.mutateAsync(v)
                toast.success(n ? `Password changed. Signed out of ${n} other device${n === 1 ? '' : 's'}.` : 'Password changed')
                password.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
              } catch (err) {
                toast.error(errorMessage(err))
              }
            })}
          >
            <h2 className="font-semibold text-navy">Change password</h2>
            {/* Tells password managers which account this password belongs to. */}
            <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field label="Current password" htmlFor="pw-current" error={pw.currentPassword?.message}>
                <Input id="pw-current" type="password" autoComplete="current-password" {...password.register('currentPassword')} invalid={!!pw.currentPassword} />
              </Field>
              <Field label="New password" htmlFor="pw-new" error={pw.newPassword?.message}>
                <Input id="pw-new" type="password" autoComplete="new-password" {...password.register('newPassword')} invalid={!!pw.newPassword} />
              </Field>
              <Field label="Confirm new password" htmlFor="pw-confirm" error={pw.confirmPassword?.message}>
                <Input id="pw-confirm" type="password" autoComplete="new-password" {...password.register('confirmPassword')} invalid={!!pw.confirmPassword} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-muted">{PASSWORD_MESSAGE}.</p>
            <div className="mt-6 flex justify-end">
              <button type="submit" className="btn-primary" disabled={changePassword.isPending}>
                {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </button>
            </div>
          </form>

          <SessionsCard />
        </div>
      </div>
    </>
  )
}

function deviceLabel(session: AuthSession) {
  const ua = session.userAgent ?? ''
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android|okhttp/.test(ua)
      ? 'Android'
      : /iPhone|iPad|CFNetwork/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null
  if (session.client === 'MOBILE') return os ? `90s Turf app on ${os}` : '90s Turf app'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser'
  return os ? `${browser} on ${os}` : browser
}

/** Every device signed in to this account, with sign-out per device. */
function SessionsCard() {
  const sessions = useSessions()
  const revoke = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()
  const others = sessions.data?.filter((s) => !s.current).length ?? 0

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Signed-in devices</h2>
          <p className="mt-1 text-sm text-muted">A device stays signed in until 7 days after it was last used.</p>
        </div>
        {others > 0 && (
          <button
            type="button"
            className="btn-secondary"
            disabled={revokeOthers.isPending}
            onClick={async () => {
              try {
                const { revoked } = await revokeOthers.mutateAsync()
                toast.success(`Signed out of ${revoked} other device${revoked === 1 ? '' : 's'}`)
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          >
            {revokeOthers.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out other devices
          </button>
        )}
      </div>

      {sessions.isPending ? (
        <div className="grid place-items-center py-8 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
        </div>
      ) : sessions.isError ? (
        <p className="mt-5 text-sm text-red-600">{errorMessage(sessions.error)}</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {sessions.data.map((s) => {
            const Icon = s.client === 'MOBILE' ? Smartphone : Monitor
            return (
              <li key={s.id} className="flex items-center gap-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cream text-navy">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">
                    {deviceLabel(s)}
                    {s.current && <span className="ml-2 text-xs font-semibold text-turf">This device</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {s.current ? 'Active now' : `Active ${formatDistanceToNow(new Date(s.lastUsedAt), { addSuffix: true })}`}
                    {s.ip && ` · ${s.ip}`}
                  </p>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    disabled={revoke.isPending && revoke.variables === s.id}
                    onClick={async () => {
                      try {
                        await revoke.mutateAsync(s.id)
                        toast.success('Device signed out')
                      } catch (err) {
                        toast.error(errorMessage(err))
                      }
                    }}
                  >
                    Sign out
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
