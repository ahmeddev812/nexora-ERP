/**
 * NEXORA calculations.
 *
 * Every KPI, total and metric in the app is derived here. Nothing in the UI
 * hard-codes a metric. Division by a zero or missing denominator returns
 * `null` (rendered as an empty state), never `NaN` or `Infinity`.
 */

import type {
  Account,
  AccountType,
  CustomerReturn,
  DocumentLine,
  DocumentTotals,
  Expense,
  InvoiceStatus,
  JournalEntry,
  JournalLine,
  Product,
  SalesInvoice,
  StockBalance,
  SupplierBill,
} from "@/types/erp";

import type { AgingBucket, DateKey } from "./dates";
import { AGING_BUCKETS, agingBucket, todayKey } from "./dates";

/* ------------------------------- Rounding ------------------------- */

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Returns null instead of NaN when the denominator is zero or invalid. */
export function safeRatio(
  numerator: number,
  denominator: number,
): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const ratio = numerator / denominator;
  return Number.isFinite(ratio) ? ratio : null;
}

export function percentOf(part: number, whole: number): number | null {
  const ratio = safeRatio(part, whole);
  return ratio === null ? null : round2(ratio * 100);
}

export function percentChange(current: number, previous: number): number | null {
  const ratio = safeRatio(current - previous, Math.abs(previous));
  return ratio === null ? null : round2(ratio * 100);
}

export function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  let total = 0;
  for (const item of items) {
    const value = pick(item);
    if (Number.isFinite(value)) total += value;
  }
  return round2(total);
}

/* -------------------------------- Ranges -------------------------- */

export interface DateRange {
  from: DateKey;
  to: DateKey;
}

export function dateRange(from: DateKey, to: DateKey): DateRange {
  return { from, to };
}

export function lastNDaysRange(n: number, asOf: DateKey = todayKey()): DateRange {
  const size = Math.max(1, Math.floor(n));
  const from = new Date(asOf);
  from.setDate(from.getDate() - (size - 1));
  const key = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(from.getDate()).padStart(2, "0")}`;
  return { from: key, to: asOf };
}

export function thisMonthRange(asOf: DateKey = todayKey()): DateRange {
  const from = `${asOf.slice(0, 7)}-01`;
  const [year = "1970", month = "01"] = asOf.split("-");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const to = `${asOf.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

/** A null range means "all time". */
export function inRange(key: DateKey, range?: DateRange | null): boolean {
  if (!range) return true;
  if (key < range.from) return false;
  if (key > range.to) return false;
  return true;
}

export function rangeDays(range: DateRange): number {
  const from = new Date(`${range.from}T00:00:00`).getTime();
  const to = new Date(`${range.to}T00:00:00`).getTime();
  const diff = Math.round((to - from) / 86_400_000) + 1;
  return Math.max(1, diff);
}

/* ------------------------------ Documents ------------------------- */

export function lineNet(line: DocumentLine): number {
  const gross = line.quantity * line.unitPrice;
  const discount = gross * ((line.discountPercent ?? 0) / 100);
  return round2(gross - discount);
}

export function lineTax(line: DocumentLine): number {
  return round2(lineNet(line) * ((line.taxRate ?? 0) / 100));
}

export function lineTotalOf(line: DocumentLine): number {
  return round2(lineNet(line) + lineTax(line));
}

export function computeTotals(lines: readonly DocumentLine[]): DocumentTotals {
  let gross = 0;
  let discount = 0;
  let tax = 0;

  for (const line of lines) {
    const base = round2(line.quantity * line.unitPrice);
    const lineDiscount = round2(base * ((line.discountPercent ?? 0) / 100));
    gross += base;
    discount += lineDiscount;
    tax += lineTax(line);
  }

  const subtotal = round2(gross - discount);
  const taxTotal = round2(tax);

  return {
    subtotal,
    discountTotal: round2(discount),
    taxTotal,
    total: round2(subtotal + taxTotal),
  };
}

export function invoiceBalance(
  doc: Pick<SalesInvoice | SupplierBill, "total" | "paidAmount">,
): number {
  const balance = round2(doc.total - (doc.paidAmount ?? 0));
  return balance > 0 ? balance : 0;
}

/* ------------------------------- Revenue -------------------------- */

/** Draft, void and refunded invoices never count as revenue. */
const REVENUE_EXCLUDED_STATUSES = new Set(["draft", "void", "refunded"]);

export function isActiveSale(invoice: SalesInvoice): boolean {
  return !REVENUE_EXCLUDED_STATUSES.has(invoice.status);
}

/**
 * Live status of an invoice: paid and overdue are derived from the balance
 * and the due date, so the stored status never has to be swept by a job.
 * Void, refunded and draft invoices keep the status they were saved with.
 */
export function effectiveInvoiceStatus(
  invoice: Pick<SalesInvoice, "total" | "paidAmount" | "dueDate" | "status">,
  asOf: DateKey = todayKey(),
): InvoiceStatus {
  if (invoice.status === "void" || invoice.status === "refunded" || invoice.status === "draft") {
    return invoice.status;
  }
  const balance = invoiceBalance(invoice);
  if (balance <= 0) return "paid";
  if (invoice.paidAmount > 0) return asOf > invoice.dueDate ? "overdue" : "partial";
  return asOf > invoice.dueDate ? "overdue" : "issued";
}

export function calculateRevenue(
  invoices: readonly SalesInvoice[],
  range?: DateRange | null,
): number {
  return sum(invoices, (invoice) =>
    isActiveSale(invoice) && inRange(invoice.date, range) ? invoice.total : 0,
  );
}

export function calculateCollected(
  invoices: readonly SalesInvoice[],
  range?: DateRange | null,
): number {
  return sum(invoices, (invoice) =>
    isActiveSale(invoice) && inRange(invoice.date, range)
      ? invoice.paidAmount
      : 0,
  );
}

const RETURN_EXCLUDED_STATUSES = new Set(["pending", "rejected", "cancelled"]);

export function calculateReturns(
  returns: readonly CustomerReturn[],
  range?: DateRange | null,
): number {
  return sum(returns, (entry) =>
    RETURN_EXCLUDED_STATUSES.has(entry.status) || !inRange(entry.date, range)
      ? 0
      : entry.total,
  );
}

export function calculateNetRevenue(
  invoices: readonly SalesInvoice[],
  returns: readonly CustomerReturn[],
  range?: DateRange | null,
): number {
  return round2(
    calculateRevenue(invoices, range) - calculateReturns(returns, range),
  );
}

export function calculateCOGS(
  invoices: readonly SalesInvoice[],
  products: readonly Product[],
  range?: DateRange | null,
): number {
  const costById = new Map<string, number>();
  for (const product of products) costById.set(product.id, product.costPrice);

  let total = 0;
  for (const invoice of invoices) {
    if (!isActiveSale(invoice) || !inRange(invoice.date, range)) continue;
    for (const line of invoice.lines) {
      const cost = costById.get(line.productId) ?? 0;
      total += line.quantity * cost;
    }
  }
  return round2(total);
}

/* ------------------------------- Expenses ------------------------- */

const BILL_EXCLUDED_STATUSES = new Set(["draft", "void"]);

export function isActiveBill(bill: SupplierBill): boolean {
  return !BILL_EXCLUDED_STATUSES.has(bill.status);
}

/** Accrual expenses: supplier bills issued in range plus recorded expenses. */
export function calculateExpenses(
  bills: readonly SupplierBill[],
  expenses: readonly Expense[],
  range?: DateRange | null,
): number {
  const billTotal = sum(bills, (bill) =>
    isActiveBill(bill) && inRange(bill.date, range) ? bill.total : 0,
  );
  const expenseTotal = sum(expenses, (expense) =>
    expense.status === "recorded" && inRange(expense.date, range)
      ? expense.amount
      : 0,
  );
  return round2(billTotal + expenseTotal);
}

/** Cash out: money actually paid to suppliers plus expenses paid. */
export function calculateCashOut(
  bills: readonly SupplierBill[],
  expenses: readonly Expense[],
  range?: DateRange | null,
): number {
  const paidBills = sum(bills, (bill) =>
    isActiveBill(bill) && inRange(bill.date, range) ? bill.paidAmount : 0,
  );
  const paidExpenses = sum(expenses, (expense) =>
    expense.status === "recorded" && inRange(expense.date, range)
      ? expense.amount
      : 0,
  );
  return round2(paidBills + paidExpenses);
}

/* ---------------------------- Receivables ------------------------- */

export function calculateReceivables(
  invoices: readonly SalesInvoice[],
  range?: DateRange | null,
): number {
  return sum(invoices, (invoice) =>
    isActiveSale(invoice) && inRange(invoice.date, range)
      ? invoiceBalance(invoice)
      : 0,
  );
}

export function calculatePayables(
  bills: readonly SupplierBill[],
  range?: DateRange | null,
): number {
  return sum(bills, (bill) =>
    isActiveBill(bill) && inRange(bill.date, range) ? invoiceBalance(bill) : 0,
  );
}

/* ------------------------------ Profitability -------------------- */

export function calculateGrossProfit(revenue: number, cogs: number): number {
  return round2(revenue - cogs);
}

export function calculateNetProfit(revenue: number, expenses: number): number {
  return round2(revenue - expenses);
}

/** Zero revenue yields null (empty state), never NaN. */
export function profitMarginPercent(netProfit: number, revenue: number): number | null {
  return percentOf(netProfit, revenue);
}

export function grossMarginPercent(revenue: number, cogs: number): number | null {
  return percentOf(revenue - cogs, revenue);
}

/* -------------------------------- Stock --------------------------- */

export function stockAvailable(balance: Pick<StockBalance, "onHand" | "reserved">): number {
  return round2(balance.onHand - (balance.reserved ?? 0));
}

export function calculateStockValue(
  products: readonly Product[],
  balances: readonly StockBalance[],
): number {
  const costById = new Map<string, number>();
  for (const product of products) costById.set(product.id, product.costPrice);

  let total = 0;
  for (const balance of balances) {
    const cost = costById.get(balance.productId) ?? 0;
    total += balance.onHand * cost;
  }
  return round2(total);
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function stockStatus(
  product: Pick<Product, "reorderLevel" | "trackStock">,
  available: number,
): StockStatus {
  if (!product.trackStock) return "in_stock";
  if (available <= 0) return "out_of_stock";
  if (available <= product.reorderLevel) return "low_stock";
  return "in_stock";
}

export interface StockAlert {
  product: Product;
  available: number;
  status: StockStatus;
}

export function stockAlerts(
  products: readonly Product[],
  balances: readonly StockBalance[],
): StockAlert[] {
  const onHandByProduct = new Map<string, { onHand: number; reserved: number }>();
  for (const balance of balances) {
    const current = onHandByProduct.get(balance.productId) ?? {
      onHand: 0,
      reserved: 0,
    };
    current.onHand += balance.onHand;
    current.reserved += balance.reserved;
    onHandByProduct.set(balance.productId, current);
  }

  const alerts: StockAlert[] = [];
  for (const product of products) {
    if (product.status !== "active" || !product.trackStock) continue;
    const aggregate = onHandByProduct.get(product.id) ?? { onHand: 0, reserved: 0 };
    const available = stockAvailable(aggregate);
    const status = stockStatus(product, available);
    if (status !== "in_stock") {
      alerts.push({ product, available, status });
    }
  }

  return alerts.sort((a, b) => a.available - b.available);
}

/* -------------------------------- Aging --------------------------- */

export interface AgingInput {
  date: DateKey;
  dueDate: DateKey;
  balance: number;
}

export interface AgingSummary {
  buckets: Record<AgingBucket, number>;
  counts: Record<AgingBucket, number>;
  total: number;
  overdue: number;
}

export function agingBuckets(
  documents: readonly AgingInput[],
  asOf: DateKey = todayKey(),
): AgingSummary {
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 } as Record<
    AgingBucket,
    number
  >;
  const counts = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 } as Record<
    AgingBucket,
    number
  >;

  let total = 0;
  let overdue = 0;

  for (const doc of documents) {
    if (!Number.isFinite(doc.balance) || doc.balance <= 0) continue;
    const bucket = agingBucket(doc.dueDate || doc.date, asOf);
    buckets[bucket] = round2(buckets[bucket] + doc.balance);
    counts[bucket] += 1;
    total = round2(total + doc.balance);

    const duePassed = doc.dueDate
      ? doc.dueDate < asOf
      : doc.date < asOf;
    if (duePassed) overdue = round2(overdue + doc.balance);
  }

  return { buckets, counts, total, overdue };
}

export function agingBucketKeys(): AgingBucket[] {
  return [...AGING_BUCKETS];
}

/* ------------------------------ Aggregation ----------------------- */

export interface SeriesPoint {
  date: DateKey;
  value: number;
}

/** Daily series across a range, zeros included so charts stay continuous. */
export function seriesByDay(
  range: DateRange,
  pick: (day: DateKey) => number,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const cursor = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return out;

  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 800) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(cursor.getDate()).padStart(2, "0")}`;
    out.push({ date: key, value: round2(pick(key)) });
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }

  return out;
}

export function revenueSeries(
  invoices: readonly SalesInvoice[],
  range: DateRange,
): SeriesPoint[] {
  const active = invoices.filter(
    (invoice) => isActiveSale(invoice) && inRange(invoice.date, range),
  );
  const byDay = new Map<DateKey, number>();
  for (const invoice of active) {
    byDay.set(invoice.date, round2((byDay.get(invoice.date) ?? 0) + invoice.total));
  }
  return seriesByDay(range, (day) => byDay.get(day) ?? 0);
}

export function countByStatus<T extends { status: string }>(
  items: readonly T[],
  status: string,
): number {
  return items.reduce((total, item) => (item.status === status ? total + 1 : total), 0);
}

export function topBy<T>(
  items: readonly T[],
  pickValue: (item: T) => number,
  limit = 5,
): T[] {
  return [...items]
    .sort((a, b) => pickValue(b) - pickValue(a))
    .slice(0, Math.max(1, limit));
}

/* ------------------------------ Accounting ------------------------ */

export function journalTotals(lines: readonly JournalLine[]): {
  debit: number;
  credit: number;
} {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    debit += Number.isFinite(line.debit) ? line.debit : 0;
    credit += Number.isFinite(line.credit) ? line.credit : 0;
  }
  return { debit: round2(debit), credit: round2(credit) };
}

export function isJournalBalanced(lines: readonly JournalLine[]): boolean {
  const { debit, credit } = journalTotals(lines);
  return debit > 0 && round2(debit - credit) === 0;
}

/* ------------------------- Ledger and statements ------------------ */

export interface AccountTotals {
  debit: number;
  credit: number;
}

export interface LedgerRange {
  from?: DateKey | null;
  to?: DateKey | null;
}

/**
 * Posted entries only. Draft and reversed entries never reach the books.
 * Omit the range to sum everything since inception.
 */
export function journalAccountTotals(
  entries: readonly JournalEntry[],
  range?: LedgerRange | null,
): Map<string, AccountTotals> {
  const out = new Map<string, AccountTotals>();
  for (const entry of entries) {
    if (entry.status !== "posted") continue;
    if (range?.from && entry.date < range.from) continue;
    if (range?.to && entry.date > range.to) continue;
    for (const line of entry.lines) {
      const current = out.get(line.accountId) ?? { debit: 0, credit: 0 };
      current.debit = round2(current.debit + (line.debit || 0));
      current.credit = round2(current.credit + (line.credit || 0));
      out.set(line.accountId, current);
    }
  }
  return out;
}

export function isDebitAccount(type: AccountType): boolean {
  return type === "asset" || type === "expense";
}

/** Signed balance in the account's natural direction. */
export function naturalBalance(type: AccountType, totals?: AccountTotals): number {
  if (!totals) return 0;
  const net = round2(totals.debit - totals.credit);
  return isDebitAccount(type) ? net : round2(-net);
}

export interface StatementRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  /** Natural signed balance. */
  amount: number;
}

function toRows(
  accounts: readonly Account[],
  totals: Map<string, AccountTotals>,
  types: readonly AccountType[],
): StatementRow[] {
  const wanted = new Set<AccountType>(types);
  return accounts
    .filter((account) => wanted.has(account.type))
    .map((account) => ({
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      amount: naturalBalance(account.type, totals.get(account.id)),
    }))
    .filter((row) => row.amount !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface TrialBalanceResult {
  rows: Array<StatementRow & { debit: number; credit: number }>;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

/** Every account squeezed into a single debit or credit column. */
export function trialBalance(
  accounts: readonly Account[],
  totals: Map<string, AccountTotals>,
): TrialBalanceResult {
  const rows = accounts
    .map((account) => {
      const balance = naturalBalance(account.type, totals.get(account.id));
      const debitNature = isDebitAccount(account.type);
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        amount: balance,
        debit: balance === 0 ? 0 : debitNature ? Math.max(balance, 0) : Math.max(-balance, 0),
        credit: balance === 0 ? 0 : debitNature ? Math.max(-balance, 0) : Math.max(balance, 0),
      };
    })
    .filter((row) => row.debit !== 0 || row.credit !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDebit = round2(sum(rows, (row) => row.debit));
  const totalCredit = round2(sum(rows, (row) => row.credit));
  return { rows, totalDebit, totalCredit, balanced: round2(totalDebit - totalCredit) === 0 };
}

export interface IncomeStatementResult {
  revenueRows: StatementRow[];
  expenseRows: StatementRow[];
  revenue: number;
  expenses: number;
  netProfit: number;
}

export function incomeStatement(
  accounts: readonly Account[],
  totals: Map<string, AccountTotals>,
): IncomeStatementResult {
  const revenueRows = toRows(accounts, totals, ["revenue"]);
  const expenseRows = toRows(accounts, totals, ["expense"]);
  const revenue = round2(sum(revenueRows, (row) => row.amount));
  const expenses = round2(sum(expenseRows, (row) => row.amount));
  return { revenueRows, expenseRows, revenue, expenses, netProfit: round2(revenue - expenses) };
}

export interface BalanceSheetResult {
  assetRows: StatementRow[];
  liabilityRows: StatementRow[];
  equityRows: StatementRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  /** Net profit parked in equity so the sheet balances. */
  retainedEarnings: number;
  balanced: boolean;
}

export function balanceSheet(
  accounts: readonly Account[],
  totals: Map<string, AccountTotals>,
  retainedEarnings: number,
): BalanceSheetResult {
  const assetRows = toRows(accounts, totals, ["asset"]);
  const liabilityRows = toRows(accounts, totals, ["liability"]);
  const equityRows = toRows(accounts, totals, ["equity"]);
  const totalAssets = round2(sum(assetRows, (row) => row.amount));
  const totalLiabilities = round2(sum(liabilityRows, (row) => row.amount));
  const totalEquity = round2(sum(equityRows, (row) => row.amount) + retainedEarnings);
  return {
    assetRows,
    liabilityRows,
    equityRows,
    totalAssets,
    totalLiabilities,
    totalEquity,
    retainedEarnings: round2(retainedEarnings),
    balanced: round2(totalAssets - (totalLiabilities + totalEquity)) === 0,
  };
}
