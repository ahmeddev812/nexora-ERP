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
  isActiveSale,
} from "@/lib/calculations";
import { agingBucket, formatDate, todayKey, type AgingBucket } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { SalesInvoice } from "@/types/erp";

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
  invoice: SalesInvoice;
  balance: number;
  bucket: AgingBucket;
  daysOverdue: number;
}

export default function ReceivablesPage() {
  const data = useERPData();
  const [customerFilter, setCustomerFilter] = useState("all");
  const [bucketFilter, setBucketFilter] = useState("all");

  const customerById = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  );
  const asOf = todayKey();

  const rows = useMemo<AgingRow[]>(() => {
    const list: AgingRow[] = [];
    for (const invoice of data.salesInvoices) {
      if (!isActiveSale(invoice)) continue;
      const status = effectiveInvoiceStatus(invoice, asOf);
      if (status === "void" || status === "refunded") continue;
      const balance = invoiceBalance(invoice);
      if (balance <= 0) continue;
      const due = invoice.dueDate || invoice.date;
      const bucket = agingBucket(due, asOf);
      const days = Math.max(
        0,
        Math.round(
          (new Date(`${asOf}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) /
            86400000,
        ),
      );
      list.push({ invoice, balance, bucket, daysOverdue: due < asOf ? days : 0 });
    }
    return list
      .filter((row) => {
        if (customerFilter !== "all" && row.invoice.customerId !== customerFilter) return false;
        if (bucketFilter !== "all" && row.bucket !== bucketFilter) return false;
        return true;
      })
      .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate));
  }, [data.salesInvoices, customerFilter, bucketFilter, asOf]);

  const summary = useMemo(
    () =>
      agingBuckets(
        rows.map((row) => ({
          date: row.invoice.date,
          dueDate: row.invoice.dueDate || row.invoice.date,
          balance: row.balance,
        })),
        asOf,
      ),
    [rows, asOf],
  );

  const columns: Array<DataTableColumn<AgingRow>> = [
    {
      key: "number",
      header: "Invoice",
      value: (row) => row.invoice.number,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">{row.invoice.number}</span>
      ),
      mono: true,
      width: "110px",
    },
    {
      key: "customer",
      header: "Customer",
      value: (row) => customerById.get(row.invoice.customerId)?.name ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {customerById.get(row.invoice.customerId)?.name ?? "Unknown customer"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            Issued {formatDate(row.invoice.date, "us")}
          </span>
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due",
      value: (row) => row.invoice.dueDate,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatDate(row.invoice.dueDate, "us")}
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
          {formatMoney(row.balance, row.invoice.currency, 2)}
        </span>
      ),
      mono: true,
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by customer"
        className="w-auto min-w-[160px]"
        value={customerFilter}
        onChange={(event) => setCustomerFilter(event.target.value)}
        options={[
          { value: "all", label: "All customers" },
          ...data.customers.map((customer) => ({ value: customer.id, label: customer.name })),
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
        title="Receivables"
        description="Open customer invoices aged against their due date as of today."
      />

      <SummaryStrip
        items={agingBucketKeys().map((bucket) => ({
          label: BUCKET_LABEL[bucket],
          value: formatMoney(summary.buckets[bucket], "", 0),
          tone: bucket === "0-30" ? "default" : summary.buckets[bucket] > 0 ? "accent" : "default",
          hint: `${summary.counts[bucket]} invoice${summary.counts[bucket] === 1 ? "" : "s"}`,
        }))}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <p className="text-[13.5px] text-ink">
          Outstanding {formatMoney(summary.total, "", 2)} across {rows.length} open invoice
          {rows.length === 1 ? "" : "s"}
        </p>
        <p className="text-[13.5px] text-destructive">
          Overdue {formatMoney(summary.overdue, "", 2)}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.invoice.id}
        searchPlaceholder="Search invoice or customer"
        searchValue={(row) =>
          `${row.invoice.number} ${customerById.get(row.invoice.customerId)?.name ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="Nothing outstanding"
        emptyDescription="Every open invoice has been collected."
        pageSize={12}
        exportName="receivables-aging"
        caption="Receivables aging"
      />
    </AppShell>
  );
}
