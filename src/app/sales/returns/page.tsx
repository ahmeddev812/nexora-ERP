"use client";

import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { ReturnForm } from "@/components/sales/ReturnForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { CustomerReturn } from "@/types/erp";

type ReturnStatus = CustomerReturn["status"];

const STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  received: "Received",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<ReturnStatus, BadgeTone> = {
  pending: "warning",
  approved: "info",
  received: "success",
  rejected: "destructive",
  cancelled: "neutral",
};

type Pending = { kind: "approve" | "reject"; record: CustomerReturn };

export default function SalesReturnsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const customerById = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  );
  const invoiceById = useMemo(
    () => new Map(data.salesInvoices.map((invoice) => [invoice.id, invoice])),
    [data.salesInvoices],
  );
  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const rows = useMemo(() => {
    const list = [...data.customerReturns].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return statusFilter === "all"
      ? list
      : list.filter((row) => row.status === statusFilter);
  }, [data.customerReturns, statusFilter]);

  const metrics = useMemo(() => {
    const received = data.customerReturns.filter((row) => row.status === "received");
    return {
      count: data.customerReturns.length,
      pending: data.customerReturns.filter((row) => row.status === "pending").length,
      received: received.length,
      value: received.reduce((acc, row) => acc + row.total, 0),
    };
  }, [data.customerReturns]);

  const approve = (record: CustomerReturn) => {
    for (const line of record.lines) {
      const product = productById.get(line.productId);
      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: record.warehouseId,
        quantity: line.quantity,
        type: "return_in",
        refType: "customer_return",
        refId: record.id,
        refNumber: record.number,
        date: record.date,
        unitCost: product?.costPrice,
        notes: record.reason,
      });
    }

    if (record.total > 0) {
      const returns = data.accounts.find((account) => account.code === "4100");
      const cash = data.accounts.find((account) => account.code === "1010");
      const receivable = data.accounts.find((account) => account.code === "1100");
      const counterparty = record.refundMethod === "cash_refund" ? cash : receivable;
      if (returns && counterparty) {
        actions.postJournal({
          date: record.date,
          memo:
            record.refundMethod === "cash_refund"
              ? `Cash refund ${record.number}`
              : `Credit note ${record.number}`,
          refType: "customer_return",
          refId: record.id,
          refNumber: record.number,
          lines: [
            { accountId: returns.id, debit: record.total, credit: 0 },
            { accountId: counterparty.id, debit: 0, credit: record.total },
          ],
        });
      } else {
        toast.warning(
          "No return entry posted",
          "The chart of accounts is missing account 4100, 1010 or 1100.",
        );
      }
    }

    actions.updateRecord(
      "customerReturns",
      record.id,
      { status: "received" },
      { summary: `Received return ${record.number} into stock` },
    );
    toast.success("Return received", `${record.number} stock re-entered the warehouse`);
    setPending(null);
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "approve") {
      approve(pending.record);
      return;
    }
    actions.updateRecord(
      "customerReturns",
      pending.record.id,
      { status: "rejected" },
      { summary: `Rejected return ${pending.record.number}` },
    );
    toast.info("Return rejected", pending.record.number);
    setPending(null);
  };

  const columns: Array<DataTableColumn<CustomerReturn>> = [
    {
      key: "number",
      header: "Return",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "date",
      header: "Date",
      value: (row) => row.date,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>
      ),
      hideBelow: "md",
    },
    {
      key: "customer",
      header: "Customer",
      value: (row) => customerById.get(row.customerId)?.name ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {customerById.get(row.customerId)?.name ?? "Unknown customer"}
          </span>
          <span className="numeric block text-[11.5px] text-ink-faint">
            {row.invoiceId ? invoiceById.get(row.invoiceId)?.number ?? "No invoice" : "No invoice"}
          </span>
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      value: (row) => row.reason,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13px] text-ink-muted">{row.reason}</span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {row.refundMethod === "cash_refund" ? "Cash refund" : "Credit note"}
          </span>
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: (row) => row.total,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">{formatMoney(row.total, "", 2)}</span>
      ),
      mono: true,
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => (
        <Badge tone={STATUS_TONE[row.status]} dot>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) =>
        row.status === "pending" ? (
          <span className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-label={`Approve ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPending({ kind: "approve", record: row });
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-success hover:text-success"
            >
              <Check size={13} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label={`Reject ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPending({ kind: "reject", record: row });
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </span>
        ) : null,
    },
  ];

  const copy = (() => {
    if (!pending) return { title: "", message: "", label: "", destructive: false };
    if (pending.kind === "approve") {
      return {
        title: "Receive return?",
        message: `${pending.record.number} puts ${pending.record.lines.length} line${pending.record.lines.length === 1 ? "" : "s"} back into stock and posts the ${pending.record.refundMethod === "cash_refund" ? "cash refund" : "credit note"}.`,
        label: "Receive",
        destructive: false,
      };
    }
    return {
      title: "Reject return?",
      message: `${pending.record.number} is rejected. No stock and no ledger entry.`,
      label: "Reject",
      destructive: true,
    };
  })();

  return (
    <AppShell>
      <PageHeader
        title="Customer returns"
        description="Goods coming back from customers, inspected before stock re-enters the warehouse."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => setFormOpen(true)}
          >
            New return
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Returns", value: String(metrics.count) },
          {
            label: "Awaiting approval",
            value: String(metrics.pending),
            tone: metrics.pending > 0 ? "accent" : "default",
            hint: "Pending review",
          },
          { label: "Received", value: String(metrics.received), tone: "success", hint: "Back in stock" },
          { label: "Refunded value", value: formatMoney(metrics.value, "", 0), hint: "Received returns" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, customer, invoice or reason"
        searchValue={(row) =>
          `${row.number} ${customerById.get(row.customerId)?.name ?? ""} ${
            row.invoiceId ? invoiceById.get(row.invoiceId)?.number ?? "" : ""
          } ${row.reason}`
        }
        toolbar={
          <Select
            aria-label="Filter by status"
            className="w-auto min-w-[140px]"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: "all", label: "All statuses" },
              ...(Object.keys(STATUS_LABEL) as ReturnStatus[]).map((status) => ({
                value: status,
                label: STATUS_LABEL[status],
              })),
            ]}
          />
        }
        emptyTitle="No returns yet"
        emptyDescription="Raise a return against an invoice, then receive it into stock."
        pageSize={12}
        exportName="sales-returns"
        caption="Customer returns"
        emptyAction={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            New return
          </Button>
        }
      />

      {formOpen ? <ReturnForm onClose={() => setFormOpen(false)} /> : null}

      <ConfirmDialog
        open={pending !== null}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.label}
        destructive={copy.destructive}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
