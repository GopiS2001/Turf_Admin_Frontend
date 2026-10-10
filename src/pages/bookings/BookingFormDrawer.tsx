import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Drawer } from '@/components/ui/Overlay'
import { usePricing, useSaveBooking, useUsers } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatINR, toISODate } from '@/lib/format'
import { estimatePrice, TIME_OPTIONS, toMinutes } from '@/lib/pricing'
import type { Booking, BookingInput } from '@/lib/types'

const PHONE = /^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/
const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : Number(v)),
  z.number().min(0, 'Must be 0 or more').optional(),
)

const schema = z
  .object({
    userId: z.string().optional(),
    customerName: z.string().trim().min(2, 'Enter the customer name').max(100),
    customerPhone: z.string().trim().regex(PHONE, 'Enter a valid 10-digit mobile number'),
    customerEmail: z.union([z.literal(''), z.email('Enter a valid email')]).optional(),
    bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    timeIn: z.string().min(1),
    timeOut: z.string().min(1),
    additionalGuests: z.preprocess((v) => (v === '' ? 0 : Number(v)), z.number().int('Whole number').min(0).max(50)),
    pricePerHour: optionalNumber,
    maxGuests: optionalNumber,
    pricePerGuest: optionalNumber,
    notes: z.string().trim().max(300).optional(),
    paymentAmount: optionalNumber,
    paymentType: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
    transactionId: z.string().trim().max(100).optional(),
  })
  .refine((v) => toMinutes(v.timeOut) > toMinutes(v.timeIn), { path: ['timeOut'], message: 'Time-out must be after time-in' })
  .refine((v) => toMinutes(v.timeOut) - toMinutes(v.timeIn) <= 6 * 60, { path: ['timeOut'], message: 'A booking can be at most 6 hours' })

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

const hhmm = (t: string) => t.slice(0, 5)

function defaults(booking?: Booking | null): FormIn {
  return {
    userId: booking?.userId ? String(booking.userId) : '',
    customerName: booking?.customerName ?? '',
    customerPhone: booking?.customerPhone ?? '',
    customerEmail: booking?.customerEmail ?? '',
    bookingDate: booking?.bookingDate ?? toISODate(new Date()),
    timeIn: booking ? hhmm(booking.timeIn) : '18:00',
    timeOut: booking ? hhmm(booking.timeOut) : '19:00',
    additionalGuests: booking?.additionalGuests ?? 0,
    pricePerHour: '',
    maxGuests: '',
    pricePerGuest: '',
    notes: booking?.notes ?? '',
    paymentAmount: '',
    paymentType: 'UPI',
    transactionId: '',
  }
}

export function BookingFormDrawer({
  open,
  booking,
  onClose,
  onSaved,
}: {
  open: boolean
  booking?: Booking | null
  onClose: () => void
  onSaved?: (b: Booking) => void
}) {
  const isEdit = !!booking
  const save = useSaveBooking()
  const pricing = usePricing()
  const customers = useUsers({ role: 'CUSTOMER', limit: 100 }, open)
  const [customPricing, setCustomPricing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema), defaultValues: defaults(booking) })

  useEffect(() => {
    if (open) reset(defaults(booking))
  }, [open, booking, reset])

  const close = () => {
    setCustomPricing(false)
    onClose()
  }

  const v = useWatch({ control })
  const num = (x: unknown) => (x === '' || x == null || Number.isNaN(Number(x)) ? undefined : Number(x))
  const estimate = estimatePrice({
    plans: pricing.data ?? [],
    date: v.bookingDate ?? '',
    timeIn: v.timeIn ?? '00:00',
    timeOut: v.timeOut ?? '00:00',
    additionalGuests: num(v.additionalGuests) ?? 0,
    pricePerHour: customPricing ? num(v.pricePerHour) : undefined,
    maxGuests: customPricing ? num(v.maxGuests) : undefined,
    pricePerGuest: customPricing ? num(v.pricePerGuest) : undefined,
  })

  function pickCustomer(id: string) {
    setValue('userId', id)
    const c = customers.data?.data.find((u) => String(u.id) === id)
    if (c) {
      setValue('customerName', c.name, { shouldValidate: true })
      if (c.phone) setValue('customerPhone', c.phone, { shouldValidate: true })
      setValue('customerEmail', c.email, { shouldValidate: true })
    }
  }

  async function onSubmit(values: FormOut) {
    // On edit, only send slot fields that changed: any of them makes the server
    // re-price the booking, which would drop a custom rate set earlier.
    const slotChanged =
      !isEdit ||
      customPricing ||
      values.bookingDate !== booking.bookingDate ||
      values.timeIn !== hhmm(booking.timeIn) ||
      values.timeOut !== hhmm(booking.timeOut) ||
      values.additionalGuests !== booking.additionalGuests
    const input = {
      userId: values.userId ? Number(values.userId) : undefined,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail || undefined,
      notes: values.notes || undefined,
      ...(slotChanged && {
        bookingDate: values.bookingDate,
        timeIn: values.timeIn,
        timeOut: values.timeOut,
        additionalGuests: values.additionalGuests,
      }),
      ...(customPricing && {
        pricePerHour: values.pricePerHour,
        maxGuests: values.maxGuests,
        pricePerGuest: values.pricePerGuest,
      }),
    } as BookingInput
    if (!isEdit && values.paymentAmount) {
      input.payment = {
        amount: values.paymentAmount,
        paymentType: values.paymentType,
        transactionId: values.transactionId || undefined,
      }
    }
    try {
      const saved = await save.mutateAsync({ id: booking?.id, input })
      toast.success(isEdit ? `Booking ${saved.bookingCode} updated` : `Booking ${saved.bookingCode} created`)
      onSaved?.(saved)
      close()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={isEdit ? `Edit ${booking.bookingCode}` : 'New booking'}
      subtitle={isEdit ? 'Changing the date, time or guests recalculates the price.' : 'Prices come from the pricing plans unless you set custom pricing.'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={close}>
            Cancel
          </button>
          <button type="submit" form="booking-form" className="btn-primary" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create booking'}
          </button>
        </>
      }
    >
      <form id="booking-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Customer</legend>
          <Field label="Registered customer (optional)" htmlFor="b-user" hint="Fills in the details below.">
            <Select id="b-user" {...register('userId')} onChange={(e) => pickCustomer(e.target.value)}>
              <option value="">Walk-in / not registered</option>
              {customers.data?.data.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="b-name" error={errors.customerName?.message}>
              <Input id="b-name" {...register('customerName')} invalid={!!errors.customerName} />
            </Field>
            <Field label="Phone" htmlFor="b-phone" error={errors.customerPhone?.message}>
              <Input id="b-phone" type="tel" {...register('customerPhone')} invalid={!!errors.customerPhone} />
            </Field>
          </div>
          <Field label="Email (optional)" htmlFor="b-email" error={errors.customerEmail?.message}>
            <Input id="b-email" type="email" {...register('customerEmail')} invalid={!!errors.customerEmail} />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Slot</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Booking date" htmlFor="b-date" error={errors.bookingDate?.message}>
              <Input id="b-date" type="date" {...register('bookingDate')} invalid={!!errors.bookingDate} />
            </Field>
            <Field label="Time in" htmlFor="b-in">
              <Select id="b-in" {...register('timeIn')}>
                {TIME_OPTIONS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Time out" htmlFor="b-out" error={errors.timeOut?.message}>
              <Select id="b-out" {...register('timeOut')} invalid={!!errors.timeOut}>
                {TIME_OPTIONS.slice(1).map((t) => (
                  <option key={t} value={t}>
                    {t === '24:00' ? '24:00 (midnight)' : t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Additional guests"
            htmlFor="b-guests"
            error={errors.additionalGuests?.message}
            hint={estimate ? `Players above the ${estimate.maxGuests} included in the plan.` : undefined}
          >
            <Input id="b-guests" type="number" min={0} max={50} {...register('additionalGuests')} invalid={!!errors.additionalGuests} />
          </Field>

          <button type="button" onClick={() => setCustomPricing((x) => !x)} className="flex items-center gap-1 text-sm font-medium text-turf" aria-expanded={customPricing}>
            <ChevronDown className={`h-4 w-4 transition ${customPricing ? 'rotate-180' : ''}`} />
            Custom pricing
          </button>
          {customPricing && (
            <div className="grid gap-4 rounded-lg border border-dashed border-line p-4 sm:grid-cols-3">
              <Field label="Price per hour (₹)" htmlFor="b-pph" error={errors.pricePerHour?.message}>
                <Input id="b-pph" type="number" min={0} step="0.01" placeholder="Plan rate" {...register('pricePerHour')} />
              </Field>
              <Field label="Max guests" htmlFor="b-max" error={errors.maxGuests?.message}>
                <Input id="b-max" type="number" min={1} placeholder="Plan max" {...register('maxGuests')} />
              </Field>
              <Field label="Price per guest (₹)" htmlFor="b-ppg" error={errors.pricePerGuest?.message}>
                <Input id="b-ppg" type="number" min={0} step="0.01" placeholder="Plan rate" {...register('pricePerGuest')} />
              </Field>
            </div>
          )}

          <Field label="Notes (optional)" htmlFor="b-notes" error={errors.notes?.message}>
            <Textarea id="b-notes" rows={2} {...register('notes')} />
          </Field>
        </fieldset>

        {estimate && (
          <div className="rounded-xl bg-navy p-4 text-sm text-white" aria-live="polite">
            <div className="flex justify-between text-white/70">
              <span>
                {estimate.planName} · {estimate.totalHours} hr × {formatINR(estimate.pricePerHour)}
              </span>
              <span className="text-white">{formatINR(estimate.turfAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between text-white/70">
              <span>
                Extra guests · {num(v.additionalGuests) ?? 0} × {formatINR(estimate.pricePerGuest)}
              </span>
              <span className="text-white">{formatINR(estimate.additionalGuestAmount)}</span>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
              <span className="font-medium">Estimated total</span>
              <span className="text-2xl font-semibold text-accent tabular-nums">{formatINR(estimate.totalAmount)}</span>
            </div>
          </div>
        )}

        {!isEdit && (
          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Payment received now (optional)</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Amount (₹)" htmlFor="b-pay" error={errors.paymentAmount?.message}>
                <Input id="b-pay" type="number" min={0} step="0.01" placeholder="0" {...register('paymentAmount')} />
              </Field>
              <Field label="Payment type" htmlFor="b-ptype">
                <Select id="b-ptype" {...register('paymentType')}>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </Select>
              </Field>
              <Field label="Transaction ID" htmlFor="b-txn">
                <Input id="b-txn" placeholder="Optional" {...register('transactionId')} />
              </Field>
            </div>
            <p className="text-xs text-muted">Recorded as an advance, or as paid if it covers the total.</p>
          </fieldset>
        )}
      </form>
    </Drawer>
  )
}
