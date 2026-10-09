"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { PaymentForm } from "@/components/finance/PaymentForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Payment } from "@/types/erp";

const STATUS_LABEL: Record<Payment["status"], string> = {
  pending: "Pending",
  cleared: "Cleared",
  void: "Void",
};

const STATUS_TONE: Record<Payment["status"], BadgeTone> = {
  pending: "warning",
  cleared: "success",
  void: "neutral",
};

export default function FinancePaymentsPage() {
  const data = useERPData();
  const [formOpen, setFormOpen] = useState(false);
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { paymentAllocations } = data;

  const allocationsByPayment = useMemo(() => {
    const map = new Map<string, typeof paymentAllocations>();
    for (const allocation of paymentAllocations) {
      const list = map.get(allocation.paymentId) ?? [];
      list.push(allocation);
      map.set(allocation.paymentId, list);
    }
    return map;
  }, [paymentAllocations]);

  const rows = useMemo(() => {
    const list = [...data.payments].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return list.filter((row) => {
      if (directionFilter !== "all" && row.direction !== directionFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
  }, [data.payments, directionFilter, statusFilter]);

  const metrics = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    for (const payment of data.payments) {
      if (payment.status === "void") continue;
      if (payment.direction === "inbound") inbound += payment.amount;
      else outbound += payment.amount;
    }
    return {
      count: data.payments.length,
      inbound: round2(inbound),
      outbound: round2(outbound),
      net: round2(inbound - outbound),
    };
  }, [data.payments]);

  const columns: Array<DataTableColumn<Payment>> = [
    {
      key: "number",
      header: "Payment",
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
      key: "party",
      header: "Party",
      value: (row) => row.partyName,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">{row.partyName}</span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {(allocationsByPayment.get(row.id) ?? [])
              .map((allocation) => allocation.targetNumber)
              .join(", ") || "On account"}
          </span>
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      value: (row) => row.method,
      render: (row) => <span className="text-[13px] text-ink-muted">{methodLabel(row.method)}</span>,
      hideBelow: "lg",
    },
    {
      key: "direction",
      header: "Flow",
      value: (row) => row.direction,
      render: (row) => (
        <Badge tone={row.direction === "inbound" ? "success" : "warning"}>
          {row.direction === "inbound" ? "Receipt" : "Payment"}
        </Badge>
      ),
      hideBelow: "md",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      value: (row) => row.amount,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">
          {formatMoney(row.amount, row.currency, 2)}
        </span>
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
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by direction"
        className="w-auto min-w-[150px]"
        value={directionFilter}
        onChange={(event) => setDirectionFilter(event.target.value)}
        options={[
          { value: "all", label: "Receipts and payments" },
          { value: "inbound", label: "Receipts only" },
          { value: "outbound", label: "Payments only" },
        ]}
      />
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[130px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          { value: "cleared", label: "Cleared" },
          { value: "pending", label: "Pending" },
          { value: "void", label: "Void" },
        ]}
      />
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Customer receipts and supplier payments, allocated to invoices and bills."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => setFormOpen(true)}
          >
            New payment
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Receipts in", value: formatMoney(metrics.inbound, "", 0), hint: "From customers" },
          { label: "Paid out", value: formatMoney(metrics.outbound, "", 0), hint: "To suppliers" },
          {
            label: "Net cash",
            value: formatMoney(metrics.net, "", 0),
            tone: metrics.net >= 0 ? "success" : "destructive",
            hint: "In less out",
          },
          { label: "Payments", value: String(metrics.count), hint: "All time" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, party or reference"
        searchValue={(row) => `${row.number} ${row.partyName} ${row.reference ?? ""}`}
        toolbar={toolbar}
        emptyTitle="No payments yet"
        emptyDescription="Record a receipt or a payment and it posts straight to cash."
        pageSize={12}
        exportName="payments"
        caption="Payments"
      />

      {formOpen ? <PaymentForm onClose={() => setFormOpen(false)} /> : null}
    </AppShell>
  );
}

function methodLabel(method: Payment["method"]): string {
  const labels: Record<Payment["method"], string> = {
    cash: "Cash",
    bank_transfer: "Bank transfer",
    card: "Card",
    cheque: "Cheque",
    other: "Other",
  };
  return labels[method];
}
