/**
 * NEXORA demo seed.
 *
 * Builds a 90 day, internally consistent dataset for the demo workspace:
 * master data, sales and purchasing chains, stock ledger, double entry
 * journals, payments, HR records and an audit trail.
 *
 * Invariants kept by construction:
 *  - every journal balances (totalDebit === totalCredit)
 *  - stock balances equal the sum of their movements
 *  - document cross references use real generated ids
 *  - refunded and void invoices never count as revenue downstream
 */

import type {
  Account,
  AppSettings,
  Attendance,
  Branch,
  BusinessProfile,
  Customer,
  CustomerReturn,
  Delivery,
  DocumentLine,
  ERPDataState,
  Employee,
  Expense,
  FiscalPeriod,
  GoodsReceipt,
  GoodsReceiptLine,
  JournalEntry,
  JournalLine,
  PayrollLine,
  PayrollRun,
  Payment,
  PaymentAllocation,
  Product,
  PurchaseOrder,
  PurchaseRequest,
  PurchaseReturn,
  Quotation,
  SalesInvoice,
  SalesOrder,
  StockAdjustment,
  StockBalance,
  StockMovement,
  StockReservation,
  StockTransfer,
  Supplier,
  SupplierBill,
  Unit,
  Warehouse,
  Category,
  Approval,
  AuditLog,
  DocumentSequence,
  LeaveRequest,
} from "@/types/erp";

import { computeTotals, lineTotalOf, round2 } from "./calculations";
import { addDays, subtractDays, todayKey, type DateKey } from "./dates";
import { generateId } from "./id";

export const DEMO_SEED_DAYS = 90;
export const DEMO_ACTOR_ID = "usr_demo";
export const DEMO_ACTOR_NAME = "Demo User";

/* ------------------------------ utilities ------------------------- */

let seed = 20260420;

function random(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function int(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function chance(probability: number): boolean {
  return random() < probability;
}

function pickOne<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error("pickOne called with an empty list");
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("pickOne produced no item");
  return item;
}

function ts(dateKey: DateKey, hour = 9): string {
  return `${dateKey}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

function makeLine(product: Product, quantity: number, discount: number, useCost: boolean): DocumentLine {
  const line: DocumentLine = {
    id: generateId("ln"),
    productId: product.id,
    description: product.name,
    quantity,
    unitPrice: round2(useCost ? product.costPrice : product.sellPrice),
    discountPercent: discount,
    taxRate: product.taxRate,
    lineTotal: 0,
  };
  line.lineTotal = lineTotalOf(line);
  return line;
}

interface MovementDelta {
  date: DateKey;
  seq: number;
  productId: string;
  warehouseId: string;
  bucket: "onHand" | "reserved";
  quantity: number;
  type: StockMovement["type"];
  refType: string;
  refId: string;
  refNumber?: string;
  unitCost?: number;
  notes?: string;
}

/** Bulk order sizes scale with unit price so line values stay plausible. */
function saleQuantity(product: Product): number {
  const price = product.sellPrice;
  if (price < 2) return int(400, 1200);
  if (price < 10) return int(120, 500);
  if (price < 30) return int(30, 180);
  return int(4, 40);
}

/* ------------------------------ the seed -------------------------- */

export function buildDemoData(): ERPDataState {
  seed = 20260420;

  const today = todayKey();
  const daysBack = (min: number, max: number) => dayOf(int(min, max));
  function dayOf(back: number): DateKey {
    return subtractDays(today, Math.min(DEMO_SEED_DAYS, Math.max(0, back)));
  }
  function dayAhead(forward: number): DateKey {
    return addDays(today, forward);
  }
  /** Keeps generated documents inside the seeded window. */
  function cap(key: DateKey): DateKey {
    return key > today ? today : key;
  }

  const sequences: Record<string, number> = {};
  const nextNumber = (prefix: string): string => {
    const current = (sequences[prefix] ?? 0) + 1;
    sequences[prefix] = current;
    return `${prefix}-${String(current).padStart(4, "0")}`;
  };

  /* -------------------------- master data ------------------------- */

  const createdAt = ts(dayOf(90));

  const branches: Branch[] = [
    { id: generateId("brn"), code: "MAIN", name: "Harbor Main", city: "Seattle", status: "active", createdAt },
    { id: generateId("brn"), code: "EAST", name: "East Depot", city: "Spokane", status: "active", createdAt },
  ];
  const branchMain = branches[0];
  const branchEast = branches[1];
  if (!branchMain || !branchEast) throw new Error("seed branches");

  const warehouses: Warehouse[] = [
    { id: generateId("whs"), code: "WH1", name: "Central Warehouse", branchId: branchMain.id, isDefault: true, status: "active", createdAt },
    { id: generateId("whs"), code: "WH2", name: "East Overflow", branchId: branchEast.id, isDefault: false, status: "active", createdAt },
  ];
  const whMain = warehouses[0];
  const whEast = warehouses[1];
  if (!whMain || !whEast) throw new Error("seed warehouses");

  const unitData: Array<[string, string, number]> = [
    ["PCS", "Pieces", 0],
    ["KG", "Kilograms", 2],
    ["BOX", "Box", 0],
    ["LTR", "Litres", 2],
    ["HR", "Hours", 1],
  ];
  const units: Unit[] = unitData.map(([code, name, decimals]) => ({
    id: generateId("unt"),
    code,
    name,
    decimals,
    status: "active",
    createdAt,
  }));
  const unitPcs = units[0];
  if (!unitPcs) throw new Error("seed units");

  const categoryData: Array<[string, string]> = [
    ["BEV", "Beverages"],
    ["PKG", "Packaging"],
    ["ELC", "Electronics"],
    ["OFF", "Office"],
    ["TLS", "Tools"],
  ];
  const categories: Category[] = categoryData.map(([code, name]) => ({
    id: generateId("cat"),
    code,
    name,
    parentId: null,
    status: "active",
    createdAt,
  }));
  const catOf = (code: string) =>
    categories.find((entry) => entry.code === code)?.id ?? null;

  interface ProductSeed {
    sku: string;
    name: string;
    cat: string;
    cost: number;
    price: number;
    reorder: number;
  }

  const productSeeds: ProductSeed[] = [
    { sku: "BEV-1001", name: "Still Water 500ml", cat: "BEV", cost: 0.45, price: 1.1, reorder: 120 },
    { sku: "BEV-1002", name: "Sparkling Water 500ml", cat: "BEV", cost: 0.55, price: 1.35, reorder: 100 },
    { sku: "BEV-1003", name: "Cold Brew Coffee 1L", cat: "BEV", cost: 2.8, price: 6.5, reorder: 40 },
    { sku: "BEV-1004", name: "Orange Juice 1L", cat: "BEV", cost: 1.6, price: 3.4, reorder: 60 },
    { sku: "PKG-2001", name: "Kraft Carton Small", cat: "PKG", cost: 0.18, price: 0.42, reorder: 400 },
    { sku: "PKG-2002", name: "Kraft Carton Large", cat: "PKG", cost: 0.34, price: 0.78, reorder: 300 },
    { sku: "PKG-2003", name: "Bubble Wrap Roll 50m", cat: "PKG", cost: 4.2, price: 9.9, reorder: 40 },
    { sku: "PKG-2004", name: "Packing Tape 6pk", cat: "PKG", cost: 0.9, price: 2.1, reorder: 80 },
    { sku: "ELC-3001", name: "USB-C Cable 1m", cat: "ELC", cost: 2.4, price: 7.9, reorder: 60 },
    { sku: "ELC-3002", name: "Wireless Mouse", cat: "ELC", cost: 7.5, price: 18.9, reorder: 30 },
    { sku: "ELC-3003", name: "LED Desk Lamp", cat: "ELC", cost: 11, price: 26.5, reorder: 25 },
    { sku: "ELC-3004", name: "Power Bank 10000mAh", cat: "ELC", cost: 9.2, price: 22, reorder: 25 },
    { sku: "OFF-4001", name: "A4 Paper Ream", cat: "OFF", cost: 3.1, price: 6.75, reorder: 90 },
    { sku: "OFF-4002", name: "Gel Pens Box", cat: "OFF", cost: 1.9, price: 4.5, reorder: 70 },
    { sku: "OFF-4003", name: "Hardcover Notebook", cat: "OFF", cost: 1.2, price: 3.2, reorder: 110 },
    { sku: "TLS-5001", name: "Cordless Drill 18V", cat: "TLS", cost: 34, price: 79, reorder: 15 },
    { sku: "TLS-5002", name: "Tape Measure 5m", cat: "TLS", cost: 3.4, price: 8.25, reorder: 50 },
    { sku: "TLS-5003", name: "Canvas Tool Bag", cat: "TLS", cost: 8.6, price: 19.5, reorder: 30 },
  ];

  const products: Product[] = productSeeds.map((entry) => ({
    id: generateId("prd"),
    sku: entry.sku,
    name: entry.name,
    barcode: `${int(100000000000, 999999999999)}`,
    categoryId: catOf(entry.cat),
    unitId: unitPcs.id,
    supplierId: null,
    costPrice: entry.cost,
    sellPrice: entry.price,
    taxRate: 8.25,
    reorderLevel: entry.reorder,
    trackStock: true,
    status: "active",
    description: "",
    createdAt,
    updatedAt: createdAt,
  }));

  const customerSeeds: Array<[string, string, number, string[]]> = [
    ["Riverside Grocers", "Seattle, WA", 30, ["retail", "key"]],
    ["Bayside Hotels Group", "Tacoma, WA", 45, ["hospitality", "key"]],
    ["Metro Office Furnishings", "Bellevue, WA", 30, ["trade"]],
    ["Kestrel Outfitters", "Portland, OR", 15, ["retail"]],
    ["Lumen Cafe Group", "Seattle, WA", 30, ["hospitality"]],
    ["Harborview Pharmacy", "Everett, WA", 45, ["healthcare"]],
    ["Northgate Schools Trust", "Seattle, WA", 60, ["institution"]],
    ["Pinecrest Interiors", "Spokane, WA", 30, ["trade"]],
    ["Saffron Kitchen Supplies", "Boise, ID", 30, ["hospitality"]],
    ["Atlas Fitness Clubs", "Portland, OR", 45, ["retail"]],
    ["Verde Market Co-op", "Bellingham, WA", 15, ["retail"]],
    ["Copper Lane Books", "Olympia, WA", 30, ["retail"]],
  ];

  const customers: Customer[] = customerSeeds.map(([name, city, terms, tags], index) => ({
    id: generateId("cus"),
    code: `C-${1001 + index}`,
    name,
    contactName: pickOne(["Ava Lindqvist", "Marcus Bell", "Priya Nair", "Tom Okafor", "Elena Ruiz", "Jonas Weber"]),
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    phone: `+1 206 555 ${String(int(1000, 9999))}`,
    address: `${int(100, 9800)} ${pickOne(["Harbor Ave", "Mill St", "Cedar Way", "Pier Road"])}`,
    city,
    country: "USA",
    tags,
    creditLimit: pickOne([25000, 50000, 75000, 100000]),
    paymentTerms: terms,
    currency: "USD",
    openingBalance: 0,
    status: "active",
    notes: "",
    createdAt,
    updatedAt: createdAt,
  }));

  const supplierSeeds: Array<[string, number]> = [
    ["Cascade Beverages", 30],
    ["Northstar Packaging", 30],
    ["Volt Electronics", 45],
    ["Meridian Paper Mills", 30],
    ["Torque Tools Ltd", 45],
    ["Bluewave Imports", 60],
    ["Gateway Freight", 15],
  ];

  const suppliers: Supplier[] = supplierSeeds.map(([name, terms], index) => ({
    id: generateId("sup"),
    code: `S-${2001 + index}`,
    name,
    contactName: pickOne(["Sara Osei", "Luis Ferreira", "Nina Kowalski", "Ben Tanaka"]),
    email: `purchasing@${name.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
    phone: `+1 509 555 ${String(int(1000, 9999))}`,
    country: "USA",
    tags: [terms >= 45 ? "long-terms" : "standard"],
    paymentTerms: terms,
    currency: "USD",
    openingBalance: 0,
    status: "active",
    notes: "",
    createdAt,
    updatedAt: createdAt,
  }));

  const departmentSeeds: Array<[string, string]> = [
    ["OPS", "Operations"],
    ["SAL", "Sales"],
    ["FIN", "Finance"],
    ["WHS", "Warehouse"],
  ];
  const departments = departmentSeeds.map(([code, name]) => ({
    id: generateId("dep"),
    code,
    name,
    managerId: null,
    status: "active" as const,
    createdAt,
  }));

  const employeeSeeds: Array<[string, string, string, number]> = [
    ["Dana Whitfield", "Operations Manager", "OPS", 7400],
    ["Ibrahim Cole", "Sales Lead", "SAL", 6200],
    ["Mei Sato", "Accountant", "FIN", 6800],
    ["Lucas Brandt", "Warehouse Supervisor", "WHS", 5400],
    ["Ana Duarte", "Sales Executive", "SAL", 4300],
    ["Peter Novak", "Purchasing Clerk", "OPS", 3900],
    ["Grace Mwangi", "Inventory Clerk", "WHS", 3400],
    ["Owen Fitzgerald", "Accounts Payable Clerk", "FIN", 4100],
  ];

  const employees: Employee[] = employeeSeeds.map(([name, designation, depCode, salary], index) => ({
    id: generateId("emp"),
    code: `E-${String(index + 1).padStart(3, "0")}`,
    name,
    email: `${name.toLowerCase().split(" ")[0]}@harborfield.example`,
    phone: `+1 206 555 ${String(int(1000, 9999))}`,
    departmentId: departments.find((entry) => entry.code === depCode)?.id ?? null,
    designation,
    joinDate: subtractDays(today, 210 - index * 30),
    employmentType: index < 6 ? "full_time" : "part_time",
    status: "active",
    salary,
    currency: "USD",
    bankAccount: `US${String(int(10000000, 99999999))}`,
    address: `${int(100, 9900)} ${pickOne(["Alder St", "Birch Rd", "Elm Ct"])}, Seattle`,
    leaveBalance: int(4, 18),
    createdAt,
    updatedAt: createdAt,
  }));

  const accountSeeds: Array<[string, string, Account["type"], boolean]> = [
    ["1000", "Petty Cash", "asset", false],
    ["1010", "Operating Bank", "asset", true],
    ["1100", "Accounts Receivable", "asset", true],
    ["1150", "Input Tax", "asset", false],
    ["1200", "Inventory", "asset", true],
    ["1500", "Equipment", "asset", false],
    ["2000", "Accounts Payable", "liability", true],
    ["2100", "Output Tax Payable", "liability", true],
    ["2200", "Payroll Deductions Payable", "liability", false],
    ["3000", "Owner Equity", "equity", true],
    ["3100", "Retained Earnings", "equity", false],
    ["4000", "Sales Revenue", "revenue", true],
    ["4100", "Sales Returns", "revenue", false],
    ["4900", "Other Income", "revenue", false],
    ["5000", "Cost of Goods Sold", "expense", true],
    ["6000", "Salaries and Wages", "expense", true],
    ["6100", "Rent", "expense", false],
    ["6200", "Utilities", "expense", false],
    ["6300", "Marketing", "expense", false],
    ["6400", "Office Supplies", "expense", false],
    ["6500", "Freight Out", "expense", false],
    ["6600", "Shrinkage", "expense", false],
    ["6900", "Miscellaneous Expense", "expense", false],
  ];

  const accounts: Account[] = accountSeeds.map(([code, name, type, isSystem]) => ({
    id: generateId("acc"),
    code,
    name,
    type,
    parentId: null,
    isSystem,
    status: "active",
    createdAt,
    updatedAt: createdAt,
  }));

  const accountByCode = (code: string): string => {
    const account = accounts.find((entry) => entry.code === code);
    if (!account) throw new Error(`Missing account ${code}`);
    return account.id;
  };

  /* ---------------------------- journal core ---------------------- */

  const journalEntries: JournalEntry[] = [];
  const journalLines: JournalLine[] = [];
  let journalSeq = 0;

  interface SeedJournalLine {
    code: string;
    debit?: number;
    credit?: number;
    memo?: string;
  }

  function postJournal(
    date: DateKey,
    memo: string,
    refType: string,
    refId: string | null,
    lines: SeedJournalLine[],
    refNumber?: string,
  ): void {
    const usable = lines.filter(
      (line) => round2(line.debit ?? 0) > 0 || round2(line.credit ?? 0) > 0,
    );
    if (usable.length < 2) return;

    journalSeq += 1;
    const entryId = generateId("jrn");
    const number = `JE-${String(journalSeq).padStart(4, "0")}`;
    const built: JournalLine[] = usable.map((line) => ({
      id: generateId("jln"),
      entryId,
      accountId: accountByCode(line.code),
      debit: round2(line.debit ?? 0),
      credit: round2(line.credit ?? 0),
      memo: line.memo,
      partyType: null,
      partyId: null,
    }));

    const debit = round2(built.reduce((sum, line) => sum + line.debit, 0));
    const credit = round2(built.reduce((sum, line) => sum + line.credit, 0));
    if (debit !== credit) {
      throw new Error(`Seed journal ${number} does not balance: ${debit} vs ${credit}`);
    }

    const entry: JournalEntry = {
      id: entryId,
      number,
      date,
      memo,
      refType,
      refId,
      refNumber,
      status: "posted",
      totalDebit: debit,
      totalCredit: credit,
      lines: built,
      postedAt: ts(date, 12),
      createdAt: ts(date, 12),
      createdBy: DEMO_ACTOR_ID,
    };

    journalEntries.push(entry);
    journalLines.push(...built);
  }

  /* --------------------------- stock ledger ----------------------- */

  const movementDeltas: MovementDelta[] = [];
  let movementSeq = 0;

  function delta(
    date: DateKey,
    product: Product,
    warehouseId: string,
    quantity: number,
    type: StockMovement["type"],
    refType: string,
    refId: string,
    refNumber?: string,
    bucket: "onHand" | "reserved" = "onHand",
  ): MovementDelta {
    movementSeq += 1;
    const entry: MovementDelta = {
      date,
      seq: movementSeq,
      productId: product.id,
      warehouseId,
      bucket,
      quantity: round2(quantity),
      type,
      refType,
      refId,
      refNumber,
      unitCost: product.costPrice,
    };
    movementDeltas.push(entry);
    return entry;
  }

  /* -------------------------- stock opening ----------------------- */

  const openingDate = dayOf(90);
  const openingEntries: Array<{ entry: MovementDelta; product: Product; warehouseId: string }> = [];

  function pushOpening(product: Product, warehouseId: string, quantity: number): MovementDelta {
    const entry = delta(
      openingDate,
      product,
      warehouseId,
      quantity,
      "opening",
      "opening",
      "opening",
      "OPENING",
    );
    openingEntries.push({ entry, product, warehouseId });
    return entry;
  }

  for (const product of products) {
    const planned = product.reorderLevel * int(3, 6);
    pushOpening(product, whMain.id, planned);
  }

  /* --------------------------- sales chains ----------------------- */

  const quotations: Quotation[] = [];
  const salesOrders: SalesOrder[] = [];
  const deliveries: Delivery[] = [];
  const salesInvoices: SalesInvoice[] = [];
  const customerReturns: CustomerReturn[] = [];
  const payments: Payment[] = [];
  const paymentAllocations: PaymentAllocation[] = [];
  const stockReservations: StockReservation[] = [];
  const approvals: Approval[] = [];

  function addPayment(options: {
    date: DateKey;
    direction: "inbound" | "outbound";
    partyType: "customer" | "supplier";
    partyId: string;
    partyName: string;
    amount: number;
    targetType: "sales_invoice" | "supplier_bill";
    targetId: string;
    targetNumber: string;
    method?: Payment["method"];
  }): void {
    const amount = round2(options.amount);
    if (amount <= 0) return;
    const date = cap(options.date);

    const payment: Payment = {
      id: generateId("pay"),
      number: nextNumber("PAY"),
      date,
      direction: options.direction,
      method: options.method ?? (chance(0.75) ? "bank_transfer" : "cheque"),
      partyType: options.partyType,
      partyId: options.partyId,
      partyName: options.partyName,
      amount,
      currency: "USD",
      bankAccountId: accountByCode("1010"),
      reference: `REF${int(100000, 999999)}`,
      status: "cleared",
      createdAt: ts(date, 14),
    };
    payments.push(payment);

    paymentAllocations.push({
      id: generateId("alc"),
      paymentId: payment.id,
      targetType: options.targetType,
      targetId: options.targetId,
      targetNumber: options.targetNumber,
      amount,
      createdAt: ts(date, 14),
    });

    if (options.direction === "inbound") {
      postJournal(date, `Receipt ${payment.number} from ${options.partyName}`, "payment", payment.id, [
        { code: "1010", debit: amount },
        { code: "1100", credit: amount },
      ]);
    } else {
      postJournal(date, `Payment ${payment.number} to ${options.partyName}`, "payment", payment.id, [
        { code: "2000", debit: amount },
        { code: "1010", credit: amount },
      ]);
    }
  }

  for (let index = 0; index < 104; index += 1) {
    const customer = pickOne(customers);
    const orderDate = daysBack(4, 88);
    const branch = chance(0.75) ? branchMain : branchEast;
    const warehouse = branch.id === branchMain.id ? whMain : whEast;

    const lineCount = int(1, 4);
    const lines: DocumentLine[] = [];
    for (let line = 0; line < lineCount; line += 1) {
      const product = pickOne(products);
      lines.push(makeLine(product, saleQuantity(product), chance(0.18) ? pickOne([5, 10, 15]) : 0, false));
    }
    const totals = computeTotals(lines);

    /* quotation */
    const quotationNumber = nextNumber("QT");
    const quotation: Quotation = {
      id: generateId("quo"),
      number: quotationNumber,
      date: orderDate,
      validUntil: addDays(orderDate, 21),
      customerId: customer.id,
      branchId: branch.id,
      warehouseId: warehouse.id,
      status: chance(0.72) ? "converted" : pickOne(["sent", "rejected", "expired", "draft"]),
      lines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      currency: "USD",
      salesRepId: employees[1]?.id,
      notes: "",
      createdAt: ts(orderDate, 9),
      updatedAt: ts(orderDate, 9),
    };
    quotations.push(quotation);

    /* sales order */
    const orderRoll = random();
    const orderStatus: SalesOrder["status"] =
      orderRoll < 0.7 ? "fulfilled" : orderRoll < 0.82 ? "approved" : orderRoll < 0.92 ? "pending" : "cancelled";

    const orderNumber = nextNumber("SO");
    const order: SalesOrder = {
      id: generateId("sor"),
      number: orderNumber,
      date: orderDate,
      customerId: customer.id,
      branchId: branch.id,
      warehouseId: warehouse.id,
      status: orderStatus,
      quotationId: orderStatus === "cancelled" && chance(0.3) ? null : quotation.id,
      lines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      currency: "USD",
      paymentTerms: customer.paymentTerms,
      notes: "",
      approvedBy: orderStatus === "approved" || orderStatus === "fulfilled" ? DEMO_ACTOR_ID : undefined,
      approvedAt: orderStatus === "approved" || orderStatus === "fulfilled" ? ts(orderDate, 10) : undefined,
      createdAt: ts(orderDate, 9),
      updatedAt: ts(orderDate, 10),
    };
    salesOrders.push(order);

    quotation.convertedToOrderId = order.id;
    quotation.status = orderStatus === "cancelled" ? quotation.status : "converted";

    if (orderStatus === "pending") {
      approvals.push({
        id: generateId("apr"),
        refType: "sales_order",
        refId: order.id,
        refNumber: order.number,
        requestedBy: employees[1]?.id ?? DEMO_ACTOR_ID,
        requestedAt: ts(orderDate, 10),
        status: "pending",
        createdAt: ts(orderDate, 10),
      });
    }

    if (orderStatus === "approved") {
      for (const line of lines) {
        const product = products.find((entry) => entry.id === line.productId);
        if (!product || !product.trackStock) continue;
        stockReservations.push({
          id: generateId("rsv"),
          refType: "sales_order",
          refId: order.id,
          refNumber: order.number,
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: line.quantity,
          status: "active",
          createdAt: ts(orderDate, 10),
        });
        delta(orderDate, product, warehouse.id, line.quantity, "reservation", "sales_order", order.id, order.number, "reserved");
      }
    }

    if (orderStatus !== "fulfilled") continue;

    /* delivery */
    const deliveryDate = addDays(orderDate, int(1, 3));
    const deliveryNumber = nextNumber("DLV");
    const delivery: Delivery = {
      id: generateId("dlv"),
      number: deliveryNumber,
      date: deliveryDate,
      orderId: order.id,
      customerId: customer.id,
      warehouseId: warehouse.id,
      status: "delivered",
      lines,
      driverNote: "",
      createdBy: DEMO_ACTOR_ID,
      createdAt: ts(deliveryDate, 11),
      updatedAt: ts(deliveryDate, 11),
    };
    deliveries.push(delivery);

    for (const line of lines) {
      const product = products.find((entry) => entry.id === line.productId);
      if (!product || !product.trackStock) continue;
      delta(deliveryDate, product, warehouse.id, -line.quantity, "delivery", "sales_order", order.id, order.number);
    }

    const cogsValue = round2(
      lines.reduce((sum, line) => {
        const product = products.find((entry) => entry.id === line.productId);
        return sum + (product ? product.costPrice * line.quantity : 0);
      }, 0),
    );
    if (cogsValue > 0) {
      postJournal(deliveryDate, `COGS for ${order.number}`, "sales_order", order.id, [
        { code: "5000", debit: cogsValue },
        { code: "1200", credit: cogsValue },
      ], order.number);
    }

    /* invoice */
    const invoiceDate = addDays(orderDate, int(1, 4));
    const dueDate = addDays(invoiceDate, customer.paymentTerms);
    const invoiceNumber = nextNumber("INV");

    const invoice: SalesInvoice = {
      id: generateId("inv"),
      number: invoiceNumber,
      date: invoiceDate,
      dueDate,
      customerId: customer.id,
      branchId: branch.id,
      orderId: order.id,
      deliveryId: delivery.id,
      status: "issued",
      lines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      paidAmount: 0,
      currency: "USD",
      notes: "",
      createdAt: ts(invoiceDate, 13),
      updatedAt: ts(invoiceDate, 13),
    };

    const paymentRoll = random();
    let refunded = false;

    if (paymentRoll < 0.5) {
      invoice.paidAmount = totals.total;
    } else if (paymentRoll < 0.74) {
      invoice.paidAmount = round2(totals.total * (int(3, 7) / 10));
    } else if (paymentRoll >= 0.95 && dueDate < today) {
      refunded = true;
      invoice.paidAmount = 0;
      invoice.status = "refunded";
    }

    if (!refunded) {
      if (invoice.paidAmount >= totals.total) invoice.status = "paid";
      else if (dueDate < today) invoice.status = "overdue";
      else if (invoice.paidAmount > 0) invoice.status = "partial";
      else invoice.status = "issued";

      if (invoice.paidAmount > 0) {
        const chunks = invoice.paidAmount >= totals.total && chance(0.4) ? 2 : 1;
        let remaining = invoice.paidAmount;
        for (let chunk = 0; chunk < chunks; chunk += 1) {
          const amount =
            chunk === chunks - 1 ? remaining : round2(remaining * (int(4, 6) / 10));
          remaining = round2(remaining - amount);
          addPayment({
            date: cap(addDays(invoiceDate, int(0, customer.paymentTerms))),
            direction: "inbound",
            partyType: "customer",
            partyId: customer.id,
            partyName: customer.name,
            amount,
            targetType: "sales_invoice",
            targetId: invoice.id,
            targetNumber: invoice.number,
          });
        }
      }
    }

    if (!refunded) {
      postJournal(
        invoiceDate,
        `Invoice ${invoice.number} for ${customer.name}`,
        "sales_invoice",
        invoice.id,
        [
          { code: "1100", debit: totals.total },
          { code: "4000", credit: totals.subtotal },
          { code: "2100", credit: totals.taxTotal },
        ],
        invoice.number,
      );
    } else {
      postJournal(invoiceDate, `Invoice ${invoice.number}`, "sales_invoice", invoice.id, [
        { code: "1100", debit: totals.total },
        { code: "4000", credit: totals.subtotal },
        { code: "2100", credit: totals.taxTotal },
      ], invoice.number);
      postJournal(addDays(invoiceDate, 2), `Reversal of ${invoice.number}`, "sales_invoice", invoice.id, [
        { code: "4000", debit: totals.subtotal },
        { code: "2100", debit: totals.taxTotal },
        { code: "1100", credit: totals.total },
      ], invoice.number);
    }

    salesInvoices.push(invoice);

    /* customer return */
    if (chance(0.14) && invoice.status !== "refunded") {
      const returnDate = addDays(invoiceDate, int(3, 12));
      if (returnDate > today) continue;

      const returnLines = lines.slice(0, Math.max(1, lines.length - 1)).map((line) => {
        const quantity = Math.max(1, Math.floor(line.quantity / 3));
        const copy: DocumentLine = { ...line, id: generateId("ln"), quantity };
        copy.lineTotal = lineTotalOf(copy);
        return copy;
      });
      const returnTotals = computeTotals(returnLines);

      const returnEntry: CustomerReturn = {
        id: generateId("crn"),
        number: nextNumber("CRT"),
        date: returnDate,
        customerId: customer.id,
        invoiceId: invoice.id,
        warehouseId: warehouse.id,
        status: "received",
        lines: returnLines,
        reason: pickOne(["Damaged in transit", "Wrong item shipped", "Over delivery", "Quality complaint"]),
        refundMethod: chance(0.6) ? "credit_note" : "cash_refund",
        subtotal: returnTotals.subtotal,
        taxTotal: returnTotals.taxTotal,
        total: returnTotals.total,
        createdAt: ts(returnDate, 15),
        updatedAt: ts(returnDate, 15),
      };
      customerReturns.push(returnEntry);

      for (const line of returnLines) {
        const product = products.find((entry) => entry.id === line.productId);
        if (!product || !product.trackStock) continue;
        delta(returnDate, product, warehouse.id, line.quantity, "return_in", "customer_return", returnEntry.id, returnEntry.number);
      }

      postJournal(returnDate, `Credit note ${returnEntry.number}`, "customer_return", returnEntry.id, [
        { code: "4100", debit: returnTotals.total },
        { code: "1100", credit: returnTotals.total },
      ], returnEntry.number);
    }
  }

  /* ------------------------- purchasing chains --------------------- */

  const purchaseRequests: PurchaseRequest[] = [];
  const purchaseOrders: PurchaseOrder[] = [];
  const goodsReceipts: GoodsReceipt[] = [];
  const supplierBills: SupplierBill[] = [];
  const purchaseReturns: PurchaseReturn[] = [];

  for (let index = 0; index < 30; index += 1) {
    const supplier = pickOne(suppliers);
    const requestDate = daysBack(6, 86);
    const warehouse = chance(0.8) ? whMain : whEast;

    const lineCount = int(1, 3);
    const lines: DocumentLine[] = [];
    for (let line = 0; line < lineCount; line += 1) {
      const product = pickOne(products);
      lines.push(makeLine(product, product.reorderLevel * int(6, 14), chance(0.25) ? 3 : 0, true));
    }
    const totals = computeTotals(lines);

    const requestNumber = nextNumber("PRQ");
    const requestRoll = random();
    const requestStatus: PurchaseRequest["status"] =
      requestRoll < 0.72 ? "approved" : requestRoll < 0.85 ? "pending" : requestRoll < 0.94 ? "rejected" : "draft";

    const request: PurchaseRequest = {
      id: generateId("prq"),
      number: requestNumber,
      date: requestDate,
      requestedBy: employees[5]?.id ?? DEMO_ACTOR_ID,
      departmentId: departments[0]?.id ?? null,
      warehouseId: warehouse.id,
      status: requestStatus,
      priority: pickOne(["normal", "normal", "high", "low"]),
      lines,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      reason: "Replenishment",
      decidedBy: requestStatus === "approved" || requestStatus === "rejected" ? DEMO_ACTOR_ID : undefined,
      decidedAt:
        requestStatus === "approved" || requestStatus === "rejected"
          ? ts(addDays(requestDate, 1), 10)
          : undefined,
      createdAt: ts(requestDate, 9),
      updatedAt: ts(requestDate, 10),
    };
    purchaseRequests.push(request);

    if (requestStatus === "pending") {
      approvals.push({
        id: generateId("apr"),
        refType: "purchase_request",
        refId: request.id,
        refNumber: request.number,
        requestedBy: request.requestedBy,
        requestedAt: ts(requestDate, 9),
        status: "pending",
        createdAt: ts(requestDate, 9),
      });
    }

    if (requestStatus !== "approved") continue;

    const orderDate = addDays(requestDate, 1);
    const orderNumber = nextNumber("PO");
    const receivedRoll = random();
    const orderStatus: PurchaseOrder["status"] =
      receivedRoll < 0.65 ? "received" : receivedRoll < 0.8 ? "partially_received" : receivedRoll < 0.92 ? "sent" : "draft";

    const order: PurchaseOrder = {
      id: generateId("por"),
      number: orderNumber,
      date: orderDate,
      expectedDate: addDays(orderDate, int(5, 14)),
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      requestId: request.id,
      status: orderStatus,
      lines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      currency: "USD",
      notes: "",
      createdAt: ts(orderDate, 10),
      updatedAt: ts(orderDate, 10),
    };
    purchaseOrders.push(order);
    request.convertedToOrderId = order.id;
    request.status = "converted";

    if (orderStatus !== "received" && orderStatus !== "partially_received") continue;

    const receiptDate = addDays(orderDate, int(3, 10));
    if (receiptDate > today) continue;

    const receiptNumber = nextNumber("GRN");
    const fullReceipt = orderStatus === "received";
    const receiptLines: GoodsReceiptLine[] = lines.map((line) => ({
      id: generateId("grl"),
      productId: line.productId,
      orderedQuantity: line.quantity,
      receivedQuantity: fullReceipt ? line.quantity : Math.max(1, Math.round(line.quantity * (int(4, 7) / 10))),
      unitCost: round2(
        products.find((entry) => entry.id === line.productId)?.costPrice ?? 0,
      ),
    }));

    const receipt: GoodsReceipt = {
      id: generateId("grn"),
      number: receiptNumber,
      date: receiptDate,
      orderId: order.id,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      status: fullReceipt ? "posted" : "partial",
      lines: receiptLines,
      notes: "",
      postedAt: ts(receiptDate, 12),
      createdBy: DEMO_ACTOR_ID,
      createdAt: ts(receiptDate, 12),
      updatedAt: ts(receiptDate, 12),
    };
    goodsReceipts.push(receipt);

    for (const line of receiptLines) {
      const product = products.find((entry) => entry.id === line.productId);
      if (!product || !product.trackStock) continue;
      delta(receiptDate, product, warehouse.id, line.receivedQuantity, "receipt", "purchase_order", order.id, order.number);
    }

    const discountByProduct = new Map(lines.map((line) => [line.productId, line.discountPercent]));
    const receivedValue = round2(
      receiptLines.reduce((sum, line) => {
        const discount = discountByProduct.get(line.productId) ?? 0;
        return sum + line.receivedQuantity * line.unitCost * (1 - discount / 100);
      }, 0),
    );
    if (receivedValue > 0) {
      postJournal(receiptDate, `Goods receipt ${receipt.number}`, "purchase_order", order.id, [
        { code: "1200", debit: receivedValue },
        { code: "2000", credit: receivedValue },
      ], receipt.number);
    }

    const billDate = cap(addDays(receiptDate, 1));
    const receivedByProduct = new Map(receiptLines.map((line) => [line.productId, line.receivedQuantity]));
    const billLines: DocumentLine[] = [];
    for (const line of lines) {
      const quantity = receivedByProduct.get(line.productId);
      if (quantity === undefined) continue;
      const copy: DocumentLine = { ...line, id: generateId("ln"), quantity };
      copy.lineTotal = lineTotalOf(copy);
      billLines.push(copy);
    }
    const billTotals = computeTotals(billLines);
    const billNumber = nextNumber("BIL");
    const bill: SupplierBill = {
      id: generateId("bil"),
      number: billNumber,
      date: billDate,
      dueDate: addDays(billDate, supplier.paymentTerms),
      supplierId: supplier.id,
      orderId: order.id,
      receiptId: receipt.id,
      status: "issued",
      lines: billLines,
      subtotal: billTotals.subtotal,
      discountTotal: billTotals.discountTotal,
      taxTotal: billTotals.taxTotal,
      total: billTotals.total,
      paidAmount: 0,
      currency: "USD",
      notes: "",
      createdAt: ts(billDate, 13),
      updatedAt: ts(billDate, 13),
    };

    const billRoll = random();
    if (billRoll < 0.45) bill.paidAmount = billTotals.total;
    else if (billRoll < 0.68) bill.paidAmount = round2(billTotals.total * (int(3, 7) / 10));

    if (bill.paidAmount >= billTotals.total) bill.status = "paid";
    else if (bill.dueDate < today) bill.status = "overdue";
    else if (bill.paidAmount > 0) bill.status = "partial";
    else bill.status = "issued";

    if (bill.paidAmount > 0) {
      addPayment({
        date: addDays(billDate, int(1, supplier.paymentTerms)),
        direction: "outbound",
        partyType: "supplier",
        partyId: supplier.id,
        partyName: supplier.name,
        amount: bill.paidAmount,
        targetType: "supplier_bill",
        targetId: bill.id,
        targetNumber: bill.number,
      });
    }

    postJournal(billDate, `Supplier bill ${bill.number} from ${supplier.name}`, "supplier_bill", bill.id, [
      { code: "1150", debit: billTotals.taxTotal },
      { code: "2000", credit: billTotals.taxTotal },
    ], bill.number);

    supplierBills.push(bill);

    /* supplier return */
    if (chance(0.12)) {
      const returnDate = addDays(receiptDate, int(2, 10));
      if (returnDate <= today) {
        const returnLines = lines.slice(0, 1).map((line) => {
          const quantity = Math.max(1, Math.floor(line.quantity / 4));
          const copy: DocumentLine = { ...line, id: generateId("ln"), quantity };
          copy.lineTotal = lineTotalOf(copy);
          return copy;
        });
        const returnTotals = computeTotals(returnLines);
        const purchaseReturn: PurchaseReturn = {
          id: generateId("prt"),
          number: nextNumber("PRT"),
          date: returnDate,
          supplierId: supplier.id,
          warehouseId: warehouse.id,
          receiptId: receipt.id,
          status: "shipped",
          lines: returnLines,
          reason: pickOne(["Damaged stock", "Wrong item received", "Over shipment"]),
          subtotal: returnTotals.subtotal,
          taxTotal: returnTotals.taxTotal,
          total: returnTotals.total,
          createdAt: ts(returnDate, 14),
          updatedAt: ts(returnDate, 14),
        };
        purchaseReturns.push(purchaseReturn);

        for (const line of returnLines) {
          const product = products.find((entry) => entry.id === line.productId);
          if (!product || !product.trackStock) continue;
          delta(returnDate, product, warehouse.id, -line.quantity, "return_out", "purchase_return", purchaseReturn.id, purchaseReturn.number);
        }

        postJournal(returnDate, `Supplier return ${purchaseReturn.number}`, "purchase_return", purchaseReturn.id, [
          { code: "2000", debit: returnTotals.total },
          { code: "1200", credit: returnTotals.subtotal },
          { code: "1150", credit: returnTotals.taxTotal },
        ], purchaseReturn.number);
      }
    }
  }

  /* ----------------- transfers, adjustments, reservations ----------- */

  const stockTransfers: StockTransfer[] = [];
  for (let index = 0; index < 2; index += 1) {
    const date = daysBack(10, 45);
    const product = pickOne(products);
    const quantity = product.reorderLevel;
    const transfer: StockTransfer = {
      id: generateId("trf"),
      number: nextNumber("TRF"),
      date,
      fromWarehouseId: whMain.id,
      toWarehouseId: whEast.id,
      status: "received",
      lines: [
        {
          id: generateId("trl"),
          productId: product.id,
          quantity,
          receivedQuantity: quantity,
        },
      ],
      notes: "Rebalance to east depot",
      createdBy: DEMO_ACTOR_ID,
      createdAt: ts(date, 10),
      updatedAt: ts(date, 16),
    };
    stockTransfers.push(transfer);

    delta(date, product, whMain.id, -quantity, "transfer_out", "stock_transfer", transfer.id, transfer.number);
    delta(date, product, whEast.id, quantity, "transfer_in", "stock_transfer", transfer.id, transfer.number);
  }

  const stockAdjustments: StockAdjustment[] = [];
  for (let index = 0; index < 3; index += 1) {
    const date = daysBack(5, 50);
    const product = pickOne(products);
    const quantity = -Math.max(1, Math.round(product.reorderLevel / 4));
    const adjustment: StockAdjustment = {
      id: generateId("adj"),
      number: nextNumber("ADJ"),
      date,
      warehouseId: whMain.id,
      reason: pickOne(["damage", "count_correction", "theft"]),
      status: "approved",
      lines: [
        {
          id: generateId("adl"),
          productId: product.id,
          quantityDelta: quantity,
          unitCost: product.costPrice,
        },
      ],
      notes: "Cycle count variance",
      requestedBy: employees[6]?.id ?? DEMO_ACTOR_ID,
      decidedBy: DEMO_ACTOR_ID,
      decidedAt: ts(date, 15),
      createdAt: ts(date, 14),
      updatedAt: ts(date, 15),
    };
    stockAdjustments.push(adjustment);

    delta(date, product, whMain.id, quantity, "adjustment", "stock_adjustment", adjustment.id, adjustment.number);

    const value = round2(Math.abs(quantity) * product.costPrice);
    if (value > 0) {
      postJournal(date, `Stock adjustment ${adjustment.number}`, "stock_adjustment", adjustment.id, [
        { code: "6600", debit: value },
        { code: "1200", credit: value },
      ], adjustment.number);
    }
  }

  /* -------------------------- expenses ---------------------------- */

  const expenses: Expense[] = [];
  const expenseSeeds: Array<[string, string, number]> = [
    ["6100", "Harbor lease", 5200],
    ["6200", "Utilities", 840],
    ["6300", "Search and print ads", 1250],
    ["6400", "Office supplies", 320],
    ["6500", "Freight out", 1480],
  ];

  for (let month = 0; month < 3; month += 1) {
    for (const [code, payee, base] of expenseSeeds) {
      if (chance(0.2)) continue;
      const date = dayOf(88 - month * 30 - int(0, 6));
      const amount = round2(base * (int(85, 120) / 100));
      const expense: Expense = {
        id: generateId("exp"),
        number: nextNumber("EXP"),
        date,
        accountId: accountByCode(code),
        amount,
        currency: "USD",
        payee,
        method: chance(0.6) ? "bank_transfer" : "card",
        branchId: branchMain.id,
        status: "recorded",
        notes: "",
        createdBy: DEMO_ACTOR_ID,
        createdAt: ts(date, 16),
        updatedAt: ts(date, 16),
      };
      expenses.push(expense);

      postJournal(date, `${payee} ${expense.number}`, "expense", expense.id, [
        { code, debit: amount },
        { code: "1010", credit: amount },
      ], expense.number);
    }
  }

  /* ------------------------ payroll & time ------------------------ */

  const payrollRuns: PayrollRun[] = [];
  const payrollPeriods: Array<[number, PayrollRun["status"]]> = [
    [2, "paid"],
    [1, "paid"],
    [0, "draft"],
  ];

  for (const [monthBack, status] of payrollPeriods) {
    const periodDate = new Date();
    periodDate.setMonth(periodDate.getMonth() - monthBack);
    const year = periodDate.getFullYear();
    const month = periodDate.getMonth() + 1;
    const runDate = subtractDays(today, Math.min(DEMO_SEED_DAYS, monthBack * 30 + 2));

    const lines: PayrollLine[] = employees.map((employee) => {
      const allowances = round2(employee.salary * (int(3, 8) / 100));
      const overtime = chance(0.4) ? round2(employee.salary * (int(1, 4) / 100)) : 0;
      const grossPay = round2(employee.salary + allowances + overtime);
      const deductions = round2(grossPay * 0.18);
      const netPay = round2(grossPay - deductions);
      return {
        id: generateId("prl"),
        employeeId: employee.id,
        baseSalary: employee.salary,
        allowances,
        overtime,
        grossPay,
        deductions,
        netPay,
      };
    });

    const grossTotal = round2(lines.reduce((sum, line) => sum + line.grossPay, 0));
    const deductionTotal = round2(lines.reduce((sum, line) => sum + line.deductions, 0));
    const netTotal = round2(lines.reduce((sum, line) => sum + line.netPay, 0));

    const run: PayrollRun = {
      id: generateId("pay"),
      number: nextNumber("PAYR"),
      year,
      month,
      periodLabel: `${year}-${String(month).padStart(2, "0")}`,
      status,
      lines,
      grossTotal,
      deductionTotal,
      netTotal,
      approvedBy: status === "paid" ? DEMO_ACTOR_ID : undefined,
      approvedAt: status === "paid" ? ts(runDate, 11) : undefined,
      paidAt: status === "paid" ? ts(runDate, 15) : undefined,
      createdAt: ts(runDate, 9),
      updatedAt: ts(runDate, 15),
    };
    payrollRuns.push(run);

    if (status === "paid") {
      postJournal(runDate, `Payroll ${run.periodLabel}`, "payroll_run", run.id, [
        { code: "6000", debit: grossTotal },
        { code: "1010", credit: netTotal },
        { code: "2200", credit: deductionTotal },
      ], run.number);
    }
  }

  const attendance: Attendance[] = [];
  for (let back = 13; back >= 0; back -= 1) {
    const date = dayOf(back);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (weekday === 0 || weekday === 6) continue;

    for (const employee of employees) {
      const roll = random();
      const status: Attendance["status"] =
        roll < 0.82 ? "present" : roll < 0.88 ? "late" : roll < 0.93 ? "remote" : roll < 0.97 ? "leave" : "absent";

      const checkIn = status === "present" || status === "late" || status === "remote"
        ? `${status === "late" ? "09:40" : "08:55"}`
        : null;
      const checkOut = checkIn ? "17:30" : null;

      attendance.push({
        id: generateId("att"),
        employeeId: employee.id,
        date,
        checkIn,
        checkOut,
        status,
        minutesWorked: checkIn ? (status === "late" ? 470 : 515) : 0,
        createdAt: ts(date, 18),
        updatedAt: ts(date, 18),
      });
    }
  }

  const leaveRequests: LeaveRequest[] = [
    {
      id: generateId("lve"),
      employeeId: employees[0]?.id ?? "",
      type: "annual",
      startDate: dayOf(9),
      endDate: dayOf(7),
      days: 3,
      reason: "Family travel",
      status: "approved",
      reviewedBy: DEMO_ACTOR_ID,
      reviewedAt: ts(dayOf(13), 10),
      createdAt: ts(dayOf(15), 9),
      updatedAt: ts(dayOf(13), 10),
    },
    {
      id: generateId("lve"),
      employeeId: employees[4]?.id ?? "",
      type: "sick",
      startDate: dayOf(4),
      endDate: dayOf(3),
      days: 2,
      reason: "Flu",
      status: "approved",
      reviewedBy: DEMO_ACTOR_ID,
      reviewedAt: ts(dayOf(4), 8),
      createdAt: ts(dayOf(4), 7),
      updatedAt: ts(dayOf(4), 8),
    },
    {
      id: generateId("lve"),
      employeeId: employees[6]?.id ?? "",
      type: "annual",
      startDate: dayAhead(10),
      endDate: dayAhead(13),
      days: 4,
      reason: "Personal time",
      status: "pending",
      createdAt: ts(dayOf(2), 11),
      updatedAt: ts(dayOf(2), 11),
    },
  ];

  /* ------------------------ opening balance ----------------------- */

  const ordered = [...movementDeltas].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.seq - b.seq;
  });

  /* Opening stock is sized from the demand the rest of the seed creates,
     so no warehouse ever runs negative inside the window. */
  const drawdown = new Map<string, number>();
  const availability = new Map<string, number>();
  for (const entry of ordered) {
    if (entry.type === "opening") continue;
    const key = `${entry.productId}:${entry.warehouseId}`;
    const signed = entry.bucket === "reserved" ? -entry.quantity : entry.quantity;
    const next = round2((availability.get(key) ?? 0) + signed);
    availability.set(key, next);
    if (next < (drawdown.get(key) ?? 0)) drawdown.set(key, next);
  }

  const shortfall = (productId: string, warehouseId: string): number =>
    Math.max(0, Math.ceil(-(drawdown.get(`${productId}:${warehouseId}`) ?? 0)));

  for (const { entry, product, warehouseId } of openingEntries) {
    const planned = entry.quantity;
    const needed = shortfall(product.id, warehouseId) + product.reorderLevel;
    entry.quantity = round2(Math.max(planned, needed));
  }
  for (const product of products) {
    const extra = shortfall(product.id, whEast.id);
    if (extra <= 0) continue;
    pushOpening(product, whEast.id, round2(extra + product.reorderLevel));
  }

  const inventoryValue = round2(
    openingEntries.reduce((sum, { entry, product }) => sum + entry.quantity * product.costPrice, 0),
  );
  const cashValue = 145000;
  const equipmentValue = 48000;
  const equityTotal = round2(cashValue + inventoryValue + equipmentValue);

  postJournal(openingDate, "Opening balances", "opening", null, [
    { code: "1010", debit: cashValue },
    { code: "1200", debit: inventoryValue },
    { code: "1500", debit: equipmentValue },
    { code: "3000", credit: equityTotal },
  ]);

  /* --------------------- resolve stock balances ------------------- */

  movementDeltas.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.seq - b.seq;
  });

  const running = new Map<string, number>();
  const stockMovements: StockMovement[] = [];

  for (const entry of movementDeltas) {
    const key = `${entry.bucket}:${entry.productId}:${entry.warehouseId}`;
    const nextValue = round2((running.get(key) ?? 0) + entry.quantity);
    running.set(key, nextValue);

    stockMovements.push({
      id: generateId("mov"),
      date: entry.date,
      productId: entry.productId,
      warehouseId: entry.warehouseId,
      type: entry.type,
      quantity: entry.quantity,
      balanceAfter: nextValue,
      unitCost: entry.unitCost ?? 0,
      refType: entry.refType,
      refId: entry.refId,
      refNumber: entry.refNumber,
      notes: entry.notes,
      userId: DEMO_ACTOR_ID,
      createdAt: ts(entry.date, 12),
      updatedAt: ts(entry.date, 12),
    });
  }

  const balanceMap = new Map<string, StockBalance>();
  for (const [key, value] of running.entries()) {
    const [bucket = "onHand", productId = "", warehouseId = ""] = key.split(":");
    const mapKey = `${productId}:${warehouseId}`;
    const existing = balanceMap.get(mapKey) ?? {
      id: generateId("sbl"),
      productId,
      warehouseId,
      onHand: 0,
      reserved: 0,
      createdAt,
      updatedAt: createdAt,
    };
    if (bucket === "reserved") existing.reserved = value;
    else existing.onHand = value;
    existing.updatedAt = ts(today, 18);
    balanceMap.set(mapKey, existing);
  }

  /* --------------------------- configuration ---------------------- */

  const business: BusinessProfile = {
    id: generateId("biz"),
    name: "Harbor Field Supply",
    legalName: "Harbor Field Supply LLC",
    industry: "distribution",
    currency: "USD",
    timezone: "America/Los_Angeles",
    fiscalYearStart: `${new Date().getFullYear()}-01-01`,
    defaultTaxRate: 8.25,
    email: "hello@harborfield.example",
    phone: "+1 206 555 0142",
    address: "1420 Pier Road",
    city: "Seattle",
    country: "USA",
    taxId: "US-91-3456789",
    website: "harborfield.example",
    primaryMetric: "revenue",
    revenueTarget: 480000,
    expenseTarget: 320000,
    onboardingDone: true,
    createdAt,
    updatedAt: ts(today, 8),
  };

  const settings: AppSettings = {
    id: generateId("set"),
    theme: "system",
    currencyDecimals: 2,
    dateFormat: "iso",
    defaultBranchId: branchMain.id,
    defaultWarehouseId: whMain.id,
    defaultPaymentTerms: 30,
    lowStockThreshold: 25,
    reduceMotion: false,
    updatedAt: ts(today, 8),
  };

  const fiscalPeriods: FiscalPeriod[] = [2, 1, 0].map((back) => {
    const date = new Date();
    date.setMonth(date.getMonth() - back);
    const start = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const end = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return {
      id: generateId("fpe"),
      name: `${start.slice(0, 7)}`,
      startDate: start,
      endDate: end,
      status: "open",
      createdAt,
      updatedAt: createdAt,
    };
  });

  const documentSequences: DocumentSequence[] = Object.entries(sequences).map(
    ([prefix, value]) => ({
      id: generateId("seq"),
      prefix,
      next: value + 1,
      padding: 4,
    }),
  );

  /* ---------------------------- audit trail ----------------------- */

  const auditLog: AuditLog[] = [];
  const pushAudit = (
    action: AuditLog["action"],
    entity: string,
    entityId: string | null,
    summary: string,
    date: DateKey,
    hour: number,
    entityNumber?: string,
  ) => {
    auditLog.push({
      id: generateId("aud"),
      at: ts(date, hour),
      actorId: DEMO_ACTOR_ID,
      actorName: DEMO_ACTOR_NAME,
      action,
      entity,
      entityId,
      entityNumber,
      summary,
      before: null,
      after: null,
    });
  };

  pushAudit("create", "workspace", business.id, "Seeded 90 day demo workspace", today, 8);
  for (const invoice of salesInvoices.slice(-6)) {
    pushAudit("create", "sales_invoice", invoice.id, `Created invoice ${invoice.number}`, invoice.date, 13, invoice.number);
  }
  for (const order of purchaseOrders.slice(-4)) {
    pushAudit("create", "purchase_order", order.id, `Created purchase order ${order.number}`, order.date, 10, order.number);
  }
  for (const entry of journalEntries.slice(-5)) {
    pushAudit("post", "journal_entry", entry.id, `Posted journal ${entry.number}: ${entry.memo}`, entry.date, 12, entry.number);
  }
  for (const adjustment of stockAdjustments) {
    pushAudit("approve", "stock_adjustment", adjustment.id, `Approved adjustment ${adjustment.number}`, adjustment.date, 15, adjustment.number);
  }
  auditLog.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  return {
    business,
    settings,
    branches,
    warehouses,
    customers,
    suppliers,
    categories,
    units,
    products,
    stockBalances: Array.from(balanceMap.values()),
    stockMovements,
    stockTransfers,
    stockReservations,
    stockAdjustments,
    quotations,
    salesOrders,
    deliveries,
    salesInvoices,
    customerReturns,
    purchaseRequests,
    purchaseOrders,
    goodsReceipts,
    supplierBills,
    purchaseReturns,
    accounts,
    journalEntries,
    journalLines,
    payments,
    paymentAllocations,
    fiscalPeriods,
    expenses,
    departments,
    employees,
    attendance,
    leaveRequests,
    payrollRuns,
    approvals,
    auditLog,
    documentSequences,
  };
}
