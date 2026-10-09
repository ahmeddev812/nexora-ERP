/* Demo dataset invariants: run with `node scripts/seed-invariants.mjs`. */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".seedcheck");

execFileSync(
  process.execPath,
  [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", path.join(root, "tsconfig.seedcheck.json")],
  { cwd: root, stdio: "inherit" },
);

const seedModule = await import(pathToFileURL(path.join(outDir, "lib", "seed.js")).href);
const calcModule = await import(pathToFileURL(path.join(outDir, "lib", "calculations.js")).href);
const buildDemoData = seedModule.buildDemoData ?? seedModule.default?.buildDemoData;
const round2 = calcModule.round2 ?? calcModule.default?.round2;

const data = buildDemoData();
const problems = [];

const today = (() => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
})();

const counts = {
  branches: data.branches.length,
  warehouses: data.warehouses.length,
  products: data.products.length,
  customers: data.customers.length,
  suppliers: data.suppliers.length,
  employees: data.employees.length,
  quotations: data.quotations.length,
  salesOrders: data.salesOrders.length,
  deliveries: data.deliveries.length,
  invoices: data.salesInvoices.length,
  customerReturns: data.customerReturns.length,
  purchaseRequests: data.purchaseRequests.length,
  purchaseOrders: data.purchaseOrders.length,
  goodsReceipts: data.goodsReceipts.length,
  supplierBills: data.supplierBills.length,
  payments: data.payments.length,
  journalEntries: data.journalEntries.length,
  journalLines: data.journalLines.length,
  expenses: data.expenses.length,
  payrollRuns: data.payrollRuns.length,
  attendance: data.attendance.length,
  leaveRequests: data.leaveRequests.length,
  stockMovements: data.stockMovements.length,
  stockBalances: data.stockBalances.length,
  auditLog: data.auditLog.length,
};

for (const entry of data.journalEntries) {
  const debit = round2(entry.lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = round2(entry.lines.reduce((sum, line) => sum + line.credit, 0));
  if (debit !== credit) problems.push(`journal ${entry.number} unbalanced ${debit}/${credit}`);
  if (entry.totalDebit !== entry.totalCredit) problems.push(`journal ${entry.number} totals differ`);
  if (entry.date > today) problems.push(`journal ${entry.number} dated in the future ${entry.date}`);
}

const bucketOf = (movement) =>
  movement.type === "reservation" || movement.type === "reservation_release"
    ? "reserved"
    : "onHand";

const running = new Map();
for (const movement of data.stockMovements) {
  const key = `${bucketOf(movement)}:${movement.productId}:${movement.warehouseId}`;
  const next = round2((running.get(key) ?? 0) + movement.quantity);
  running.set(key, next);
  if (next !== movement.balanceAfter) {
    problems.push(`movement ${movement.id} balanceAfter ${movement.balanceAfter} vs ${next}`);
  }
  if (bucketOf(movement) === "onHand" && next < 0) {
    problems.push(`movement ${movement.id} drives onHand negative ${next}`);
  }
}
for (const balance of data.stockBalances) {
  const onHand = round2(running.get(`onHand:${balance.productId}:${balance.warehouseId}`) ?? 0);
  const reserved = round2(running.get(`reserved:${balance.productId}:${balance.warehouseId}`) ?? 0);
  if (onHand !== round2(balance.onHand)) {
    problems.push(`balance ${balance.id} onHand ${balance.onHand} vs movement total ${onHand}`);
  }
  if (reserved !== round2(balance.reserved)) {
    problems.push(`balance ${balance.id} reserved ${balance.reserved} vs movement total ${reserved}`);
  }
  if (round2(balance.onHand - balance.reserved) < 0) {
    problems.push(
      `balance ${balance.id} negative availability ${balance.onHand} onHand - ${balance.reserved} reserved`,
    );
  }
}

for (const invoice of data.salesInvoices) {
  if (invoice.date > today) problems.push(`invoice ${invoice.number} in the future`);
  const paid = data.paymentAllocations
    .filter((allocation) => allocation.targetId === invoice.id)
    .reduce((sum, allocation) => sum + allocation.amount, 0);
  if (round2(paid) > round2(invoice.total) + 0.01) {
    problems.push(`invoice ${invoice.number} overallocated ${paid} > ${invoice.total}`);
  }
  if (round2(paid) !== round2(invoice.paidAmount)) {
    problems.push(
      `invoice ${invoice.number} allocations ${round2(paid)} vs paidAmount ${round2(invoice.paidAmount)} status ${invoice.status} date ${invoice.date}`,
    );
  }
}
for (const bill of data.supplierBills) {
  if (bill.date > today) problems.push(`bill ${bill.number} in the future`);
}
for (const payment of data.payments) {
  if (payment.date > today) problems.push(`payment ${payment.number} in the future`);
}
for (const request of data.leaveRequests) {
  if (request.status === "pending" && request.endDate < today) {
    problems.push(`pending leave request ${request.id} ends before today ${request.endDate}`);
  }
  if (request.startDate > request.endDate) {
    problems.push(`leave request ${request.id} starts after it ends`);
  }
}

const byId = (list, id) => list.some((entry) => entry.id === id);
for (const invoice of data.salesInvoices) {
  if (invoice.customerId && !byId(data.customers, invoice.customerId)) {
    problems.push(`invoice ${invoice.number} references unknown customer`);
  }
}
for (const movement of data.stockMovements) {
  if (!byId(data.products, movement.productId)) problems.push("movement references unknown product");
  if (!byId(data.warehouses, movement.warehouseId)) problems.push("movement references unknown warehouse");
}
for (const line of data.journalLines) {
  if (!byId(data.accounts, line.accountId)) problems.push("journal line references unknown account");
}

const accounts = new Map(data.accounts.map((account) => [account.id, account]));
const balances = new Map();
for (const line of data.journalLines) {
  const account = accounts.get(line.accountId);
  if (!account) continue;
  const entry = balances.get(account.code) ?? {
    code: account.code,
    name: account.name,
    type: account.type,
    debit: 0,
    credit: 0,
  };
  entry.debit = round2(entry.debit + line.debit);
  entry.credit = round2(entry.credit + line.credit);
  balances.set(account.code, entry);
}

const rows = [...balances.values()].sort((a, b) => a.code.localeCompare(b.code));
const totals = rows.reduce(
  (acc, row) => {
    acc[row.type] = round2((acc[row.type] ?? 0) + row.debit - row.credit);
    return acc;
  },
  {},
);
const grandTotal = round2(rows.reduce((sum, row) => sum + row.debit - row.credit, 0));

const revenue = data.salesInvoices
  .filter((invoice) => !["draft", "void", "refunded"].includes(invoice.status))
  .reduce((sum, invoice) => sum + invoice.subtotal, 0);
const collected = data.salesInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
const revenueBalance = round2(
  (balances.get("4000")?.credit ?? 0) - (balances.get("4000")?.debit ?? 0)
  + (balances.get("4100")?.credit ?? 0) - (balances.get("4100")?.debit ?? 0),
);
const netProfit = round2(
  revenueBalance - rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.debit - row.credit, 0),
);

const arByCustomer = new Map();
for (const invoice of data.salesInvoices) {
  if (["draft", "void", "refunded"].includes(invoice.status)) continue;
  const balance = round2(invoice.total - invoice.paidAmount);
  arByCustomer.set(invoice.customerId, round2((arByCustomer.get(invoice.customerId) ?? 0) + balance));
}
const overLimit = data.customers.filter(
  (customer) => (arByCustomer.get(customer.id) ?? 0) > customer.creditLimit,
);
if (overLimit.length > 0) {
  problems.push(`${overLimit.length} customer(s) exceed their credit limit`);
}

console.log("counts", JSON.stringify(counts, null, 2));
console.log("ledger", JSON.stringify(rows, null, 2));
console.log("balances by type", JSON.stringify(totals, null, 2));
console.log("grand total (must be 0)", grandTotal);
console.log("revenue (subtotal, active invoices)", round2(revenue));
console.log("collected", round2(collected));
console.log("net profit", netProfit);
console.log("customers over credit limit", overLimit.length);
console.log("approx JSON bytes", JSON.stringify(data).length);
console.log("problems", problems.length);
if (problems.length) {
  for (const problem of problems.slice(0, 40)) console.log(" -", problem);
  process.exit(1);
}
console.log("SEED OK");
