import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Booking,
  BookingCounts,
  BookingInput,
  BookingStatus,
  DashboardSummary,
  DateRange,
  Enquiry,
  EnquiryStatus,
  Invoice,
  InvoiceStatus,
  Paginated,
  Payment,
  PaymentInput,
  PaymentStatus,
  PricingPlan,
  RevenuePoint,
  Role,
  AccountStatus,
  User,
  UserInput,
} from '@/lib/types'

/** Drops empty values so they aren't sent as `?q=`. */
const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null))

// ───────────── Dashboard ─────────────

export const useDashboardSummary = (range?: DateRange) =>
  useQuery({
    queryKey: ['dashboard', 'summary', range ?? 'all'],
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary', { params: clean({ range }) })).data,
    refetchInterval: 60_000,
  })

export const useUpcoming = (limit = 6) =>
  useQuery({
    queryKey: ['dashboard', 'upcoming', limit],
    queryFn: async () => (await api.get<Booking[]>('/dashboard/upcoming', { params: { limit } })).data,
    refetchInterval: 60_000,
  })

export const useRevenue = (months = 6) =>
  useQuery({
    queryKey: ['dashboard', 'revenue', months],
    queryFn: async () => (await api.get<RevenuePoint[]>('/dashboard/revenue', { params: { months } })).data,
  })

// ───────────── Bookings ─────────────

export interface BookingFilters {
  status?: BookingStatus
  paymentStatus?: PaymentStatus
  range?: DateRange
  from?: string
  to?: string
  q?: string
  page?: number
  limit?: number
  sort?: 'asc' | 'desc'
}

export const useBookings = (filters: BookingFilters) =>
  useQuery({
    queryKey: ['bookings', 'list', filters],
    queryFn: async () => (await api.get<Paginated<Booking>>('/bookings', { params: clean(filters) })).data,
    placeholderData: keepPreviousData,
  })

export const useBookingCounts = (filters: Omit<BookingFilters, 'status' | 'page' | 'limit' | 'sort'>) =>
  useQuery({
    queryKey: ['bookings', 'counts', filters],
    queryFn: async () => (await api.get<BookingCounts>('/bookings/counts', { params: clean(filters) })).data,
    placeholderData: keepPreviousData,
  })

export const useBooking = (id: number | null) =>
  useQuery({
    queryKey: ['bookings', 'detail', id],
    queryFn: async () => (await api.get<Booking>(`/bookings/${id}`)).data,
    enabled: id != null,
  })

/** Any booking change can move dashboard numbers, invoices and payments too. */
function useInvalidateBookingData() {
  const qc = useQueryClient()
  return (skipBookingId?: number) =>
    Promise.all(
      ['bookings', 'dashboard', 'invoices', 'payments'].map((key) =>
        qc.invalidateQueries({
          queryKey: [key],
          // Don't re-fetch a booking that was just deleted (it would 404).
          predicate: (q) => skipBookingId == null || !(q.queryKey[1] === 'detail' && q.queryKey[2] === skipBookingId),
        }),
      ),
    )
}

export function useSaveBooking() {
  const invalidate = useInvalidateBookingData()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: BookingInput }) =>
      (id ? await api.patch<Booking>(`/bookings/${id}`, input) : await api.post<Booking>('/bookings', input)).data,
    onSuccess: () => invalidate(),
  })
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookingData()
  return useMutation({
    mutationFn: async (id: number) => (await api.patch<Booking>(`/bookings/${id}/cancel`)).data,
    onSuccess: () => invalidate(),
  })
}

export function useDeleteBooking() {
  const invalidate = useInvalidateBookingData()
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/bookings/${id}`)).data,
    onSuccess: (_data, id) => invalidate(id),
  })
}

export function useAddPayment() {
  const invalidate = useInvalidateBookingData()
  return useMutation({
    mutationFn: async ({ bookingId, input }: { bookingId: number; input: PaymentInput }) =>
      (await api.post<Booking>(`/bookings/${bookingId}/payments`, input)).data,
    onSuccess: () => invalidate(),
  })
}

export function useDeletePayment() {
  const invalidate = useInvalidateBookingData()
  return useMutation({
    mutationFn: async (paymentId: number) => (await api.delete<Booking>(`/payments/${paymentId}`)).data,
    onSuccess: () => invalidate(),
  })
}

export const usePricing = () =>
  useQuery({
    queryKey: ['pricing'],
    queryFn: async () => (await api.get<PricingPlan[]>('/public/pricing')).data,
    staleTime: 10 * 60_000,
  })

// ───────────── Invoices ─────────────

export interface InvoiceFilters {
  status?: InvoiceStatus
  from?: string
  to?: string
  q?: string
  page?: number
  limit?: number
}

export const useInvoices = (filters: InvoiceFilters) =>
  useQuery({
    queryKey: ['invoices', 'list', filters],
    queryFn: async () => (await api.get<Paginated<Invoice>>('/invoices', { params: clean(filters) })).data,
    placeholderData: keepPreviousData,
  })

export const useInvoice = (id: number | null) =>
  useQuery({
    queryKey: ['invoices', 'detail', id],
    queryFn: async () => (await api.get<Invoice>(`/invoices/${id}`)).data,
    enabled: id != null,
  })

export function useUpdateInvoice() {
  const invalidate = useInvalidateBookingData()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: { customerName?: string; status?: InvoiceStatus } }) =>
      (await api.patch<Invoice>(`/invoices/${id}`, input)).data,
    onSuccess: () => invalidate(),
  })
}

// ───────────── Payments ─────────────

export const usePayments = (filters: { q?: string; page?: number; limit?: number; from?: string; to?: string }) =>
  useQuery({
    queryKey: ['payments', 'list', filters],
    queryFn: async () => (await api.get<Paginated<Payment>>('/payments', { params: clean(filters) })).data,
    placeholderData: keepPreviousData,
  })

// ───────────── Users ─────────────

export interface UserFilters {
  role?: Role
  status?: AccountStatus
  q?: string
  page?: number
  limit?: number
}

export const useUsers = (filters: UserFilters, enabled = true) =>
  useQuery({
    queryKey: ['users', 'list', filters],
    queryFn: async () => (await api.get<Paginated<User>>('/users', { params: clean(filters) })).data,
    placeholderData: keepPreviousData,
    enabled,
  })

export function useSaveUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: UserInput }) =>
      (id ? await api.patch<User>(`/users/${id}`, input) : await api.post<User>('/users', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const body = new FormData()
      body.append('file', file)
      return (await api.post<User>(`/users/${id}/avatar`, body)).data
    },
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ['users'] }), qc.invalidateQueries({ queryKey: ['auth'] })]),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ───────────── Enquiries ─────────────

export const useEnquiries = (filters: { status?: EnquiryStatus; q?: string; page?: number; limit?: number }) =>
  useQuery({
    queryKey: ['enquiries', 'list', filters],
    queryFn: async () => (await api.get<Paginated<Enquiry>>('/enquiries', { params: clean(filters) })).data,
    placeholderData: keepPreviousData,
  })

export function useUpdateEnquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: EnquiryStatus }) =>
      (await api.patch<Enquiry>(`/enquiries/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  })
}

// ───────────── Profile ─────────────

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<UserInput>) => (await api.patch<User>('/auth/me', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  })
}

/** Changing the password signs out every other device. */
export function useChangePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      (await api.patch<{ updated: boolean; otherSessionsRevoked: number }>('/auth/change-password', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  })
}

// ───────────── Signed-in devices ─────────────

export interface AuthSession {
  id: string
  client: 'WEB' | 'MOBILE'
  userAgent: string | null
  ip: string | null
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  current: boolean
}

const SESSIONS_KEY = ['auth', 'sessions'] as const

export const useSessions = () =>
  useQuery({ queryKey: SESSIONS_KEY, queryFn: async () => (await api.get<AuthSession[]>('/auth/sessions')).data })

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<{ revoked: boolean }>(`/auth/sessions/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  })
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<{ revoked: number }>('/auth/sessions/revoke-others')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  })
}

// ───────────── Documents (PDF) ─────────────

export type DocumentType = 'invoice' | 'booking'

export interface DocumentLinks {
  pdfUrl: string
  filename: string
  whatsappUrl: string
  email: string | null
  whatsappAutomatic: boolean
  emailTestInbox: boolean
}

export interface SendResult {
  channel: 'email' | 'whatsapp'
  sent: boolean
  to: string
  pdfUrl: string
  whatsappUrl?: string
  previewUrl?: string
}

/** Downloads the PDF through the authenticated endpoint and saves it. */
export async function downloadDocument(type: DocumentType, bookingId: number, fallbackName: string) {
  const res = await api.get<Blob>(`/documents/${type}/${bookingId}/pdf`, { responseType: 'blob' })
  const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? fallbackName
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const useSendDocument = () =>
  useMutation({
    mutationFn: async ({ type, bookingId, channel, to }: { type: DocumentType; bookingId: number; channel: 'email' | 'whatsapp'; to?: string }) =>
      (await api.post<SendResult>(`/documents/${type}/${bookingId}/send`, { channel, to })).data,
  })
