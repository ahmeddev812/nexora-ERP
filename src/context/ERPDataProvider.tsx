"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { writeAuditLog, type AuditInput } from "@/lib/audit";
import { isJournalBalanced, journalTotals, round2 } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import { generateId, nextDocNumber } from "@/lib/id";
import { buildDemoData, DEMO_ACTOR_ID, DEMO_ACTOR_NAME, DEMO_SEED_DAYS } from "@/lib/seed";
import {
  getCollection,
  getJSON,
  readRaw,
  remove,
  setJSON,
  StorageKeys,
} from "@/lib/storage";
import type {
  AuditAction,
  AuditLog,
  DocumentSequence,
  ERPDataState,
  JournalEntry,
  StockBalance,
  StockMovement,
  StockMovementType,
} from "@/types/erp";

import { useAuthContext } from "./AuthContext";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CollectionKey = {
  [K in keyof ERPDataState]: ERPDataState[K] extends unknown[] ? K : never;
}[keyof ERPDataState];

export type ERPItem<K extends CollectionKey> = ERPDataState[K][number];

export type SingletonKey = "business" | "settings";

export interface MutationOptions {
  summary?: string;
  action?: AuditAction;
  entity?: string;
  number?: string;
}

export interface StockMovementInput {
  productId: string;
  warehouseId: string;
  /** Signed. Positive grows on-hand, negative shrinks it. */
  quantity: number;
  type: StockMovementType;
  refType: string;
  refId: string;
  refNumber?: string;
  bucket?: "onHand" | "reserved";
  unitCost?: number;
  date?: string;
  notes?: string;
}

export interface JournalPostLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  partyType?: "customer" | "supplier" | "employee" | null;
  partyId?: string | null;
}

export interface JournalPostInput {
  date: string;
  memo: string;
  refType: string;
  refId?: string | null;
  refNumber?: string;
  lines: JournalPostLine[];
}

export interface ERPActions {
  createRecord: <K extends CollectionKey>(
    key: K,
    record: ERPItem<K>,
    options?: MutationOptions,
  ) => ERPItem<K>;
  updateRecord: <K extends CollectionKey>(
    key: K,
    id: string,
    patch: Partial<ERPItem<K>>,
    options?: MutationOptions,
  ) => ERPItem<K> | null;
  deleteRecord: <K extends CollectionKey>(
    key: K,
    id: string,
    options?: MutationOptions,
  ) => boolean;
  bulkDelete: <K extends CollectionKey>(
    key: K,
    ids: string[],
    options?: MutationOptions,
  ) => number;
  setSingleton: <K extends SingletonKey>(
    key: K,
    value: ERPDataState[K],
    options?: MutationOptions,
  ) => void;
  replaceState: (
    next: ERPDataState,
    options?: { summary?: string; action?: AuditAction },
  ) => void;
  resetWorkspace: (reason?: string) => void;
  nextNumber: (prefix: string, padding?: number) => string;
  applyStockMovement: (input: StockMovementInput) => StockMovement | null;
  postJournal: (input: JournalPostInput) => JournalEntry | null;
  writeLog: (input: Omit<AuditInput, "actorId" | "actorName">) => void;
  reload: () => void;
}

export type DataContextValue = ERPDataState & { hydrated: boolean };

const DataContext = createContext<DataContextValue | null>(null);
const ActionsContext = createContext<ERPActions | null>(null);

/* ------------------------------------------------------------------ */
/* Storage mapping                                                     */
/* ------------------------------------------------------------------ */

const COLLECTION_STORAGE: Record<CollectionKey, string> = {
  branches: StorageKeys.branches,
  warehouses: StorageKeys.warehouses,
  customers: StorageKeys.customers,
  suppliers: StorageKeys.suppliers,
  categories: StorageKeys.categories,
  units: StorageKeys.units,
  products: StorageKeys.products,
  stockBalances: StorageKeys.stockBalances,
  stockMovements: StorageKeys.stockMovements,
  stockTransfers: StorageKeys.stockTransfers,
  stockReservations: StorageKeys.stockReservations,
  stockAdjustments: StorageKeys.stockAdjustments,
  quotations: StorageKeys.quotations,
  salesOrders: StorageKeys.salesOrders,
  deliveries: StorageKeys.deliveries,
  salesInvoices: StorageKeys.salesInvoices,
  customerReturns: StorageKeys.customerReturns,
  purchaseRequests: StorageKeys.purchaseRequests,
  purchaseOrders: StorageKeys.purchaseOrders,
  goodsReceipts: StorageKeys.goodsReceipts,
  supplierBills: StorageKeys.supplierBills,
  purchaseReturns: StorageKeys.purchaseReturns,
  accounts: StorageKeys.accounts,
  journalEntries: StorageKeys.journalEntries,
  journalLines: StorageKeys.journalLines,
  payments: StorageKeys.payments,
  paymentAllocations: StorageKeys.paymentAllocations,
  fiscalPeriods: StorageKeys.fiscalPeriods,
  expenses: StorageKeys.expenses,
  departments: StorageKeys.departments,
  employees: StorageKeys.employees,
  attendance: StorageKeys.attendance,
  leaveRequests: StorageKeys.leaveRequests,
  payrollRuns: StorageKeys.payrollRuns,
  approvals: StorageKeys.approvals,
  auditLog: StorageKeys.auditLog,
  documentSequences: StorageKeys.documentSequences,
};

export const EMPTY_ERP_DATA: ERPDataState = {
  business: null,
  settings: null,
  branches: [],
  warehouses: [],
  customers: [],
  suppliers: [],
  categories: [],
  units: [],
  products: [],
  stockBalances: [],
  stockMovements: [],
  stockTransfers: [],
  stockReservations: [],
  stockAdjustments: [],
  quotations: [],
  salesOrders: [],
  deliveries: [],
  salesInvoices: [],
  customerReturns: [],
  purchaseRequests: [],
  purchaseOrders: [],
  goodsReceipts: [],
  supplierBills: [],
  purchaseReturns: [],
  accounts: [],
  journalEntries: [],
  journalLines: [],
  payments: [],
  paymentAllocations: [],
  fiscalPeriods: [],
  expenses: [],
  departments: [],
  employees: [],
  attendance: [],
  leaveRequests: [],
  payrollRuns: [],
  approvals: [],
  auditLog: [],
  documentSequences: [],
};

function loadState(): ERPDataState {
  return {
    business: getJSON<ERPDataState["business"]>(StorageKeys.business),
    settings: getJSON<ERPDataState["settings"]>(StorageKeys.settings),
    branches: getCollection(StorageKeys.branches),
    warehouses: getCollection(StorageKeys.warehouses),
    customers: getCollection(StorageKeys.customers),
    suppliers: getCollection(StorageKeys.suppliers),
    categories: getCollection(StorageKeys.categories),
    units: getCollection(StorageKeys.units),
    products: getCollection(StorageKeys.products),
    stockBalances: getCollection(StorageKeys.stockBalances),
    stockMovements: getCollection(StorageKeys.stockMovements),
    stockTransfers: getCollection(StorageKeys.stockTransfers),
    stockReservations: getCollection(StorageKeys.stockReservations),
    stockAdjustments: getCollection(StorageKeys.stockAdjustments),
    quotations: getCollection(StorageKeys.quotations),
    salesOrders: getCollection(StorageKeys.salesOrders),
    deliveries: getCollection(StorageKeys.deliveries),
    salesInvoices: getCollection(StorageKeys.salesInvoices),
    customerReturns: getCollection(StorageKeys.customerReturns),
    purchaseRequests: getCollection(StorageKeys.purchaseRequests),
    purchaseOrders: getCollection(StorageKeys.purchaseOrders),
    goodsReceipts: getCollection(StorageKeys.goodsReceipts),
    supplierBills: getCollection(StorageKeys.supplierBills),
    purchaseReturns: getCollection(StorageKeys.purchaseReturns),
    accounts: getCollection(StorageKeys.accounts),
    journalEntries: getCollection(StorageKeys.journalEntries),
    journalLines: getCollection(StorageKeys.journalLines),
    payments: getCollection(StorageKeys.payments),
    paymentAllocations: getCollection(StorageKeys.paymentAllocations),
    fiscalPeriods: getCollection(StorageKeys.fiscalPeriods),
    expenses: getCollection(StorageKeys.expenses),
    departments: getCollection(StorageKeys.departments),
    employees: getCollection(StorageKeys.employees),
    attendance: getCollection(StorageKeys.attendance),
    leaveRequests: getCollection(StorageKeys.leaveRequests),
    payrollRuns: getCollection(StorageKeys.payrollRuns),
    approvals: getCollection(StorageKeys.approvals),
    auditLog: getCollection(StorageKeys.auditLog),
    documentSequences: getCollection(StorageKeys.documentSequences),
  };
}

function persistKey(key: keyof ERPDataState, value: unknown): void {
  if (key === "business") {
    setJSON(StorageKeys.business, value);
    return;
  }
  if (key === "settings") {
    setJSON(StorageKeys.settings, value);
    return;
  }
  const storageKey = COLLECTION_STORAGE[key as CollectionKey];
  if (storageKey) setJSON(storageKey, value);
}

/* ------------------------------------------------------------------ */
/* Small record helpers                                                */
/* ------------------------------------------------------------------ */

const ACTION_VERB: Record<AuditAction, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  approve: "Approved",
  reject: "Rejected",
  post: "Posted",
  reverse: "Reversed",
  login: "Signed in",
  logout: "Signed out",
  import: "Imported",
  export: "Exported",
  reset: "Reset",
};

function labelOf(record: Record<string, unknown>): string {
  if (typeof record.number === "string" && record.number) return record.number;
  if (typeof record.sku === "string" && record.sku) return record.sku;
  if (typeof record.code === "string" && record.code) return record.code;
  if (typeof record.name === "string" && record.name) return record.name;
  if (typeof record.email === "string" && record.email) return record.email;
  return String(record.id ?? "record");
}

function slim(record: unknown): Record<string, unknown> | null {
  if (!record || typeof record !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return out;
}

function pickKeys(
  record: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (!record || typeof record !== "object") return null;
  const source = record as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = source[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return out;
}

function defaultSummary(action: AuditAction, record: Record<string, unknown>): string {
  const verb = ACTION_VERB[action] ?? "Changed";
  return `${verb} ${labelOf(record)}`;
}

/**
 * Guarantees a workspace always has a profile, settings, one branch and one
 * warehouse so every module has somewhere to post.
 */
function ensureBaseline(
  input: ERPDataState,
): { state: ERPDataState; changed: boolean } {
  let next = input;
  let changed = false;

  if (!next.business) {
    next = {
      ...next,
      business: {
        id: generateId("biz"),
        name: "My Company",
        industry: "other",
        currency: "USD",
        timezone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "UTC",
        fiscalYearStart: `${new Date().getFullYear()}-01-01`,
        defaultTaxRate: 0,
        primaryMetric: "revenue",
        revenueTarget: 0,
        expenseTarget: 0,
        onboardingDone: false,
        createdAt: new Date().toISOString(),
      },
    };
    changed = true;
  }

  if (next.branches.length === 0) {
    next = {
      ...next,
      branches: [
        {
          id: generateId("brn"),
          code: "MAIN",
          name: "Main Branch",
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    changed = true;
  }

  if (next.warehouses.length === 0) {
    next = {
      ...next,
      warehouses: [
        {
          id: generateId("whs"),
          code: "MAIN",
          name: "Main Warehouse",
          branchId: next.branches[0]?.id ?? null,
          isDefault: true,
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    changed = true;
  }

  if (!next.settings) {
    next = {
      ...next,
      settings: {
        id: generateId("set"),
        theme: "system",
        currencyDecimals: 2,
        dateFormat: "iso",
        defaultBranchId: next.branches[0]?.id ?? null,
        defaultWarehouseId: next.warehouses[0]?.id ?? null,
        defaultPaymentTerms: 30,
        lowStockThreshold: 5,
        reduceMotion: false,
      },
    };
    changed = true;
  } else {
    const needsBranch = !next.settings.defaultBranchId && next.branches[0];
    const needsWarehouse = !next.settings.defaultWarehouseId && next.warehouses[0];
    if (needsBranch || needsWarehouse) {
      next = {
        ...next,
        settings: {
          ...next.settings,
          defaultBranchId:
            next.settings.defaultBranchId ?? next.branches[0]?.id ?? null,
          defaultWarehouseId:
            next.settings.defaultWarehouseId ?? next.warehouses[0]?.id ?? null,
        },
      };
      changed = true;
    }
  }

  return { state: next, changed };
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function ERPDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();

  const [state, setState] = useState<ERPDataState>(EMPTY_ERP_DATA);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef<ERPDataState>(EMPTY_ERP_DATA);
  const actorRef = useRef<{ id: string; name: string }>({
    id: "system",
    name: "system",
  });

  useEffect(() => {
    actorRef.current = user
      ? { id: user.id, name: user.name }
      : { id: "system", name: "system" };
  }, [user]);

  const commit = (next: ERPDataState, changed: Array<keyof ERPDataState>) => {
    stateRef.current = next;
    setState(next);
    for (const key of changed) persistKey(key, next[key]);
  };

  const writeLog = (
    input: Omit<AuditInput, "actorId" | "actorName"> & {
      actorId?: string;
      actorName?: string;
    },
  ): AuditLog => {
    const entry = writeAuditLog({
      actorId: input.actorId ?? actorRef.current.id,
      actorName: input.actorName ?? actorRef.current.name,
      ...input,
    });
    const prev = stateRef.current;
    commit({ ...prev, auditLog: [...prev.auditLog, entry] }, ["auditLog"]);
    return entry;
  };

  /* ----------------------------- hydration -------------------------- */

  useEffect(() => {
    queueMicrotask(() => {
      const loaded = ensureBaseline(loadState());
      stateRef.current = loaded.state;
      setState(loaded.state);
      setHydrated(true);

      if (loaded.changed) {
        writeAuditLog({
          actorId: "system",
          actorName: "system",
          action: "create",
          entity: "workspace",
          summary: "Initialized workspace defaults",
        });
      }
    });
  }, []);

  const reload = () => {
    const loaded = ensureBaseline(loadState());
    stateRef.current = loaded.state;
    setState(loaded.state);
    setHydrated(true);
  };

  /* --------------------------- demo seeding ------------------------ */

  useEffect(() => {
    if (!hydrated) return;
    // localStorage is external: read and write it inside a microtask so the
    // effect body never renders synchronously.
    queueMicrotask(() => {
      if (readRaw(StorageKeys.seedRequest) === null) return;
      remove(StorageKeys.seedRequest);

      const seeded = ensureBaseline(buildDemoData());
      const changed = Object.keys(EMPTY_ERP_DATA) as Array<keyof ERPDataState>;
      for (const key of changed) persistKey(key, seeded.state[key]);

      const entry = writeAuditLog({
        actorId: user?.id ?? DEMO_ACTOR_ID,
        actorName: user?.name ?? DEMO_ACTOR_NAME,
        action: "import",
        entity: "workspace",
        summary: `Loaded ${DEMO_SEED_DAYS} day demo dataset`,
      });

      const next: ERPDataState = { ...seeded.state, auditLog: [...seeded.state.auditLog, entry] };
      setJSON(StorageKeys.auditLog, next.auditLog);
      stateRef.current = next;
      setState(next);
    });
  }, [hydrated, user]);

  /* -------------------------- generic CRUD -------------------------- */

  const createRecord = <K extends CollectionKey>(
    key: K,
    input: ERPItem<K>,
    options?: MutationOptions,
  ): ERPItem<K> => {
    const prev = stateRef.current;
    const now = new Date().toISOString();
    const draft = { ...(input as unknown as Record<string, unknown>) };

    if (!draft.id) draft.id = generateId(key);
    if (draft.createdAt === undefined || draft.createdAt === "") {
      draft.createdAt = now;
    }
    draft.updatedAt = now;

    const collection = prev[key] as unknown as Array<Record<string, unknown>>;
    const next = {
      ...prev,
      [key]: [...collection, draft],
    } as unknown as ERPDataState;

    commit(next, [key]);

    writeLog({
      action: options?.action ?? "create",
      entity: options?.entity ?? key,
      entityId: String(draft.id),
      entityNumber: typeof draft.number === "string" ? draft.number : undefined,
      summary: options?.summary ?? defaultSummary("create", draft),
      after: slim(draft),
    });

    return draft as unknown as ERPItem<K>;
  };

  const updateRecord = <K extends CollectionKey>(
    key: K,
    id: string,
    patch: Partial<ERPItem<K>>,
    options?: MutationOptions,
  ): ERPItem<K> | null => {
    const prev = stateRef.current;
    const collection = prev[key] as unknown as Array<Record<string, unknown>>;
    const index = collection.findIndex((entry) => entry.id === id);
    if (index === -1) return null;

    const current = collection[index];
    if (!current) return null;

    const patchRecord = patch as unknown as Record<string, unknown>;
    const before = pickKeys(current, Object.keys(patchRecord));
    const updated: Record<string, unknown> = {
      ...current,
      ...patchRecord,
      updatedAt: new Date().toISOString(),
    };

    const nextCollection = [...collection];
    nextCollection[index] = updated;

    const next = {
      ...prev,
      [key]: nextCollection,
    } as unknown as ERPDataState;

    commit(next, [key]);

    writeLog({
      action: options?.action ?? "update",
      entity: options?.entity ?? key,
      entityId: id,
      entityNumber:
        options?.number ??
        (typeof updated.number === "string" ? updated.number : undefined),
      summary: options?.summary ?? defaultSummary("update", updated),
      before,
      after: pickKeys(updated, Object.keys(patchRecord)),
    });

    return updated as unknown as ERPItem<K>;
  };

  const deleteRecord = <K extends CollectionKey>(
    key: K,
    id: string,
    options?: MutationOptions,
  ): boolean => {
    const prev = stateRef.current;
    const collection = prev[key] as unknown as Array<Record<string, unknown>>;
    const target = collection.find((entry) => entry.id === id);
    if (!target) return false;

    const next = {
      ...prev,
      [key]: collection.filter((entry) => entry.id !== id),
    } as unknown as ERPDataState;

    commit(next, [key]);

    writeLog({
      action: options?.action ?? "delete",
      entity: options?.entity ?? key,
      entityId: id,
      entityNumber:
        options?.number ??
        (typeof target.number === "string" ? target.number : undefined),
      summary: options?.summary ?? defaultSummary("delete", target),
      before: slim(target),
    });

    return true;
  };

  const bulkDelete = <K extends CollectionKey>(
    key: K,
    ids: string[],
    options?: MutationOptions,
  ): number => {
    if (ids.length === 0) return 0;
    const prev = stateRef.current;
    const collection = prev[key] as unknown as Array<Record<string, unknown>>;
    const idSet = new Set(ids);
    const remaining = collection.filter((entry) => !idSet.has(String(entry.id)));
    const removed = collection.length - remaining.length;
    if (removed === 0) return 0;

    const next = { ...prev, [key]: remaining } as unknown as ERPDataState;
    commit(next, [key]);

    writeLog({
      action: "delete",
      entity: options?.entity ?? key,
      summary:
        options?.summary ??
        `Deleted ${removed} ${humanizeKey(String(key))} record${
          removed === 1 ? "" : "s"
        }`,
      before: { count: removed },
    });

    return removed;
  };

  const setSingleton = <K extends SingletonKey>(
    key: K,
    value: ERPDataState[K],
    options?: MutationOptions,
  ): void => {
    const prev = stateRef.current;
    const current = prev[key];
    const next = { ...prev, [key]: value } as ERPDataState;

    commit(next, [key]);

    writeLog({
      action: options?.action ?? "update",
      entity: options?.entity ?? key,
      entityId:
        current && typeof current === "object" && "id" in current
          ? String((current as { id: unknown }).id)
          : null,
      summary:
        options?.summary ??
        (key === "business"
          ? "Updated business profile"
          : "Updated workspace settings"),
      before: slim(current),
      after: slim(value),
    });
  };

  const replaceState = (
    next: ERPDataState,
    options?: { summary?: string; action?: AuditAction },
  ): void => {
    const baseline = ensureBaseline(next);
    commit(baseline.state, Object.keys(EMPTY_ERP_DATA) as Array<keyof ERPDataState>);
    writeLog({
      action: options?.action ?? "import",
      entity: "workspace",
      summary: options?.summary ?? "Replaced workspace data",
    });
  };

  const resetWorkspace = (reason?: string): void => {
    const cleared: ERPDataState = { ...EMPTY_ERP_DATA, auditLog: [] };
    commit(cleared, Object.keys(EMPTY_ERP_DATA) as Array<keyof ERPDataState>);
    const entry = writeAuditLog({
      actorId: actorRef.current.id,
      actorName: actorRef.current.name,
      action: "reset",
      entity: "workspace",
      summary: reason ?? "Reset workspace data",
    });
    stateRef.current = { ...cleared, auditLog: [entry] };
    setState(stateRef.current);
  };

  /* --------------------------- doc numbers -------------------------- */

  const nextNumber = (prefix: string, padding = 4): string => {
    const prev = stateRef.current;
    const existing = prev.documentSequences.find(
      (entry: DocumentSequence) => entry.prefix === prefix,
    );
    const current = existing?.next ?? 1;
    const number = nextDocNumber(prefix, { next: current, padding });

    const sequence: DocumentSequence = {
      id: existing?.id ?? generateId("seq"),
      prefix,
      next: current + 1,
      padding,
    };

    const sequences = existing
      ? prev.documentSequences.map((entry) =>
          entry.prefix === prefix ? sequence : entry,
        )
      : [...prev.documentSequences, sequence];

    commit({ ...prev, documentSequences: sequences }, ["documentSequences"]);
    return number;
  };

  /* ------------------------------ stock ----------------------------- */

  const applyStockMovement = (input: StockMovementInput): StockMovement | null => {
    const prev = stateRef.current;
    const bucket = input.bucket ?? "onHand";
    const quantity = round2(input.quantity);
    const now = new Date().toISOString();

    const product = prev.products.find((entry) => entry.id === input.productId);
    if (!product) return null;

    const existingIndex = prev.stockBalances.findIndex(
      (entry) =>
        entry.productId === input.productId &&
        entry.warehouseId === input.warehouseId,
    );
    const existing = existingIndex >= 0 ? prev.stockBalances[existingIndex] : null;

    const base: StockBalance = existing ?? {
      id: generateId("sbl"),
      productId: input.productId,
      warehouseId: input.warehouseId,
      onHand: 0,
      reserved: 0,
      createdAt: now,
    };

    const nextBalance: StockBalance = {
      ...base,
      onHand: bucket === "onHand" ? round2(base.onHand + quantity) : base.onHand,
      reserved: bucket === "reserved" ? round2(base.reserved + quantity) : base.reserved,
      updatedAt: now,
    };

    const balanceAfter = bucket === "onHand" ? nextBalance.onHand : nextBalance.reserved;

    const movement: StockMovement = {
      id: generateId("mov"),
      date: input.date ?? todayKey(),
      productId: input.productId,
      warehouseId: input.warehouseId,
      type: input.type,
      quantity,
      balanceAfter,
      unitCost: round2(input.unitCost ?? product.costPrice),
      refType: input.refType,
      refId: input.refId,
      refNumber: input.refNumber,
      notes: input.notes,
      userId: actorRef.current.id,
      createdAt: now,
    };

    const balances =
      existingIndex >= 0
        ? prev.stockBalances.map((entry, index) =>
            index === existingIndex ? nextBalance : entry,
          )
        : [...prev.stockBalances, nextBalance];

    commit(
      {
        ...prev,
        stockBalances: balances,
        stockMovements: [...prev.stockMovements, movement],
      },
      ["stockBalances", "stockMovements"],
    );

    writeLog({
      action: "create",
      entity: "stock_movement",
      entityId: movement.id,
      entityNumber: input.refNumber,
      summary: `${humanizeMovementType(input.type)} ${Math.abs(quantity)} × ${
        product.sku
      }${input.refNumber ? ` for ${input.refNumber}` : ""}`,
      after: {
        productId: product.sku,
        warehouseId: input.warehouseId,
        quantity,
        balanceAfter,
        type: input.type,
      },
    });

    return movement;
  };

  /* ----------------------------- journal ---------------------------- */

  const postJournal = (input: JournalPostInput): JournalEntry | null => {
    if (input.lines.length < 2) return null;

    const prev = stateRef.current;
    const entryId = generateId("jrn");
    const now = new Date().toISOString();

    const lines = input.lines.map((line) => ({
      id: generateId("jln"),
      entryId,
      accountId: line.accountId,
      debit: round2(line.debit),
      credit: round2(line.credit),
      memo: line.memo,
      partyType: line.partyType ?? null,
      partyId: line.partyId ?? null,
    }));

    if (!isJournalBalanced(lines)) return null;

    const totals = journalTotals(lines);
    const number = nextNumber("JE");

    const entry: JournalEntry = {
      id: entryId,
      number,
      date: input.date,
      memo: input.memo,
      refType: input.refType,
      refId: input.refId ?? null,
      refNumber: input.refNumber,
      status: "posted",
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      lines,
      postedAt: now,
      createdAt: now,
      createdBy: actorRef.current.id,
    };

    commit(
      {
        ...prev,
        journalEntries: [...prev.journalEntries, entry],
        journalLines: [...prev.journalLines, ...lines],
      },
      ["journalEntries", "journalLines"],
    );

    writeLog({
      action: "post",
      entity: "journal_entry",
      entityId: entry.id,
      entityNumber: number,
      summary: `Posted journal ${number}: ${input.memo}`,
      after: { totalDebit: totals.debit, totalCredit: totals.credit, date: input.date },
    });

    return entry;
  };

  const actions = useMemo<ERPActions>(
    () => ({
      createRecord,
      updateRecord,
      deleteRecord,
      bulkDelete,
      setSingleton,
      replaceState,
      resetWorkspace,
      nextNumber,
      applyStockMovement,
      postJournal,
      writeLog,
      reload,
    }),
    // Functions close over stable refs only, so a single memoized instance is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const dataValue = useMemo<DataContextValue>(
    () => ({ ...state, hydrated }),
    [state, hydrated],
  );

  return (
    <DataContext.Provider value={dataValue}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </DataContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Context readers                                                     */
/* ------------------------------------------------------------------ */

export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used inside <ERPDataProvider>");
  }
  return context;
}

export function useActionsContext(): ERPActions {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error("useActionsContext must be used inside <ERPDataProvider>");
  }
  return context;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
}

function humanizeMovementType(type: StockMovementType): string {
  const labels: Record<StockMovementType, string> = {
    opening: "Opened stock for",
    receipt: "Received",
    delivery: "Delivered",
    sale: "Sold",
    return_in: "Returned in",
    return_out: "Returned out",
    transfer_in: "Transferred in",
    transfer_out: "Transferred out",
    adjustment: "Adjusted",
    reservation: "Reserved",
    reservation_release: "Released reservation for",
  };
  return labels[type] ?? "Moved";
}
