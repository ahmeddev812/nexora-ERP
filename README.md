<div align="center">

# NEXORA

### Run everything. From one place.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%20strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**[🚀 Live Demo](https://your-demo-url.vercel.app)** · **[Report a Bug](../../issues)** · **[Request a Feature](../../issues)**

</div>

---

NEXORA is a premium, browser-based Enterprise Business ERP that connects customers, suppliers, sales, purchasing, inventory, finance, HR and reporting into a single connected workspace. Every module reads from the same underlying records, so you change data once and every screen follows. It runs entirely in the browser with zero backend.

## 💡 What is NEXORA?

- **One source of truth:** sales, purchasing, stock and accounting all share the same records.
- **Complete business cycles:** Order-to-Cash and Procure-to-Pay, end to end.
- **Real accounting:** every transaction posts a balanced double-entry journal.
- **Role-aware:** six roles with granular permissions and a full audit log.
- **Zero backend:** no server, no database, no signup. Open it and run it.
- **Premium UX:** light, dark and system themes, smooth animations, and a ⌘K command palette.

> [!WARNING]
> **NEXORA is a client-side application. All data is stored in your browser's `localStorage`.** There is no server, no encryption at rest, and no real authentication. Do **not** enter real customer data, financial records, credentials or any sensitive information. See [Privacy & Security Boundary](#-privacy--security-boundary).

## ✨ Features

### Core Modules

| Module | Capabilities |
|---|---|
| **Executive Dashboard** | KPIs, revenue trend, activity feed, priority tasks, date and entity filters |
| **CRM & Contacts** | Customers and suppliers, profiles, credit limits, full transaction history |
| **Products & Catalog** | SKU, categories, units, barcodes, pricing, reorder levels |
| **Inventory** | Stock balances, stock ledger, transfers, reservations, adjustments, reorder alerts |
| **Sales (Order-to-Cash)** | Quotations → sales orders → deliveries → invoices → payments → returns |
| **Purchasing (Procure-to-Pay)** | Purchase requests → POs → goods receipts → supplier bills → payments → returns |
| **Finance & Accounting** | Chart of accounts, double-entry journal, general ledger, AR/AP aging, payments, P&L, balance sheet, trial balance |
| **Human Resources** | Employees, departments, attendance, leave requests, payroll runs |
| **Reports & Analytics** | Sales, purchase and stock reports, trends, top products, customers and suppliers, CSV export |

### Platform

| Module | Capabilities |
|---|---|
| **Administration** | Users, roles (`owner` · `admin` · `manager` · `cashier` · `accountant` · `viewer`), permissions, audit log |
| **Settings** | Business profile, currency, timezone, fiscal year, theme, JSON export/import, full reset |
| **Global Search** | ⌘K command palette across every entity |

### Built-in Integrity Rules

- Debits always equal credits (enforced on every journal entry)
- Posted journal entries can only be reversed, never edited or deleted
- Stock reservations reduce available quantity before delivery
- Approval workflows on sales and purchasing documents
- Every mutation is written to the audit log

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 (`@theme` in `globals.css`) |
| Animation | framer-motion |
| Theming | next-themes (light / dark / system) |
| Charts | recharts |
| Icons | lucide-react |
| Persistence | Browser `localStorage` |
| Deployment | Vercel |

**No backend. No database. No real payments.**

## 📁 Project Structure

```
nexora/
├── app/                      # Next.js App Router
│   ├── (app)/                # Authenticated workspace routes
│   │   ├── dashboard/
│   │   ├── contacts/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── purchasing/
│   │   ├── finance/
│   │   ├── hr/
│   │   ├── reports/
│   │   ├── admin/
│   │   └── settings/
│   ├── globals.css           # Tailwind v4 @theme tokens
│   └── layout.tsx
├── components/               # Shared UI (tables, forms, charts, palette)
├── lib/
│   ├── storage/              # localStorage adapter, key registry, migrations
│   ├── accounting/           # Journal posting, ledger, statements
│   ├── inventory/            # Balances, movements, reservations
│   ├── calc/                 # KPI and calculation rules
│   ├── permissions/          # Role and permission checks
│   └── seed/                 # Demo data generators
├── hooks/                    # Data and UI hooks
├── types/                    # Shared TypeScript domain types
└── public/
```

## 🗄️ Data Model

All data lives in `localStorage` under keys prefixed with `nexora_`.

**Core & Access**

| Key | Purpose |
|---|---|
| `nexora_users` · `nexora_current_user` | User accounts and active session |
| `nexora_business` · `nexora_settings` | Business profile and preferences |
| `nexora_permissions` | Role-permission matrix |

**Master Data**

| Key | Purpose |
|---|---|
| `nexora_customers` · `nexora_suppliers` | Contacts |
| `nexora_products` · `nexora_categories` · `nexora_units` | Catalog |
| `nexora_warehouses` · `nexora_branches` | Locations |

**Sales**

| Key | Purpose |
|---|---|
| `nexora_quotations` · `nexora_sales_orders` | Pre-sale and order documents |
| `nexora_deliveries` · `nexora_sales_invoices` | Fulfilment and billing |
| `nexora_customer_returns` | Returns and credits |

**Purchasing**

| Key | Purpose |
|---|---|
| `nexora_purchase_requests` · `nexora_purchase_orders` | Requisition and ordering |
| `nexora_goods_receipts` · `nexora_supplier_bills` | Receiving and billing |
| `nexora_purchase_returns` | Supplier returns |

**Inventory**

| Key | Purpose |
|---|---|
| `nexora_stock_balances` · `nexora_stock_movements` | Current stock and ledger |
| `nexora_stock_transfers` · `nexora_stock_reservations` | Transfers and holds |
| `nexora_stock_adjustments` | Corrections |

**Finance**

| Key | Purpose |
|---|---|
| `nexora_accounts` | Chart of accounts |
| `nexora_journal_entries` · `nexora_journal_lines` | Double-entry ledger |
| `nexora_payments` · `nexora_payment_allocations` | Payments and invoice/bill allocation |
| `nexora_fiscal_periods` · `nexora_expenses` | Periods and expenses |

**HR**

| Key | Purpose |
|---|---|
| `nexora_employees` · `nexora_departments` | People and structure |
| `nexora_attendance` · `nexora_leave_requests` | Time and leave |
| `nexora_payroll_runs` | Payroll |

**System**

| Key | Purpose |
|---|---|
| `nexora_approvals` | Approval requests and decisions |
| `nexora_audit_log` | Immutable activity trail |
| `nexora_document_sequences` | Auto-numbering for documents |

## 🔄 Key Workflows

**Order-to-Cash**

```
Customer → Quotation → Sales Order → Approval
  → Stock Reservation → Delivery → Stock Deduction
  → Invoice → Accounts Receivable → Payment → Receipt
```

**Procure-to-Pay**

```
Purchase Request → Purchase Order → Supplier Delivery
  → Goods Receipt → Inventory Increase → Supplier Bill
  → Accounts Payable → Payment → Supplier Settlement
```

**Accounting**

```
Every transaction → Journal Entry (double-entry)
Total Debit = Total Credit          (enforced)
Posted entries → Reversal only      (no edit / delete)
```

## 🧮 Calculation Rules

| Metric | Formula |
|---|---|
| Revenue | Sum of paid sales invoices |
| Expenses | Sum of paid supplier bills + expenses |
| Receivables | Sum of unpaid and partially paid sales invoices |
| Payables | Sum of unpaid and partially paid supplier bills |
| Stock Value | Σ (quantity × cost price) |
| Gross Profit | Revenue − COGS |
| Net Profit | Revenue − Expenses |
| Profit Margin % | (Net Profit ÷ Revenue) × 100 |
| Stock Available | Quantity − reserved quantity |
| Invoice Balance | Total − paid amount |
| Aging Buckets | 0–30 · 31–60 · 61–90 · 90+ days |

**Edge cases:** refunded and cancelled orders are excluded from revenue. Division by zero is never performed; insufficient data returns an empty state.

## 🔒 Privacy & Security Boundary

| Aspect | Reality |
|---|---|
| Data location | Your browser's `localStorage` only; nothing is sent to any server |
| Authentication | Client-side simulation for demonstration; not a security boundary |
| Roles & permissions | Enforce UI behaviour only; anyone with browser access can bypass them |
| Encryption | None. Data is stored as plain JSON |
| Persistence | Cleared if you clear site data; not shared across browsers or devices |
| Payments | Simulated records only; no real money movement |
| Recommended use | Demos, prototyping, education, evaluation, personal experimentation |

> [!CAUTION]
> Do not use NEXORA to store production, regulated or personally identifiable data.

## 🗺️ Roadmap

The following are **intentionally out of scope** for the current release:

| Item | Status |
|---|---|
| Backend API and database | Out of scope |
| Real authentication (SSO, OAuth, MFA) | Out of scope |
| Multi-user sync and real-time collaboration | Out of scope |
| Real payment gateway integrations | Out of scope |
| E-invoicing and tax authority filing | Out of scope |
| Bank feeds and reconciliation | Out of scope |
| Email, SMS and notification delivery | Out of scope |
| Native mobile apps | Out of scope |

## 📄 License

Released under the [MIT License](./LICENSE). © 2026 NEXORA contributors.

---

<div align="center">

**NEXORA**

*Run everything. From one place.*

</div>
