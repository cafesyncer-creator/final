# CafeLedger

**Multi-Tenant andWhite-Label Cafe Accounts Web Application**

Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase (PostgreSQL, Auth, Storage, Row-Level Security).

Single Supabase project and single Next.js project powering all three user panels with full data isolation, sub-second queries, and automated daily balances.

---

## ☕ Key Specifications & Conventions

- **Currency:** Indian Rupee ₹ (`en-IN` numbering: thousands, Lakhs, Crores)
- **Timezone:** `Asia/Kolkata` (IST)
- **Date Format:** `DD-MM-YYYY`
- **Design Philosophy:** Mobile-first & responsive (optimized for shop managers using phones)
- **Tenancy Architecture:** Single Supabase DB with strict PostgreSQL Row Level Security (RLS)

---

## 👥 Roles & Access Hierarchy

1. **Master (`master`)**  
   - Platform super-administrator.  
   - Creates Brands, assigns Brand Directors, monitors cross-brand platform audit logs.  
   - Full bypass/access via RLS. Route: `/master/*`.

2. **Brand Admin (`admin`)**  
   - Brand Director/Operations Head.  
   - Creates Shops, manages Brand Menu items, payment modes, employees, assets, and reviews real-time multi-shop daily summaries.  
   - RLS strictly isolates data to their `brand_id`. Route: `/admin/*`.

3. **Shop Manager (`manager`)**  
   - On-the-ground store manager operating a single cafe outlet on a smartphone.  
   - Daily counter billing entry, real-time expenses, salary advances, employee attendance, asset service alerts.  
   - RLS strictly isolates data to their assigned `shop_id`. Route: `/shop/*`.

---

## 🔑 Test Login Credentials

All test accounts share the default password: **`password123`**

| Role | Email | Password | Assigned Panel / Scope |
| :--- | :--- | :--- | :--- |
| **Master** | `master@cafeledger.io` | `password123` | `/master` (Global platform control) |
| **Brand Admin** | `admin@snaxia.in` | `password123` | `/admin` (Snaxia Artisanal Cafes) |
| **Shop Manager 1** | `manager.indiranagar@snaxia.in` | `password123` | `/shop` (Snaxia Indiranagar - `SNX-BLR-01`) |
| **Shop Manager 2** | `manager.koramangala@snaxia.in` | `password123` | `/shop` (Snaxia Koramangala - `SNX-BLR-02`) |
| **Shop Manager 3** | `manager.bandra@snaxia.in` | `password123` | `/shop` (Snaxia Bandra West - `SNX-BOM-01`) |
| **Shop Manager 4** | `manager.colaba@snaxia.in` | `password123` | `/shop` (Snaxia Colaba - `SNX-BOM-02`) |
| **Shop Manager 5** | `manager.cp@snaxia.in` | `password123` | `/shop` (Snaxia Connaught Place - `SNX-DEL-01`) |
| **Shop Manager 6** | `manager.jubileehills@snaxia.in` | `password123` | `/shop` (Snaxia Jubilee Hills - `SNX-HYD-01`) |
| **Shop Manager 7** | `manager.annanagar@snaxia.in` | `password123` | `/shop` (Snaxia Anna Nagar - `SNX-MAA-01`) |
| **Shop Manager 8** | `manager.parkstreet@snaxia.in` | `password123` | `/shop` (Snaxia Park Street - `SNX-CCU-01`) |
| **Shop Manager 9** | `manager.koregaon@snaxia.in` | `password123` | `/shop` (Snaxia Koregaon Park - `SNX-PNQ-01`) |
| **Shop Manager 10** | `manager.panjim@snaxia.in` | `password123` | `/shop` (Snaxia Panjim Promenade - `SNX-GOA-01`) |

---

## 🗄️ Database Architecture & Migrations

All tables include automatic `created_at` and `updated_at` timestamps.

### Tables
1. **`brands`**: id, name, registration_no (UNIQUE), logo_url, primary_color, secondary_color, address, phone, email, gstin, status (`active` | `suspended`).
2. **`shops`**: id, brand_id, name, code, address, phone, status (`active` | `inactive`).
3. **`profiles`**: id (`references auth.users.id`), role (`master` | `admin` | `manager`), brand_id, shop_id (nullable), full_name, phone, is_active, must_change_password.
4. **`items`**: id, brand_id, name, kind (`income` | `expense`), category, is_active (soft-delete only).
5. **`payment_modes`**: id, brand_id, name, is_active (CASH, GPAY, BANK, CARD).
6. **`transactions`**: id, brand_id, shop_id, txn_date, kind, item_id, item_name_snapshot, mode_id, mode_name_snapshot, amount, note, employee_id, txn_type (`normal` | `salary_advance` | `salary_payment`), created_by, is_deleted.
7. **`month_openings`**: id, shop_id, month (`YYYY-MM`), opening_balance, is_manual, note, closed_at.
8. **`daily_summary`**: shop_id, summary_date, opening, income, expense, closing (auto-updated by DB trigger).
9. **`employees`**: id, brand_id, shop_id, name, phone, role_title, rate_per_day, is_active.
10. **`salary_records`**: id, shop_id, employee_id, month, days_worked, rate_snapshot, gross, advances_total, paid_total, balance.
11. **`assets`**: id, brand_id, shop_id, name, category (`freezer` | `fryer` | `lights` | `chiller` | `grinder` | `other`), model, serial_no, purchase_date, cost, vendor, status, last_service_date, service_interval_days, next_service_due, notes.
12. **`asset_service_logs`**: id, asset_id, service_date, vendor, cost, notes, next_due.
13. **`item_requests`**: id, shop_id, requested_by, name, kind, status (`pending` | `approved` | `rejected`).
14. **`audit_log`**: id, user_id, action, table_name, record_id, old_data, new_data, at.

### Performance Indexes
- `transactions(shop_id, txn_date)`
- `transactions(brand_id, txn_date)`
- `assets(shop_id, next_service_due)`
- `salary_records(shop_id, month)`
- `daily_summary(shop_id, summary_date)`

### DB Triggers & Real-Time Sync
- **`trg_sync_daily_summary_on_txn`**: Automatically recalculates and updates `daily_summary` upon transaction insert, update, or soft-deletion.
- **`ensure_month_opening`**: Automatically carries forward the previous month's final closing balance into the new month.
- **`trg_sync_salary_on_txn`**: Automatically updates advances and balances in `salary_records` when a `salary_advance` or `salary_payment` transaction is recorded.

---

## 🔒 Row-Level Security (RLS) Rules

1. `master` can view/modify all records across all brands.
2. `admin` can only access records matching their `brand_id`.
3. `manager` can only access records matching their assigned `shop_id`.
4. Client input for `brand_id` and `shop_id` is **never trusted**; both are derived server-side via `public.auth_role()`, `public.auth_brand_id()`, and `public.auth_shop_id()`.
5. Privileged work (creating auth users, password resets, shop & brand deletions, user recreation) runs exclusively via Supabase Edge Functions with `SUPABASE_SERVICE_ROLE_KEY` held securely in Supabase Secrets. The Next.js apps never hold or require the service role key.

---

## 📊 Shared Reports Library (`lib/reports`)

### 1. Excel Generator (`lib/reports/excel.ts` via ExcelJS)
- **Sheet "Daily Summary":** Date, Opening, Income, Expense, Net, Closing. Real Excel formula totals: `=SUM(C5:C35)`, etc.
- **Sheet "Transactions":** DATE, DESCRIPTION, MOP, INCOME, EXPENSES with formula totals.
- **Sheet "Salary":** employee, days, rate, gross, advances, paid, balance with formula totals.
- Formatted with Indian currency (`₹#,##0.00`) and styled with the active brand's primary color.

### 2. PDF Generator (`lib/reports/pdf.tsx` via `@react-pdf/renderer`)
- Elegant A4 layout.
- Header with brand logo, brand name, registration number, shop name, period, and generation timestamp.
- Executive Summary Cards: Opening, Income, Expenses, Profit/Loss, Closing.
- Daily summary breakdown table.
- Expense by Category breakdown.
- Salary & Advances table.
- Running page numbers in footer (`Page X of Y`).
- ₹ amounts right-aligned.

---

## 🎨 White-Label Dynamic Theming & Shared Layout

- **`BrandProvider` (`components/shared/brand-provider.tsx`):** Reads brand configuration from Supabase and sets dynamic CSS custom variables (`--brand-primary`, `--brand-secondary`) on `:root`.
- **`SharedHeader` (`components/shared/header.tsx`):** Responsive navigation with brand logo, shop context badge, role indicator, and sign-out dropdown.
- **`SharedSidebar` (`components/shared/sidebar.tsx`):** Mobile drawer on phones, persistent sidebar on desktop. Role-specific links with active indicator.
- **`DataTable` (`components/shared/data-table.tsx`):** Server-side paginated data table (50 rows/page standard) with sorting, loading skeletons, and empty state.
- **`DateRangePicker` (`components/shared/date-range-picker.tsx`):** Fast Indian presets (Today, Yesterday, This Week, This Month, Last Month, Last 12 Months).

---

## 🚀 Getting Started

### 1. Environment Setup
Copy the example environment files in each app (`apps/master/.env.example`, `apps/admin/.env.example`, `apps/shop/.env.example`):
```bash
# In each app directory:
cp .env.example .env.local
```
Fill in your public Supabase project URL, Anon Key, and cross-app URLs:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

NEXT_PUBLIC_MASTER_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3001
NEXT_PUBLIC_SHOP_APP_URL=http://localhost:3002
```
> **Security Notice:** The Next.js apps (`apps/master`, `apps/admin`, `apps/shop`) never require or use `SUPABASE_SERVICE_ROLE_KEY`. All privileged operations run securely in Supabase Edge Functions.

---

## ⚡ Supabase Edge Functions Architecture

All privileged administrative workflows that require service role access are decoupled into standalone Supabase Edge Functions located in `supabase/functions/`:

1. **`create-shop-with-manager`**: Provisions a new shop and its primary manager auth user.
2. **`create-manager-user`**: Provisions an additional manager auth user for an assigned shop.
3. **`reset-manager-password`**: Generates a secure temporary password and sets `must_change_password=true`.
4. **`delete-shop`**: Validates transaction history (refuses deletion if transactions > 0), cascades DB shop records, and purges manager auth accounts.
5. **`create-brand-admin`**: Provisions a brand administrator auth user (Platform Master access only).
6. **`delete-brand`**: Cascades all brand DB entities, purges brand auth accounts, and cleans storage files in `brand-assets` (Platform Master access only).
7. **`recreate-users`**: Batch recreates auth logins from backup manifests during Restore operations (Platform Master access only).
8. **`delete-auth-users`**: Purges auth accounts and cleans brand storage files during Remove Data actions.

### Edge Function Security Principles
- **JWT Verification**: Every function validates the caller's Supabase JWT via `_shared/auth.ts`.
- **Role & Tenancy Enforcement**: Brand Admins can only act on resources within their assigned `brand_id`. Shop Managers are strictly rejected from all edge functions.
- **CORS Protection**: Enforces origin checks against the configured `ALLOWED_ORIGINS` secret and handles HTTP OPTIONS preflights.
- **Audit Logging**: Every action writes an entry to `public.audit_log` with passwords sanitized.
- **Zero Client Service Key**: `SUPABASE_SERVICE_ROLE_KEY` is accessible only within the Supabase Edge runtime via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.

### Deploying Edge Functions to Supabase
```bash
# Set Edge Function secrets
supabase secrets set ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:3002,https://master.cafesync.app,https://admin.cafesync.app,https://shop.cafesync.app"

# Deploy all functions
supabase functions deploy create-shop-with-manager
supabase functions deploy create-manager-user
supabase functions deploy reset-manager-password
supabase functions deploy delete-shop
supabase functions deploy create-brand-admin
supabase functions deploy delete-brand
supabase functions deploy recreate-users
supabase functions deploy delete-auth-users
```

### Local Testing with Supabase CLI
```bash
# 1. Start local Supabase containers (DB, Auth, Storage, Edge Runtime)
supabase start

# 2. Serve edge functions locally with environment secrets
supabase functions serve --env-file ./supabase/.env.local

# 3. Test a function directly via curl (example: reset-manager-password)
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reset-manager-password' \
  --header 'Authorization: Bearer <USER_JWT>' \
  --header 'Origin: http://localhost:3001' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"<TARGET_USER_ID>"}'
```

### 2. Apply Migrations to Supabase
Run the migrations in order in your Supabase SQL Editor:
1. `supabase/migrations/20261109000000_init_schema.sql` (Tables & Indexes)
2. `supabase/migrations/20261109000001_triggers_functions.sql` (Triggers, Functions & RLS Policies)

### 3. Generate & Load Seed Data (10 Shops, 12 Months)
Generate the realistic test dataset:
```bash
npm run seed
```
This generates `supabase/seed.sql` (71 KB). Apply it via:
- **Option A:** Supabase CLI: `supabase db reset`
- **Option B:** Copy `supabase/seed.sql` into the Supabase Dashboard SQL Editor and click **Run**.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the login portal.

---

## 📁 Foundation Files Created

```
snaxia_project/
├── .env.example                               # Environment documentation with server-only key warning
├── README.md                                  # Setup & architecture guide
├── middleware.ts                              # Auth session refresher & role-based panel router
│
├── app/
│   ├── (auth)/login/
│   │   ├── page.tsx                           # Mobile-friendly white-label login page
│   │   └── actions.ts                         # Server actions for authentication & role redirect
│   ├── master/page.tsx                        # Master panel foundation placeholder
│   ├── admin/page.tsx                         # Brand admin panel foundation placeholder
│   ├── shop/page.tsx                          # Shop manager counter panel foundation placeholder
│   ├── globals.css                            # Tailwind CSS with CSS variables & brand tokens
│   ├── layout.tsx                             # Root layout with Toast notification provider
│   └── page.tsx                               # Root redirect handler
│
├── components/
│   ├── shared/
│   │   ├── brand-provider.tsx                 # Dynamic brand CSS variable injector
│   │   ├── header.tsx                         # Responsive header with logo & user context
│   │   ├── sidebar.tsx                        # Responsive desktop/mobile-drawer navigation
│   │   ├── data-table.tsx                     # 50-row server-side paginated data table
│   │   ├── date-range-picker.tsx              # DD-MM-YYYY Indian date presets picker
│   │   ├── stat-card.tsx                      # ₹ summary metric cards
│   │   ├── layout-wrapper.tsx                 # Unified layout integrating header/sidebar/drawer
│   │   └── index.ts                           # Barrel export
│   └── ui/
│       ├── button.tsx                         # Radix/CVA button with brand primary support
│       ├── card.tsx                           # Card container primitives
│       ├── badge.tsx                          # Status badges
│       ├── input.tsx                          # Form input field
│       ├── label.tsx                          # Accessible label
│       ├── table.tsx                          # Accessible table primitives
│       ├── dialog.tsx                         # Accessible dialog modal
│       ├── dropdown-menu.tsx                  # Accessible dropdown menu
│       └── sonner.tsx                         # Toast notification wrapper
│
├── lib/
│   ├── supabase/
│   │   ├── types.ts                           # Full TypeScript schema definitions
│   │   ├── client.ts                          # Browser SSR client
│   │   ├── server.ts                          # Server SSR client with cookies
│   │   ├── admin.ts                           # Service role client (server-only)
│   │   └── middleware.ts                      # Route guard & session refresher
│   ├── calculations/
│   │   ├── currency.ts                        # ₹ en-IN formatting (Lakhs/Crores)
│   │   ├── dates.ts                           # DD-MM-YYYY & Asia/Kolkata date helpers
│   │   ├── financials.ts                      # Closing balance, gross/salary, profit/loss
│   │   └── index.ts                           # Barrel export
│   ├── reports/
│   │   ├── types.ts                           # Report data contracts
│   │   ├── excel.ts                           # ExcelJS 3-sheet generator with real formula totals
│   │   ├── pdf.tsx                            # @react-pdf/renderer branded A4 PDF generator
│   │   └── index.ts                           # Barrel export
│   └── utils.ts                               # Class merging helper (cn)
│
├── scripts/
│   ├── generate-seed-sql.ts                   # Realistic 10-shop 12-month data generator
│   └── seed.ts                                # Seed script runner
│
└── supabase/
    ├── migrations/
    │   ├── 20261109000000_init_schema.sql     # 14 tables, constraints, performance indexes
    │   └── 20261109000001_triggers_functions.sql # Daily summary & salary triggers, RLS policies
    └── seed.sql                               # Pre-generated 10-shop 12-month SQL seed file
```
