"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { InvoiceForm } from "@/components/sales/InvoiceForm";
import { RecordPaymentModal } from "@/components/sales/RecordPaymentModal";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useERPData } from "@/hooks/useERPData";
import {
  effectiveInvoiceStatus,
  invoiceBalance,
  isActiveSale,
  round2,
} from "@/lib/calculations";
import { formatDate, isOverdue, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { InvoiceStatus, SalesInvoice } from "@/types/erp";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  partial: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  refunded: "Refunded",
};

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: "neutral",
  issued: "info",
  partial: "warning",
  paid: "success",
  overdue: "destructive",
  void: "neutral",
  refunded: "accent",
};

export default function SalesInvoicesPage() {
  const data = useERPData();
  const router = useRouter();

  const [formOpen, setFormOpen] = useState(false);
  const [paying, setPaying] = useState<SalesInvoice | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  const customerById = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  );
  const today = todayKey();

  const view = useMemo(
    () =>
      data.salesInvoices
        .map((invoice) => ({ invoice, status: effectiveInvoiceStatus(invoice, today) }))
        .sort((a, b) =>
          a.invoice.date === b.invoice.date
            ? b.invoice.createdAt.localeCompare(a.invoice.createdAt)
            : b.invoice.date.localeCompare(a.invoice.date),
        ),
    [data.salesInvoices, today],
  );

  const rows = useMemo(
    () =>
      view.filter(({ invoice, status }) => {
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (customerFilter !== "all" && invoice.customerId !== customerFilter) return false;
        return true;
      }),
    [view, statusFilter, customerFilter],
  );

  const metrics = useMemo(() => {
    const active = data.salesInvoices.filter((invoice) => isActiveSale(invoice));
    const invoiced = round2(active.reduce((acc, invoice) => acc + invoice.total, 0));
    const collected = round2(active.reduce((acc, invoice) => acc + invoice.paidAmount, 0));
    const outstanding = round2(active.reduce((acc, invoice) => acc + invoiceBalance(invoice), 0));
    const overdue = active.filter(
      (invoice) =>
        invoiceBalance(invoice) > 0 && isOverdue(invoice.dueDate, today),
    ).length;
    return { invoiced, collected, outstanding, overdue };
  }, [data.salesInvoices, today]);

  const columns: Array<DataTableColumn<{ invoice: SalesInvoice; status: InvoiceStatus }>> = [
    {
      key: "number",
      header: "Invoice",
      value: ({ invoice }) => invoice.number,
      render: ({ invoice }) => <span className="numeric text-[13px] text-ink">{invoice.number}</span>,
      mono: true,
      width: "115px",
    },
    {
      key: "customer",
      header: "Customer",
      value: ({ invoice }) => customerById.get(invoice.customerId)?.name ?? "",
      render: ({ invoice }) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {customerById.get(invoice.customerId)?.name ?? "Unknown customer"}
          </span>
          <span className="numeric block text-[11.5px] text-ink-faint">
            {customerById.get(invoice.customerId)?.code ?? ""}
          </span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Issued",
      value: ({ invoice }) => invoice.date,
      render: ({ invoice }) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(invoice.date, "us")}</span>
      ),
      hideBelow: "md",
    },
    {
      key: "dueDate",
      header: "Due",
      value: ({ invoice }) => invoice.dueDate,
      render: ({ invoice }) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatDate(invoice.dueDate, "us")}
        </span>
      ),
      hideBelow: "md",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: ({ invoice }) => invoice.total,
      render: ({ invoice }) => (
        <span className="numeric text-[13px] text-ink">
          {formatMoney(invoice.total, invoice.currency, 2)}
        </span>
      ),
      mono: true,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      value: ({ invoice }) => invoiceBalance(invoice),
      render: ({ invoice }) => {
        const balance = invoiceBalance(invoice);
        return (
          <span
            className={
              balance > 0 ? "numeric text-[13px] text-ink" : "numeric text-[13px] text-ink-faint"
            }
          >
            {formatMoney(balance, invoice.currency, 2)}
          </span>
        );
      },
      mono: true,
    },
    {
      key: "status",
      header: "Status",
      value: ({ status }) => status,
      render: ({ status }) => (
        <Badge tone={STATUS_TONE[status]} dot>
          {STATUS_LABEL[status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: ({ invoice, status }) => (
        <span className="flex items-center justify-end gap-1.5">
          {invoiceBalance(invoice) > 0 &&
          status !== "void" &&
          status !== "refunded" ? (
            <button
              type="button"
              aria-label={`Receive payment for ${invoice.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPaying(invoice);
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-success hover:text-success"
            >
              <Wallet size={13} strokeWidth={1.5} />
            </button>
          ) : null}
          <Link
            href={`/sales/invoices/${invoice.id}`}
            aria-label={`Open ${invoice.number}`}
            onClick={(event) => event.stopPropagation()}
            className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Printer size={13} strokeWidth={1.5} />
          </Link>
        </span>
      ),
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[140px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          ...(Object.keys(STATUS_LABEL) as InvoiceStatus[])
            .filter((status) => status !== "draft")
            .map((status) => ({ value: status, label: STATUS_LABEL[status] })),
        ]}
      />
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
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Sales invoices"
        description="Raise invoices from orders or deliveries, then collect them in part or in full."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => setFormOpen(true)}
          >
            New invoice
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Invoiced", value: formatMoney(metrics.invoiced, "", 0), hint: "Active invoices" },
          { label: "Collected", value: formatMoney(metrics.collected, "", 0), tone: "success", hint: "Receipts applied" },
          {
            label: "Outstanding",
            value: formatMoney(metrics.outstanding, "", 0),
            tone: metrics.outstanding > 0 ? "accent" : "default",
            hint: "Still receivable",
          },
          {
            label: "Overdue",
            value: String(metrics.overdue),
            tone: metrics.overdue > 0 ? "destructive" : "default",
            hint: "Past the due date",
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={({ invoice }) => invoice.id}
        onRowClick={({ invoice }) => router.push(`/sales/invoices/${invoice.id}`)}
        searchPlaceholder="Search number, customer or notes"
        searchValue={({ invoice }) =>
          `${invoice.number} ${customerById.get(invoice.customerId)?.name ?? ""} ${invoice.notes ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No invoices yet"
        emptyDescription="Issue an invoice from an approved order or a delivered shipment."
        pageSize={12}
        exportName="sales-invoices"
        caption="Sales invoices"
        emptyAction={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            New invoice
          </Button>
        }
      />

      {formOpen ? <InvoiceForm onClose={() => setFormOpen(false)} /> : null}
      {paying ? <RecordPaymentModal invoice={paying} onClose={() => setPaying(null)} /> : null}
    </AppShell>
  );
}
