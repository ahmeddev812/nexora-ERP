You are a senior open-source maintainer. Write a premium,
professional README.md for my GitHub project.

═══════════════════════════════════════════════
PROJECT DETAILS
═══════════════════════════════════════════════

Name: NEXORA
Tagline: "Run everything. From one place."
Type: Enterprise Business ERP (General Business ERP)
Storage: localStorage only (browser-based, no backend)
Target: Global

Description: A premium, browser-based Enterprise Business ERP
that connects customers, suppliers, sales, purchasing,
inventory, finance, HR and reporting into one connected
workspace. Every module reads from the same underlying
records — change data once, every screen follows. Runs
entirely in the browser with zero backend.

═══════════════════════════════════════════════
TECH STACK
═══════════════════════════════════════════════

- Next.js 16 (App Router)
- React 19
- TypeScript 5 (strict)
- Tailwind CSS v4 (@theme in globals.css)
- framer-motion (animations)
- next-themes (light/dark/system)
- recharts (charts)
- lucide-react (icons)
- localStorage (persistence)
- Vercel (deployment)

No backend, no database, no real payments.

═══════════════════════════════════════════════
MODULES / FEATURES
═══════════════════════════════════════════════

1. Executive Dashboard — KPIs, revenue trend, activity feed,
   priority tasks, filters
2. CRM & Contacts — customers, suppliers, profiles, credit
   limits, transaction history
3. Products & Catalog — SKU, categories, units, barcodes,
   pricing, reorder levels
4. Inventory — stock balances, stock ledger, transfers,
   reservations, adjustments, reorder alerts
5. Sales (Order-to-Cash) — quotations → sales orders →
   deliveries → invoices → payments → returns
6. Purchasing (Procure-to-Pay) — purchase requests → POs →
   goods receipts → supplier bills → payments → returns
7. Finance & Accounting — chart of accounts, double-entry
   journal, general ledger, AR/AP aging, payments, P&L,
   balance sheet, trial balance
8. HR — employees, departments, attendance, leaves, payroll
9. Reports & Analytics — sales/purchase/stock reports,
   trends, top products/customers/suppliers, CSV export
10. Administration — users, roles (owner/admin/manager/
    cashier/accountant/viewer), permissions, audit log
11. Settings — business profile, currency, timezone, fiscal
    year, theme, JSON export/import, reset
12. Global Search — ⌘K command palette across all entities

═══════════════════════════════════════════════
KEY WORKFLOWS
═══════════════════════════════════════════════

Order-to-Cash:
Customer → Quotation → Sales Order → Approval
→ Stock Reservation → Delivery → Stock Deduction
→ Invoice → Accounts Receivable → Payment → Receipt

Procure-to-Pay:
Purchase Request → Purchase Order → Supplier Delivery
→ Goods Receipt → Inventory Increase → Supplier Bill
→ Accounts Payable → Payment → Supplier Settlement

Accounting:
Every transaction → Journal Entry (double-entry)
Total Debit = Total Credit (enforced)
Posted entries → Reversal only (no edit/delete)

═══════════════════════════════════════════════
DATA MODEL
═══════════════════════════════════════════════

All localStorage keys prefixed with `nexora_`:
- nexora_users, nexora_current_user, nexora_business,
  nexora_settings, nexora_permissions
- nexora_customers, nexora_suppliers, nexora_products,
  nexora_categories, nexora_units, nexora_warehouses,
  nexora_branches
- nexora_quotations, nexora_sales_orders, nexora_deliveries,
  nexora_sales_invoices, nexora_customer_returns
- nexora_purchase_requests, nexora_purchase_orders,
  nexora_goods_receipts, nexora_supplier_bills,
  nexora_purchase_returns
- nexora_stock_balances, nexora_stock_movements,
  nexora_stock_transfers, nexora_stock_reservations,
  nexora_stock_adjustments
- nexora_accounts, nexora_journal_entries, nexora_journal_lines,
  nexora_payments, nexora_payment_allocations,
  nexora_fiscal_periods, nexora_expenses
- nexora_employees, nexora_departments, nexora_attendance,
  nexora_leave_requests, nexora_payroll_runs
- nexora_approvals, nexora_audit_log, nexora_document_sequences

═══════════════════════════════════════════════
CALCULATION RULES
═══════════════════════════════════════════════

Revenue         = Sum of paid sales invoices
Expenses        = Sum of paid supplier bills + expenses
Receivables     = Sum of unpaid/partial sales invoices
Payables        = Sum of unpaid/partial supplier bills
Stock Value     = Σ (quantity × cost price)
Gross Profit    = Revenue − COGS
Net Profit      = Revenue − Expenses
Profit Margin % = (Net Profit / Revenue) × 100
Stock Available = quantity − reserved quantity
Invoice Balance = total − paid amount
Aging Buckets   = 0-30, 31-60, 61-90, 90+ days

Refund rule: refunded/cancelled orders excluded from revenue.
Never divide by zero — insufficient data returns empty state.

═══════════════════════════════════════════════
README REQUIREMENTS
═══════════════════════════════════════════════

Write the README with these sections in order:

1. Title + tagline + live demo placeholder
2. Short intro paragraph (what NEXORA is, 2-3 lines)
3. "What is NEXORA?" with bullet highlights + security warning
4. Features (grouped by module, using tables/bullets)
5. Tech Stack (table)
6. Project Structure (code block)
7. Data Model (tables grouped by category)
8. Key Workflows (code blocks with arrows)
9. Calculation Rules (table)
10. Getting Started (prerequisites, install, dev, build, deploy)
11. Try the Demo
12. Privacy & Security Boundary
13. Roadmap (out of scope items)
14. License (MIT)
15. Footer with name + tagline centered

Tone: professional, confident, premium. Like a well-funded
startup's README. Use emojis sparingly (only for section
headers). Use tables liberally. Use code blocks for
workflows and folder structure.

Add badges at the top: Next.js 16, React 19, TypeScript,
Tailwind v4, License MIT.

Length: comprehensive but scannable. A developer should be
able to understand the whole project in 3 minutes.

═══════════════════════════════════════════════
OUTPUT
═══════════════════════════════════════════════

Give me the complete README.md in a single markdown code
block, ready to copy-paste into GitHub.
