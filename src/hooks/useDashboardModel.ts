"use client";

import { useMemo, useState } from "react";

import { useERPData } from "@/hooks/useERPData";
import type { IconName } from "@/components/ui/Icon";
import type { AgingSummary, SeriesPoint, StockAlert } from "@/lib/calculations";
import {
  agingBuckets,
  calculateCOGS,
  calculateCollected,
  calculateGrossProfit,
  calculateNetProfit,
  calculatePayables,
  calculateReceivables,
  calculateRevenue,
  calculateStockValue,
  grossMarginPercent,
  inRange,
  invoiceBalance,
  isActiveSale,
  lastNDaysRange,
  percentChange,
  percentOf,
  revenueSeries,
  round2,
  seriesByDay,
  stockAlerts,
  sum,
  topBy,
} from "@/lib/calculations";
import type { DateRange } from "@/lib/calculations";
import type { DateKey } from "@/lib/dates";
import { daysBetween, isOverdue, subtractDays, todayKey } from "@/lib/dates";
import type { Approval, AuditLog, SalesInvoice } from "@/types/erp";

export type DashboardDays = 7 | 30 | 90;

export interface PipelineStage {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  count: number;
  amount?: number;
  hint: string;
}

export interface OverdueRow {
  invoice: SalesInvoice;
  customerName: string;
  balance: number;
  daysOverdue: number;
}

export interface TopProductRow {
  id: string;
  sku: string;
  name: string;
  revenue: number;
  share: number;
}

export interface PeriodMetric {
  value: number;
  previous: number;
  delta: number | null;
}

export interface DashboardModel {
  days: DashboardDays;
  setDays: (days: DashboardDays) => void;
  range: DateRange;

  revenue: PeriodMetric;
  collected: PeriodMetric;
  netProfit: PeriodMetric;
  grossProfit: number;
  margin: number | null;
  collectionRate: number | null;
  invoicesInRange: number;

  cash: number;
  cashSeries: SeriesPoint[];
  revenueSeries: SeriesPoint[];
  collectedSeries: SeriesPoint[];
  receivables: number;
  payables: number;
  stockValue: number;

  overdueInvoices: OverdueRow[];
  overdueAmount: number;
  alerts: StockAlert[];
  outOfStock: number;
  lowStock: number;
  pendingApprovals: Approval[];
  pendingLeaves: number;

  pipeline: PipelineStage[];
  topProducts: TopProductRow[];
  activity: AuditLog[];
  aging: AgingSummary;
}


export function useDashboardModel(): DashboardModel {
  const data = useERPData();
  const [days, setDays] = useState<DashboardDays>(30);

  const range = useMemo(() => lastNDaysRange(days), [days]);
  const previousRange = useMemo<DateRange>(
    () => ({ from: subtractDays(range.from, days), to: subtractDays(range.from, 1) }),
    [range.from, days],
  );

  const period = useMemo<Record<"revenue" | "collected" | "netProfit", PeriodMetric>>(
    () => {
      const metric = (pick: (input: DateRange) => number): PeriodMetric => {
        const value = pick(range);
        const previous = pick(previousRange);
        return { value: round2(value), previous: round2(previous), delta: percentChange(value, previous) };
      };

      const profit = (input: DateRange): number => {
        const revenue = calculateRevenue(data.salesInvoices, input);
        const cogs = calculateCOGS(data.salesInvoices, data.products, input);
        const opex = sum(
          data.expenses,
          (expense) => (expense.status === "recorded" && inRange(expense.date, input) ? expense.amount : 0),
        );
        return calculateNetProfit(calculateGrossProfit(revenue, cogs), opex);
      };

      return {
        revenue: metric((input) => calculateRevenue(data.salesInvoices, input)),
        collected: metric((input) => calculateCollected(data.salesInvoices, input)),
        netProfit: metric(profit),
      };
    },
    [data.salesInvoices, data.products, data.expenses, range, previousRange],
  );

  const periodCogs = useMemo(
    () => calculateCOGS(data.salesInvoices, data.products, range),
    [data.salesInvoices, data.products, range],
  );

  const grossProfit = useMemo(
    () => calculateGrossProfit(period.revenue.value, periodCogs),
    [period.revenue.value, periodCogs],
  );

  const margin = useMemo(
    () => grossMarginPercent(period.revenue.value, periodCogs),
    [period.revenue.value, periodCogs],
  );

  const invoicesInRange = useMemo(
    () => data.salesInvoices.filter((invoice) => isActiveSale(invoice) && inRange(invoice.date, range)).length,
    [data.salesInvoices, range],
  );

  const collectionRate = useMemo(
    () => percentOf(period.collected.value, period.revenue.value),
    [period.collected.value, period.revenue.value],
  );

  const cashAccounts = useMemo(() => {
    const ids = new Set<string>();
    for (const account of data.accounts) {
      if (account.type === "asset" && (account.code === "1000" || account.code === "1010")) {
        ids.add(account.id);
      }
    }
    return ids;
  }, [data.accounts]);

  const cash = useMemo(() => {
    let total = 0;
    for (const line of data.journalLines) {
      if (cashAccounts.has(line.accountId)) total += line.debit - line.credit;
    }
    return round2(total);
  }, [data.journalLines, cashAccounts]);

  const cashSeries = useMemo(() => {
    const dateByEntry = new Map(data.journalEntries.map((entry) => [entry.id, entry.date]));
    const flow = new Map<DateKey, number>();
    let opening = 0;
    for (const line of data.journalLines) {
      if (!cashAccounts.has(line.accountId)) continue;
      const date = dateByEntry.get(line.entryId);
      if (!date) continue;
      const net = line.debit - line.credit;
      if (date < range.from) opening += net;
      else if (date <= range.to) flow.set(date, round2((flow.get(date) ?? 0) + net));
    }
    const daily = seriesByDay(range, (day) => flow.get(day) ?? 0);
    const start = round2(opening);
    const running = daily.reduce<number[]>(
      (acc, point) => [...acc, round2((acc[acc.length - 1] ?? start) + point.value)],
      [],
    );
    return daily.map((point, index) => ({ date: point.date, value: running[index] ?? start }));
  }, [data.journalLines, data.journalEntries, cashAccounts, range]);

  const revenueSeriesData = useMemo(() => revenueSeries(data.salesInvoices, range), [data.salesInvoices, range]);

  const collectedSeries = useMemo(() => {
    const byDay = new Map<DateKey, number>();
    for (const payment of data.payments) {
      if (payment.direction !== "inbound" || payment.status === "void") continue;
      if (!inRange(payment.date, range)) continue;
      byDay.set(payment.date, round2((byDay.get(payment.date) ?? 0) + payment.amount));
    }
    return seriesByDay(range, (day) => byDay.get(day) ?? 0);
  }, [data.payments, range]);

  const balances = useMemo(
    () => ({
      receivables: calculateReceivables(data.salesInvoices),
      payables: calculatePayables(data.supplierBills),
      stockValue: calculateStockValue(data.products, data.stockBalances),
    }),
    [data.salesInvoices, data.supplierBills, data.products, data.stockBalances],
  );

  const overdueInvoices = useMemo<OverdueRow[]>(() => {
    const today = todayKey();
    const nameById = new Map(data.customers.map((customer) => [customer.id, customer.name]));
    return data.salesInvoices
      .filter((invoice) => isActiveSale(invoice) && invoiceBalance(invoice) > 0 && isOverdue(invoice.dueDate, today))
      .map((invoice) => ({
        invoice,
        customerName: nameById.get(invoice.customerId) ?? "Unknown customer",
        balance: invoiceBalance(invoice),
        daysOverdue: daysBetween(invoice.dueDate, today),
      }))
      .sort((a, b) => a.daysOverdue - b.daysOverdue);
  }, [data.salesInvoices, data.customers]);

  const overdueAmount = useMemo(
    () => round2(sum(overdueInvoices, (row) => row.balance)),
    [overdueInvoices],
  );

  const alerts = useMemo(
    () =>
      [...stockAlerts(data.products, data.stockBalances)].sort((a, b) => {
        const weight = (status: string) => (status === "out_of_stock" ? 0 : status === "low_stock" ? 1 : 2);
        return weight(a.status) - weight(b.status) || a.available - b.available;
      }),
    [data.products, data.stockBalances],
  );

  const pendingApprovals = useMemo(
    () => data.approvals.filter((approval) => approval.status === "pending"),
    [data.approvals],
  );

  const pendingLeaves = useMemo(
    () => data.leaveRequests.filter((request) => request.status === "pending").length,
    [data.leaveRequests],
  );

  const pipeline = useMemo<PipelineStage[]>(() => {
    const activeQuotations = data.quotations.filter((quote) => quote.status !== "rejected" && quote.status !== "expired");
    const converted = data.quotations.filter((quote) => quote.status === "converted").length;
    const openOrders = data.salesOrders.filter(
      (order) => order.status === "pending" || order.status === "approved",
    ).length;
    const fulfilledOrders = data.salesOrders.filter((order) => order.status === "fulfilled").length;
    const shipped = data.deliveries.filter((delivery) => delivery.status === "shipped").length;
    const delivered = data.deliveries.filter((delivery) => delivery.status === "delivered").length;
    const openInvoices = data.salesInvoices.filter(
      (invoice) => isActiveSale(invoice) && invoiceBalance(invoice) > 0,
    ).length;
    const received = data.payments.filter(
      (payment) => payment.direction === "inbound" && inRange(payment.date, range),
    );

    return [
      {
        id: "quotations",
        label: "Quotations",
        href: "/sales/quotations",
        icon: "quotations",
        count: activeQuotations.length,
        hint: `${percentOf(converted, Math.max(1, data.quotations.length)) ?? 0}% converted`,
      },
      {
        id: "orders",
        label: "Orders to ship",
        href: "/sales/orders",
        icon: "orders",
        count: openOrders,
        hint: `${fulfilledOrders} fulfilled`,
      },
      {
        id: "deliveries",
        label: "On the road",
        href: "/sales/deliveries",
        icon: "deliveries",
        count: shipped,
        hint: `${delivered} delivered`,
      },
      {
        id: "invoices",
        label: "Invoices open",
        href: "/sales/invoices",
        icon: "invoices",
        count: openInvoices,
        hint: `${overdueInvoices.length} overdue`,
      },
      {
        id: "payments",
        label: "Payments in",
        href: "/finance/payments",
        icon: "payments",
        count: received.length,
        amount: round2(sum(received, (payment) => payment.amount)),
        hint: `last ${days} days`,
      },
    ];
  }, [
    data.quotations,
    data.salesOrders,
    data.deliveries,
    data.salesInvoices,
    data.payments,
    overdueInvoices.length,
    range,
    days,
  ]);

  const topProducts = useMemo<TopProductRow[]>(() => {
    const byProduct = new Map<string, number>();
    for (const invoice of data.salesInvoices) {
      if (!isActiveSale(invoice) || !inRange(invoice.date, range)) continue;
      for (const line of invoice.lines) {
        byProduct.set(line.productId, round2((byProduct.get(line.productId) ?? 0) + line.lineTotal));
      }
    }
    const nameById = new Map(data.products.map((product) => [product.id, product]));
    const total = round2(sum([...byProduct.values()], (value) => value));
    return topBy(
      [...byProduct.entries()],
      ([, value]) => value,
      5,
    )
      .map(([id, value]) => {
        const product = nameById.get(id);
        return {
          id,
          sku: product?.sku ?? "n/a",
          name: product?.name ?? "Removed product",
          revenue: value,
          share: percentOf(value, total) ?? 0,
        };
      })
      .filter((row) => row.revenue > 0);
  }, [data.salesInvoices, data.products, range]);

  const activity = useMemo(
    () => [...data.auditLog].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, 7),
    [data.auditLog],
  );

  const aging = useMemo(
    () =>
      agingBuckets(
        data.salesInvoices
          .filter((invoice) => isActiveSale(invoice) && invoiceBalance(invoice) > 0)
          .map((invoice) => ({
            date: invoice.date,
            dueDate: invoice.dueDate,
            balance: invoiceBalance(invoice),
          })),
      ),
    [data.salesInvoices],
  );

  return {
    days,
    setDays,
    range,
    revenue: period.revenue,
    collected: period.collected,
    netProfit: period.netProfit,
    grossProfit,
    margin,
    collectionRate,
    invoicesInRange,
    cash,
    cashSeries,
    revenueSeries: revenueSeriesData,
    collectedSeries,
    receivables: balances.receivables,
    payables: balances.payables,
    stockValue: balances.stockValue,
    overdueInvoices,
    overdueAmount,
    alerts,
    outOfStock: alerts.filter((alert) => alert.status === "out_of_stock").length,
    lowStock: alerts.filter((alert) => alert.status === "low_stock").length,
    pendingApprovals,
    pendingLeaves,
    pipeline,
    topProducts,
    activity,
    aging,
  };
}

