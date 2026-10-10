// Mirrors the NestJS API (Backend/src). Money fields are numbers, dates are ISO strings.

export type Role = 'ADMIN' | 'CUSTOMER'
export type AccountStatus = 'ACTIVE' | 'INACTIVE'
export type BookingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'ADVANCE' | 'PAID' | 'REFUND'
export type PaymentType = 'CASH' | 'UPI' | 'BANK_TRANSFER'
export type PaymentKind = 'ADVANCE' | 'PAID' | 'REFUND'
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED'
export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'CLOSED'
export type DateRange = 'today' | 'week' | 'month' | 'custom'

export interface Paginated<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface User {
  id: number
  name: string
  profileImage: string | null
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  zipCode: string | null
  role: Role
  status: AccountStatus
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: number
  bookingId: number
  amount: number
  kind: PaymentKind
  paymentType: PaymentType
  transactionId: string | null
  paidAt: string
  note: string | null
  createdAt: string
  booking?: Pick<Booking, 'id' | 'bookingCode' | 'customerName' | 'customerPhone' | 'bookingDate' | 'totalAmount'>
}

export interface Invoice {
  id: number
  invoiceCode: string
  bookingId: number
  customerName: string
  invoiceDate: string
  amount: number
  paidAmount: number
  paidAt: string | null
  status: InvoiceStatus
  createdAt: string
  updatedAt: string
  booking?: Booking
}

export interface Booking {
  id: number
  bookingCode: string
  userId: number | null
  user?: User | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  bookingDate: string
  timeIn: string
  timeOut: string
  totalHours: number
  pricePerHour: number
  turfAmount: number
  maxGuests: number
  pricePerGuest: number
  additionalGuests: number
  additionalGuestAmount: number
  totalAmount: number
  amountPaid: number
  status: BookingStatus
  paymentStatus: PaymentStatus
  paymentType: PaymentType | null
  transactionId: string | null
  paymentDate: string | null
  notes: string | null
  source: 'ADMIN' | 'WEBSITE' | 'MOBILE'
  bookedAt: string
  createdAt: string
  updatedAt: string
  invoice?: Invoice
  payments?: Payment[]
}

export interface Enquiry {
  id: number
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: EnquiryStatus
  createdAt: string
}

export interface PricingPlan {
  id: 'weekday-day' | 'weekday-night' | 'weekend'
  name: string
  timing: string
  pricePerHour: number
  maxGuests: number
  pricePerGuest: number
}

export interface DashboardSummary {
  range: 'all' | { from: string; to: string }
  totalBookings: number
  bookingsByStatus: Record<BookingStatus, number>
  totalPayments: number
  paymentsBreakdown: { received: number; refunded: number; net: number }
  todayRevenue: number
  bookingValue: number
  outstandingAmount: number
}

export interface RevenuePoint {
  month: string
  label: string
  revenue: number
  bookings: number
}

export type BookingCounts = Record<BookingStatus | 'ALL', number>

export interface PaymentInput {
  amount: number
  kind?: PaymentKind
  paymentType: PaymentType
  transactionId?: string
  paidAt?: string
  note?: string
}

export interface BookingInput {
  userId?: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  bookingDate: string
  timeIn: string
  timeOut: string
  additionalGuests?: number
  pricePerHour?: number
  maxGuests?: number
  pricePerGuest?: number
  notes?: string
  payment?: PaymentInput
}

export interface UserInput {
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  zipCode?: string
  password?: string
  confirmPassword?: string
  role?: Role
  status?: AccountStatus
}
