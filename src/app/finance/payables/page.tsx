"use client";

import { useMemo, useState } from "react";

import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useERPData } from "@/hooks/useERPData";
import {
  agingBucketKeys,
  agingBuckets,
  effectiveInvoiceStatus,
  invoiceBalance,
  isActiveBill,
} from "@/lib/calculations";
import { agingBucket, formatDate, todayKey, type AgingBucket } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { SupplierBill } from "@/types/erp";

const BUCKET_LABEL: Record<AgingBucket, string> = {
  "0-30": "0 to 30 days",
  "31-60": "31 to 60 days",
  "61-90": "61 to 90 days",
  "90+": "Over 90 days",
};

const BUCKET_TONE: Record<AgingBucket, BadgeTone> = {
  "0-30": "info",
  "31-60": "warning",
  "61-90": "accent",
  "90+": "destructive",
};

interface AgingRow {
  bill: SupplierBill;
  balance: number;
  bucket: AgingBucket;
  daysOverdue: number;
}

export default function PayablesPage() {
  const data = useERPData();
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");

  const supplierById = useMemo(
    () => new Map(data.suppliers.map((supplier) => [supplier.id, supplier])),
    [data.suppliers],
  );
  const asOf = todayKey();

  const rows = useMemo<AgingRow[]>(() => {
    const list: AgingRow[] = [];
    for (const bill of data.supplierBills) {
      if (!isActiveBill(bill)) continue;
      const status = effectiveInvoiceStatus(bill, asOf);
      if (status === "void" || status === "refunded") continue;
      const balance = invoiceBalance(bill);
      if (balance <= 0) continue;
      const due = bill.dueDate || bill.date;
      const bucket = agingBucket(due, asOf);
      const days = Math.max(
        0,
        Math.round(
          (new Date(`${asOf}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) /
            86400000,
        ),
      );
      list.push({ bill, balance, bucket, daysOverdue: due < asOf ? days : 0 });
    }
    return list
      .filter((row) => {
        if (supplierFilter !== "all" && row.bill.supplierId !== supplierFilter) return false;
        if (bucketFilter !== "all" && row.bucket !== bucketFilter) return false;
        return true;
      })
      .sort((a, b) => a.bill.dueDate.localeCompare(b.bill.dueDate));
  }, [data.supplierBills, supplierFilter, bucketFilter, asOf]);

  const summary = useMemo(
    () =>
      agingBuckets(
        rows.map((row) => ({
          date: row.bill.date,
          dueDate: row.bill.dueDate || row.bill.date,
          balance: row.balance,
        })),
        asOf,
      ),
    [rows, asOf],
  );

  const columns: Array<DataTableColumn<AgingRow>> = [
    {
      key: "number",
      header: "Bill",
      value: (row) => row.bill.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.bill.number}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "supplier",
      header: "Supplier",
      value: (row) => supplierById.get(row.bill.supplierId)?.name ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {supplierById.get(row.bill.supplierId)?.name ?? "Unknown supplier"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            Issued {formatDate(row.bill.date, "us")}
          </span>
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due",
      value: (row) => row.bill.dueDate,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatDate(row.bill.dueDate, "us")}
        </span>
      ),
      hideBelow: "md",
    },
    {
      key: "days",
      header: "Days overdue",
      align: "right",
      value: (row) => row.daysOverdue,
      render: (row) => (
        <span
          className={`numeric text-[13px] ${row.daysOverdue > 0 ? "text-destructive" : "text-ink-faint"}`}
        >
          {row.daysOverdue > 0 ? row.daysOverdue : "Current"}
        </span>
      ),
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "bucket",
      header: "Bucket",
      value: (row) => row.bucket,
      render: (row) => <Badge tone={BUCKET_TONE[row.bucket]}>{BUCKET_LABEL[row.bucket]}</Badge>,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      value: (row) => row.balance,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">
          {formatMoney(row.balance, row.bill.currency, 2)}
        </span>
      ),
      mono: true,
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by supplier"
        className="w-auto min-w-[160px]"
        value={supplierFilter}
        onChange={(event) => setSupplierFilter(event.target.value)}
        options={[
          { value: "all", label: "All suppliers" },
          ...data.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
        ]}
      />
      <Select
        aria-label="Filter by aging bucket"
        className="w-auto min-w-[160px]"
        value={bucketFilter}
        onChange={(event) => setBucketFilter(event.target.value)}
        options={[
          { value: "all", label: "All buckets" },
          ...agingBucketKeys().map((bucket) => ({ value: bucket, label: BUCKET_LABEL[bucket] })),
        ]}
      />
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Payables"
        description="Open supplier bills aged against their due date as of today."
      />

      <SummaryStrip
        items={agingBucketKeys().map((bucket) => ({
          label: BUCKET_LABEL[bucket],
          value: formatMoney(summary.buckets[bucket], "", 0),
          tone: bucket === "0-30" ? "default" : summary.buckets[bucket] > 0 ? "accent" : "default",
          hint: `${summary.counts[bucket]} bill${summary.counts[bucket] === 1 ? "" : "s"}`,
        }))}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <p className="text-[13.5px] text-ink">
          Owed {formatMoney(summary.total, "", 2)} across {rows.length} open bill
          {rows.length === 1 ? "" : "s"}
        </p>
        <p className="text-[13.5px] text-destructive">
          Overdue {formatMoney(summary.overdue, "", 2)}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.bill.id}
        searchPlaceholder="Search bill or supplier"
        searchValue={(row) =>
          `${row.bill.number} ${supplierById.get(row.bill.supplierId)?.name ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="Nothing outstanding"
        emptyDescription="Every open supplier bill has been settled."
        pageSize={12}
        exportName="payables-aging"
        caption="Payables aging"
      />
    </AppShell>
  );
}
