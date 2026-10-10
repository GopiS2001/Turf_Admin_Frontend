# 90s Turf — Admin Dashboard

React 19 + Vite + TypeScript + Tailwind CSS 4. Talks to the NestJS API in `../Backend`.

## Run

```bash
npm install
cp .env.example .env.local     # VITE_API_URL=http://localhost:4000/api
npm run dev                    # http://localhost:5173
```

The backend must be running, and `http://localhost:5173` must be in the backend's `CORS_ORIGINS` (it is by default). Sign in with an **Admin** account. Customers don't have logins.

```bash
npm run build      # type-check + production build into dist/
npm run lint       # oxlint
```

## Modules

| Page | What it does |
|---|---|
| **Dashboard** | Court bookings, total payments, today's revenue, outstanding balance (All time / Today / This week / This month), payments-per-month chart with table view, upcoming appointments, bookings table |
| **Bookings** | Tabs: All · Upcoming · Ongoing · Completed · Cancelled (with counts). Filters: Today / This week / This month / custom dates, payment status, search. Create & edit in a side panel with a live price estimate, custom pricing and an optional first payment. Detail panel with every booking field, payment history, record payment / advance / refund, booking-confirmation and invoice PDFs (download, email, WhatsApp), cancel, delete |
| **Invoices** | Search, status and date filters, detail panel with payments, admin correction of name/status, **Download PDF / Email / WhatsApp** (server-generated PDF), print view |
| **Users** | Customers and admins: search, role and status filters, add/edit with profile photo, address fields, role and account status. Password + confirm only for admins (customers don't sign in); delete |
| **Enquiries** | Website contact-form messages with New / Contacted / Closed status |
| **Profile settings** | Your details, photo and password |

## Structure

```
src/
  App.tsx                 routes (pages lazy-loaded), auth guard
  lib/                    api client (access token in memory, silent refresh via httpOnly cookie, 401 → refresh → retry), auth provider, types, formatting, price estimate
  hooks/queries.ts        TanStack Query hooks for every endpoint
  hooks/useUrlUpdater.ts  filters/tabs/pagination kept in the URL
  components/             layout (sidebar), UI kit (badges, drawer, dialogs, table helpers, form fields)
  pages/                  dashboard, bookings, invoices, users, enquiries, profile, login
```

Filters, tabs, page and the open booking/invoice live in the URL, so any view can be bookmarked or shared (e.g. `/bookings?status=UPCOMING&range=week`).
