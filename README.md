# NEXORA

> **Run everything. From one place.**

A premium, browser-based Enterprise Business ERP that connects customers, suppliers, sales, purchasing, inventory, finance, HR and reporting into one connected workspace — all running locally in your browser with zero backend.

🔗 **Live demo:** _(coming soon — deploying to Vercel)_

---

## ✨ What is NEXORA?

NEXORA is a **working Enterprise Business ERP**, not a static mockup. Every module reads from the same underlying records. Enter a sale, receive stock, post an invoice, or approve a purchase — and every dependent screen (dashboard, inventory, finance, reports) updates from that single source of truth.

- **Local-first** — all data lives in your browser's `localStorage` under `nexora_*` keys. Nothing is sent to a server.
- **Connected modules** — Sales, Purchasing, Inventory, Finance and HR share one data model.
- **Auditable** — every sensitive action writes an audit log entry with actor, action, entity and timestamp.
- **Honest numbers** — KPIs are always derived from records; nothing is hard-coded. Insufficient data shows an empty state, never a fabricated figure.
- **Opt-in demo** — load ~90 days of sample data with one click, or start with a clean workspace.

> ⚠️ **Security boundary:** Authentication is local/demo only. Credentials and data are stored on your device and are **not** production-grade. Do not reuse a real password.

---

## 🚀 Features

### Executive Dashboard
- Time-based greeting and business context
- Live KPI cards: Revenue, Expenses, Receivables, Payables, Stock Alerts
- Revenue trend chart (Recharts)
- Business activity feed (from audit log)
- Priority tasks: overdue receivables, low-stock items, pending approvals
- Date range and branch filters

### CRM & Contacts
- Customer and supplier profiles with addresses, contact persons, credit limits and payment terms
- Transaction history per party
- Search, filters, tags, bulk actions
- CSV import / export
- Delete confirmation and no-results states

### Products & Catalog
- SKU, categories, units, barcodes
- Cost price, sell price, tax rate, reorder level
- Status: `active | draft | archived`
- Historical order lines **retain captured prices** — history never rewrites itself

### Inventory
- Stock balances per product per warehouse
- Full stock ledger (receipts, dispatches, transfers, adjustments, returns)
- Stock transfers between warehouses
- Stock reservations from sales orders
- Reorder alerts (low stock / out of stock)
- Every movement records the balance after

### Sales — Order-to-Cash
- Quotations → Sales Orders → Deliveries → Invoices → Payments
- Approval workflow: `draft → pending → approved → fulfilled`
- Stock reservation on approval, stock deduction on delivery
- Partial payments, overdue detection
- Customer returns with stock re-entry
- Print-friendly invoice view

### Purchasing — Procure-to-Pay
- Purchase Requests → Purchase Orders → Goods Receipts → Supplier Bills → Payments
- Partial receipts supported
- Supplier returns with stock-out
- Overdue detection on bills

### Finance & Accounting
- Chart of accounts (asset / liability / equity / revenue / expense)
- Double-entry journal — **total debit must equal total credit**
- Posted entries can only be reversed, never edited or deleted
- General ledger with account and date filters
- Receivables and payables aging (0–30, 31–60, 61–90, 90+)
- Payments (customer receipts, supplier payments) with allocation
- Profit & Loss, Balance Sheet, Trial Balance

### HR
- Employee records and departments
- Attendance marking with check-in / check-out
- Leave requests and approval workflow
- Payroll runs with gross / deductions / net
- Salary statements (restricted to authorized roles)

### Reports & Analytics
- Sales Summary, Purchase Summary, Stock Report, Stock Ledger
- AR / AP Aging, Account Balance
- Income Statement, Balance Sheet
- Revenue, expense and profit trends
- Top products, top customers, top suppliers
- CSV export with date-stamped filenames
- Print-friendly report view

### Administration
- Users with roles: `owner | admin | manager | cashier | accountant | viewer`
- Permission-based UI (actions hidden/disabled if not allowed)
- Same checks enforced in the action layer, not just the UI
- Audit log viewer with filters
- Document sequences (auto-numbering with reset policy)

### Settings
- Business profile, currency, timezone, fiscal year
- Theme (light / dark / system)
- Tax defaults, warehouse defaults
- JSON export / import with schema validation
- Danger zone: safe reset of `nexora_*` keys

### Global Search
- `⌘K` / `Ctrl+K` command palette
- Search across customers, suppliers, products, orders, invoices, journal entries
- Keyboard navigation, grouped results, no-results state

---

## 🧱 Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Framework, routing, layouts |
| **React 19** | UI and client state |
| **TypeScript 5** (strict) | Type safety |
| **Tailwind CSS v4** | Styling (`@theme` in `globals.css`) |
| **framer-motion** | Animations |
| **next-themes** | Light / dark / system theme |
| **Recharts** | Charts |
| **lucide-react** | Icons |
| **localStorage** | Local persistence |
| **Vercel** | Deployment |

> No backend, no database, no real payments. This is a local-first product by design.

---

## 📁 Project Structure

```
src/
├── app/                    # Routes, layout, providers, globals.css
├── components/
│   ├── ui/                 # Primitives (Button, Card, Modal, DataTable, …)
│   ├── layout/             # Sidebar, TopBar, MobileNav, AppShell
│   ├── landing/            # Landing page sections
│   ├── dashboard/          # Dashboard widgets
│   ├── sales/, purchasing/, inventory/,
│   ├── customers/, suppliers/, products/,
│   ├── finance/, hr/, reports/
│   ├── brand/              # NEXORA logo
│   └── auth/               # Auth guard
├── context/                # ERPDataProvider, AuthContext
├── hooks/                  # useERPData, useAuth, useDelayedLoad
├── lib/                    # storage, calculations, dates, id,
│                           # permissions, audit, export, seed, auth
├── data/                   # sampleData.ts
└── types/                  # erp.ts
```

---

## 🗄️ Data Model (localStorage)

All keys are prefixed with `nexora_`:

### Core
| Key | Purpose |
|---|---|
| `nexora_users` | Local demo users |
| `nexora_current_user` | Current session user |
| `nexora_remember_me` | Remember-me state |
| `nexora_business` | Business profile + onboarding state |
| `nexora_settings` | Theme, currency, timezone, fiscal year |
| `nexora_permissions` | Role → permission map |

### Master Data
| Key | Purpose |
|---|---|
| `nexora_customers` | `Customer[]` |
| `nexora_suppliers` | `Supplier[]` |
| `nexora_products` | `Product[]` |
| `nexora_categories` | `Category[]` |
| `nexora_units` | `Unit[]` |
| `nexora_warehouses` | `Warehouse[]` |
| `nexora_branches` | `Branch[]` |

### Sales & Purchasing
`nexora_quotations`, `nexora_sales_orders`, `nexora_deliveries`, `nexora_sales_invoices`, `nexora_customer_returns`, `nexora_purchase_requests`, `nexora_purchase_orders`, `nexora_goods_receipts`, `nexora_supplier_bills`, `nexora_purchase_returns`

### Inventory
`nexora_stock_balances`, `nexora_stock_movements`, `nexora_stock_transfers`, `nexora_stock_reservations`, `nexora_stock_adjustments`

### Finance
`nexora_accounts`, `nexora_journal_entries`, `nexora_journal_lines`, `nexora_payments`, `nexora_payment_allocations`, `nexora_fiscal_periods`, `nexora_expenses`

### HR
`nexora_employees`, `nexora_departments`, `nexora_attendance`, `nexora_leave_requests`, `nexora_payroll_runs`

### Governance
`nexora_approvals`, `nexora_audit_log`, `nexora_document_sequences`

**Reset Data** clears only `nexora_*` keys. Export a JSON backup before resetting.

---

## 🔄 Key Workflows

### Order-to-Cash
```
Customer → Quotation → Sales Order → Approval
→ Stock Reservation → Delivery → Stock Deduction
→ Invoice → Accounts Receivable → Payment → Receipt
```

### Procure-to-Pay
```
Purchase Request → Purchase Order
→ Supplier Delivery → Goods Receipt
→ Inventory Increase → Supplier Bill
→ Accounts Payable → Payment → Supplier Settlement
```

### Inventory Movement
```
Goods Receipt → Stock In  → Balance Update → Ledger Entry
Delivery      → Stock Out → Balance Update → Ledger Entry
Transfer      → Stock Out (from) + Stock In (to)
Adjustment    → Balance ± → Ledger Entry
```

### Accounting
```
Every transaction → Journal Entry (double-entry)
Total Debit = Total Credit (enforced)
Posted entries → Reversal only (no edit / delete)
```

---

## 🧮 Calculation Rules

| Metric | Formula |
|---|---|
| Revenue | Sum of paid sales invoices |
| Expenses | Sum of paid supplier bills + expenses |
| Receivables | Sum of unpaid / partial sales invoices |
| Payables | Sum of unpaid / partial supplier bills |
| Stock Value | Σ (quantity × cost price) |
| Gross Profit | Revenue − COGS |
| Net Profit | Revenue − Expenses |
| Profit Margin % | (Net Profit / Revenue) × 100 |
| Stock Alert | quantity ≤ reorder level |
| Stock Available | quantity − reserved quantity |
| Invoice Balance | total − paid amount |
| Aging Buckets | 0–30, 31–60, 61–90, 90+ days |

Never divides by zero. Insufficient data returns a defined empty state, never `NaN` or a fabricated percentage.

**Refund rule:** refunded / cancelled orders are excluded from recognized revenue — applied consistently everywhere.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js 20+**
- npm

### Install & run

```bash
git clone <your-repo-url>
cd nexora
npm install
npm run dev
```

Open http://localhost:3000

> If you hit a `framer-motion` chunk error on first load, run with Turbopack disabled: `next dev --no-turbopack`.

### Build

```bash
npm run build
npm start
```

### Deploy

Push to GitHub and import the repo on **Vercel**. No environment variables required.

---

## 🧪 Try the Demo

1. Open the app
2. Click **Demo User** on the login page
3. Explore ~90 days of seeded customers, suppliers, products, orders, invoices, payments, stock movements and journal entries
4. Change any record — watch the dashboard, inventory, finance and reports update instantly

---

## 🔐 Privacy & Security Boundary

- No external transmission of business data
- No backend, database or real payments
- No production authentication — local / demo only
- `localStorage` is **not** encrypted
- Team roles are UI / demo roles, not server-enforced permissions
- Reset and import are explicit and safe

---

## 🗺️ Roadmap (out of scope for now)

- Real backend + PostgreSQL
- Real authentication and sessions
- Server-side authorization
- Stripe / subscription billing
- Email invitations
- Accounting and banking integrations
- Multi-tenant SaaS deployment

---

## 📜 License

MIT — free to use, learn from and adapt.

---

<p align="center">
  <strong>NEXORA</strong> — <em>Run everything. From one place.</em>
</p>