import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { Avatar } from '@/components/ui/Avatar'
import { Field, Input, Select } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { useSaveUser, useUploadAvatar } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import type { User, UserInput } from '@/lib/types'

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/
export const PASSWORD_MESSAGE = '8+ characters with an uppercase letter, a lowercase letter and a number'
const PHONE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/
const MAX_IMAGE = 2 * 1024 * 1024
const optional = (schema: z.ZodString) => z.union([z.literal(''), schema]).optional()

/**
 * Only admins sign in, so only admins have a password.
 * It's required for a new admin or a customer being made admin; optional when editing an admin.
 */
function buildSchema(wasAdmin: boolean) {
  return z
    .object({
      name: z.string().trim().min(2, 'Enter the full name').max(100),
      email: z.email('Enter a valid email'),
      phone: optional(z.string().trim().regex(PHONE, 'Enter a valid 10-digit mobile number')),
      address: optional(z.string().trim().max(255)),
      city: optional(z.string().trim().max(80)),
      state: optional(z.string().trim().max(80)),
      country: optional(z.string().trim().max(80)),
      zipCode: optional(z.string().trim().regex(/^[A-Za-z0-9\s-]{3,12}$/, 'Enter a valid postal code')),
      password: z.string(),
      confirmPassword: z.string(),
      role: z.enum(['ADMIN', 'CUSTOMER']),
      status: z.enum(['ACTIVE', 'INACTIVE']),
    })
    .superRefine((v, ctx) => {
      if (v.role !== 'ADMIN') return
      if (!v.password) {
        if (!wasAdmin) ctx.addIssue({ code: 'custom', path: ['password'], message: 'Admins need a password to sign in' })
        return
      }
      if (!PASSWORD_RULE.test(v.password)) ctx.addIssue({ code: 'custom', path: ['password'], message: PASSWORD_MESSAGE })
      if (v.password !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' })
    })
}
type Values = z.infer<ReturnType<typeof buildSchema>>

const defaults = (u?: User | null): Values => ({
  name: u?.name ?? '',
  email: u?.email ?? '',
  phone: u?.phone ?? '',
  address: u?.address ?? '',
  city: u?.city ?? '',
  state: u?.state ?? '',
  country: u?.country ?? 'India',
  zipCode: u?.zipCode ?? '',
  password: '',
  confirmPassword: '',
  role: u?.role ?? 'CUSTOMER',
  status: u?.status ?? 'ACTIVE',
})

export function UserFormDrawer({ open, user, onClose }: { open: boolean; user?: User | null; onClose: () => void }) {
  const { user: me } = useAuth()
  const isEdit = !!user
  const isSelf = isEdit && me?.id === user.id
  const wasAdmin = isEdit && user.role === 'ADMIN'
  const save = useSaveUser()
  const upload = useUploadAvatar()
  const fileRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(buildSchema(wasAdmin)), defaultValues: defaults(user) })

  useEffect(() => {
    if (open) reset(defaults(user))
  }, [open, user, reset])

  // Object URL for the chosen photo, released when it changes or the drawer closes.
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const close = () => {
    setImage(null)
    onClose()
  }

  function pickImage(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Choose a JPG, PNG or WEBP image')
    if (file.size > MAX_IMAGE) return toast.error('Image must be 2 MB or smaller')
    setImage(file)
  }

  async function onSubmit(v: Values) {
    const input: UserInput = {
      name: v.name,
      email: v.email,
      ...Object.fromEntries(
        (['phone', 'address', 'city', 'state', 'country', 'zipCode'] as const).map((k) => [k, v[k] || undefined]),
      ),
      ...(v.role === 'ADMIN' && v.password && { password: v.password, confirmPassword: v.confirmPassword }),
      ...(!isSelf && { role: v.role, status: v.status }),
    }
    try {
      const saved = await save.mutateAsync({ id: user?.id, input })
      if (image) {
        try {
          await upload.mutateAsync({ id: saved.id, file: image })
        } catch (err) {
          toast.error(`Saved, but the photo failed to upload: ${errorMessage(err)}`)
        }
      }
      toast.success(isEdit ? 'User updated' : `${saved.name} added`)
      close()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const busy = save.isPending || upload.isPending
  const name = useWatch({ control, name: 'name' })
  const role = useWatch({ control, name: 'role' })

  return (
    <Drawer
      open={open}
      onClose={close}
      title={isEdit ? `Edit ${user.name}` : 'Add user'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={close}>
            Cancel
          </button>
          <button type="submit" form="user-form" className="btn-primary" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add user'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="flex items-center gap-4">
          {preview ? (
            <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <Avatar name={name || '?'} src={user?.profileImage} size="xl" />
          )}
          <div>
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> {user?.profileImage || image ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="mt-1.5 text-xs text-muted">JPG, PNG or WEBP, up to 2 MB.</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="u-name" error={errors.name?.message}>
            <Input id="u-name" {...register('name')} invalid={!!errors.name} autoComplete="off" />
          </Field>
          <Field label="Email" htmlFor="u-email" error={errors.email?.message}>
            <Input id="u-email" type="email" {...register('email')} invalid={!!errors.email} autoComplete="off" />
          </Field>
          <Field label="Phone number" htmlFor="u-phone" error={errors.phone?.message}>
            <Input id="u-phone" type="tel" {...register('phone')} invalid={!!errors.phone} />
          </Field>
          <Field label="ZIP / postal code" htmlFor="u-zip" error={errors.zipCode?.message}>
            <Input id="u-zip" {...register('zipCode')} invalid={!!errors.zipCode} />
          </Field>
        </div>
        <Field label="Address" htmlFor="u-address" error={errors.address?.message}>
          <Input id="u-address" {...register('address')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="u-city" error={errors.city?.message}>
            <Input id="u-city" {...register('city')} />
          </Field>
          <Field label="State" htmlFor="u-state" error={errors.state?.message}>
            <Input id="u-state" {...register('state')} />
          </Field>
          <Field label="Country" htmlFor="u-country" error={errors.country?.message}>
            <Input id="u-country" {...register('country')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" htmlFor="u-role" hint={isSelf ? 'You cannot change your own role.' : undefined}>
            <Select id="u-role" {...register('role')} disabled={isSelf}>
              <option value="CUSTOMER">Customer</option>
              <option value="ADMIN">Admin (can sign in)</option>
            </Select>
          </Field>
          <Field label="Account status" htmlFor="u-status" hint={isSelf ? 'You cannot deactivate yourself.' : undefined}>
            <Select id="u-status" {...register('status')} disabled={isSelf}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        </div>

        {role !== 'ADMIN' ? (
          <p className="rounded-xl bg-cream px-4 py-3 text-sm text-muted">
            Customers don&apos;t sign in, so no password is needed.
            {wasAdmin && ' Changing this admin to a customer removes their sign-in access.'}
          </p>
        ) : (
          <div className="grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
            <p className="text-sm font-medium text-navy sm:col-span-2">
              {wasAdmin ? 'Set a new password (leave blank to keep the current one)' : 'Sign-in password'}
            </p>
            <Field label="Password" htmlFor="u-pass" error={errors.password?.message} hint={!errors.password ? PASSWORD_MESSAGE : undefined}>
              <Input id="u-pass" type="password" autoComplete="new-password" {...register('password')} invalid={!!errors.password} />
            </Field>
            <Field label="Confirm password" htmlFor="u-pass2" error={errors.confirmPassword?.message}>
              <Input id="u-pass2" type="password" autoComplete="new-password" {...register('confirmPassword')} invalid={!!errors.confirmPassword} />
            </Field>
          </div>
        )}
      </form>
    </Drawer>
  )
}
