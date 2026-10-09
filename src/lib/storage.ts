/**
 * NEXORA storage adapter.
 *
 * Every persisted value in the app flows through this module.
 * Rules:
 *  - Keys are ALWAYS prefixed with `nexora_`.
 *  - Reads never run during SSR (guarded by `typeof window`).
 *  - Corrupt JSON returns `null` instead of throwing.
 *  - Everything is wrapped in try/catch (private mode, quota, disabled storage).
 */

export const STORAGE_PREFIX = "nexora_";

export const StorageKeys = {
  users: "nexora_users",
  currentUser: "nexora_current_user",
  business: "nexora_business",
  settings: "nexora_settings",
  permissions: "nexora_permissions",

  customers: "nexora_customers",
  suppliers: "nexora_suppliers",
  products: "nexora_products",
  categories: "nexora_categories",
  units: "nexora_units",
  warehouses: "nexora_warehouses",
  branches: "nexora_branches",

  quotations: "nexora_quotations",
  salesOrders: "nexora_sales_orders",
  deliveries: "nexora_deliveries",
  salesInvoices: "nexora_sales_invoices",
  customerReturns: "nexora_customer_returns",

  purchaseRequests: "nexora_purchase_requests",
  purchaseOrders: "nexora_purchase_orders",
  goodsReceipts: "nexora_goods_receipts",
  supplierBills: "nexora_supplier_bills",
  purchaseReturns: "nexora_purchase_returns",

  stockBalances: "nexora_stock_balances",
  stockMovements: "nexora_stock_movements",
  stockTransfers: "nexora_stock_transfers",
  stockReservations: "nexora_stock_reservations",
  stockAdjustments: "nexora_stock_adjustments",

  accounts: "nexora_accounts",
  journalEntries: "nexora_journal_entries",
  journalLines: "nexora_journal_lines",
  payments: "nexora_payments",
  paymentAllocations: "nexora_payment_allocations",
  fiscalPeriods: "nexora_fiscal_periods",
  expenses: "nexora_expenses",

  employees: "nexora_employees",
  departments: "nexora_departments",
  attendance: "nexora_attendance",
  leaveRequests: "nexora_leave_requests",
  payrollRuns: "nexora_payroll_runs",

  approvals: "nexora_approvals",
  auditLog: "nexora_audit_log",
  documentSequences: "nexora_document_sequences",
  /** Pending demo dataset request. Set at demo login, cleared once applied. */
  seedRequest: "nexora_seed_request",
  /** UI preferences (sidebar collapse, density). Still `nexora_` scoped. */
  ui: "nexora_ui",
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function storageAvailable(): boolean {
  if (!hasWindow()) return false;
  try {
    const probe = `${STORAGE_PREFIX}__probe__`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Raw string read. SSR-safe. Returns null when unavailable. */
export function readRaw(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Parsed JSON read.
 * Returns `null` when the key is missing, storage is unavailable,
 * or the stored value is corrupt.
 */
export function getJSON<T>(key: string): T | null {
  const raw = readRaw(key);
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Array read that always yields an array (never null) for list keys. */
export function getCollection<T>(key: string): T[] {
  const value = getJSON<T[]>(key);
  return Array.isArray(value) ? value : [];
}

export function setJSON(key: string, value: unknown): boolean {
  if (!hasWindow()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable, nothing to remove */
  }
}

export function listNexoraKeys(): string[] {
  if (!hasWindow()) return [];
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    return keys.sort();
  } catch {
    return [];
  }
}

/** Clears ONLY `nexora_*` keys. Never touches unrelated site data. */
export function resetNexoraData(): void {
  if (!hasWindow()) return;
  try {
    for (const key of listNexoraKeys()) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable */
  }
}

/** Guard used before rendering persisted data. */
export const isClient = (): boolean => hasWindow();
