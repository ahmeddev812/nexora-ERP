"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { agingBucketKeys } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { DashboardModel, OverdueRow } from "@/hooks/useDashboardModel";

const BUCKET_TONE = {
  "0-30": "primary",
  "31-60": "accent",
  "61-90": "warning",
  "90+": "destructive",
} as const;

const money = (value: number) => formatMoney(value, "", 0);

interface AgingPanelProps {
  model: DashboardModel;
}

export function AgingPanel({ model }: AgingPanelProps) {
  const router = useRouter();
  const total = model.aging.total;

  const columns: Array<DataTableColumn<OverdueRow>> = [
    {
      key: "invoice",
      header: "Invoice",
      value: (row) => row.invoice.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.invoice.number}</span>,
      mono: true,
    },
    {
      key: "customer",
      header: "Customer",
      value: (row) => row.customerName,
      render: (row) => <span className="block truncate text-[13px] text-ink">{row.customerName}</span>,
    },
    {
      key: "due",
      header: "Due date",
      value: (row) => row.invoice.dueDate,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(row.invoice.dueDate, "us")}</span>
      ),
      hideBelow: "md",
    },
    {
      key: "days",
      header: "Days late",
      align: "right",
      value: (row) => row.daysOverdue,
      render: (row) => (
        <Badge tone={row.daysOverdue > 30 ? "destructive" : "warning"}>{row.daysOverdue}d</Badge>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      value: (row) => row.balance,
      render: (row) => <span className="numeric text-[13px] text-ink">{money(row.balance)}</span>,
      mono: true,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-4">
        <CardHeader title="Receivables aging" description="Open balances by age, as of today." />

        <div className="flex flex-col gap-3.5">
          {agingBucketKeys().map((bucket) => {
            const amount = model.aging.buckets[bucket];
            const share = total > 0 ? (amount / total) * 100 : 0;
            return (
              <ProgressBar
                key={bucket}
                value={share}
                max={100}
                tone={BUCKET_TONE[bucket]}
                size="sm"
                label={bucket === "0-30" ? "0 to 30 days" : `${bucket} days`}
                hint={`${money(amount)} · ${model.aging.counts[bucket]} open`}
              />
            );
          })}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-input border border-line bg-line">
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Open</dt>
            <dd className="numeric mt-1 text-[15px] text-ink">{money(total)}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Past due</dt>
            <dd className="numeric mt-1 text-[15px] text-destructive">{money(model.aging.overdue)}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Payables</dt>
            <dd className="numeric mt-1 text-[15px] text-ink">{money(model.payables)}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Stock value</dt>
            <dd className="numeric mt-1 text-[15px] text-ink">{money(model.stockValue)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
          Payables and stock value are balance sheet positions, not part of the aging total.
        </p>
      </Card>

      <div className="min-w-0 lg:col-span-8">
        <DataTable
          columns={columns}
          rows={model.overdueInvoices}
          rowKey={(row) => row.invoice.id}
          onRowClick={() => router.push("/sales/invoices")}
          searchPlaceholder="Search customer or invoice"
          searchValue={(row) => `${row.customerName} ${row.invoice.number}`}
          emptyTitle="No overdue invoices"
          emptyDescription="Every open invoice is still inside its due date."
          caption="Invoices past their due date, oldest first."
          pageSize={6}
          exportName="overdue-invoices"
        />
      </div>
    </div>
  );
}
