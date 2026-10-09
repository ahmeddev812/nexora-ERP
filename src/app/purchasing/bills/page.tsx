"use client";

import { useMemo, useState } from "react";
import { Banknote } from "lucide-react";

import { BillForm } from "@/components/purchasing/BillForm";
import { PaySupplierModal } from "@/components/purchasing/PaySupplierModal";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useERPData } from "@/hooks/useERPData";
import { effectiveInvoiceStatus, invoiceBalance } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { InvoiceStatus, SupplierBill } from "@/types/erp";

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
  refunded: "neutral",
};

export default function SupplierBillsPage() {
  const data = useERPData();

  const [formOpen, setFormOpen] = useState(false);
  const [paying, setPaying] = useState<SupplierBill | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const supplierById = useMemo(
    () => new Map(data.suppliers.map((supplier) => [supplier.id, supplier])),
    [data.suppliers],
  );

  const withStatus = useMemo(
    () =>
      data.supplierBills.map((bill) => ({ bill, status: effectiveInvoiceStatus(bill) })),
    [data.supplierBills],
  );

  const rows = useMemo(
    () =>
      [...withStatus]
        .sort((a, b) => b.bill.date.localeCompare(a.bill.date))
        .filter((entry) => {
          if (statusFilter !== "all" && entry.status !== statusFilter) return false;
          if (supplierFilter !== "all" && entry.bill.supplierId !== supplierFilter) return false;
          return true;
        }),
    [withStatus, statusFilter, supplierFilter],
  );

  const metrics = useMemo(() => {
    let billed = 0;
    let outstanding = 0;
    let overdue = 0;
    for (const { bill, status } of withStatus) {
      billed += bill.total;
      const balance = invoiceBalance(bill);
      outstanding += balance;
      if (status === "overdue") overdue += balance;
    }
    return { count: withStatus.length, billed, outstanding, overdue };
  }, [withStatus]);

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const columns: Array<DataTableColumn<{ bill: SupplierBill; status: InvoiceStatus }>> = [
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
            {row.bill.receiptId ? "Receipt sourced" : "Order sourced"}
          </span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      value: (row) => row.bill.date,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatDate(row.bill.date, "us")}
        </span>
      ),
      hideBelow: "md",
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
      hideBelow: "lg",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: (row) => row.bill.total,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">
          {formatMoney(row.bill.total, row.bill.currency, 2)}
        </span>
      ),
      mono: true,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      value: (row) => invoiceBalance(row.bill),
      render: (row) => {
        const balance = invoiceBalance(row.bill);
        return (
          <span
            className={`numeric text-[13px] ${balance > 0 ? "text-ink" : "text-ink-faint"}`}
          >
            {formatMoney(balance, row.bill.currency, 2)}
          </span>
        );
      },
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
        invoiceBalance(row.bill) > 0 ? (
          <span className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-label={`Pay ${row.bill.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPaying(row.bill);
              }}
              className={`${iconClass} hover:border-success hover:text-success`}
            >
              <Banknote size={13} strokeWidth={1.5} />
            </button>
          </span>
        ) : (
          <span className="text-[12px] text-ink-faint">Settled</span>
        ),
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[150px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          ...(Object.keys(STATUS_LABEL) as InvoiceStatus[])
            .filter((status) => withStatus.some((entry) => entry.status === status))
            .map((status) => ({ value: status, label: STATUS_LABEL[status] })),
        ]}
      />
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
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Supplier bills"
        description="Payables with partial payments and overdue detection against the due date."
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            New bill
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Bills", value: String(metrics.count), hint: "All time" },
          { label: "Billed", value: formatMoney(metrics.billed, "", 0), hint: "Gross value" },
          {
            label: "Outstanding",
            value: formatMoney(metrics.outstanding, "", 0),
            tone: metrics.outstanding > 0 ? "accent" : "default",
            hint: "Still owed",
          },
          {
            label: "Overdue",
            value: formatMoney(metrics.overdue, "", 0),
            tone: metrics.overdue > 0 ? "destructive" : "default",
            hint: "Past due date",
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.bill.id}
        searchPlaceholder="Search bill number or supplier"
        searchValue={(row) =>
          `${row.bill.number} ${supplierById.get(row.bill.supplierId)?.name ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No supplier bills yet"
        emptyDescription="Bill a goods receipt or an open purchase order, then settle it here."
        pageSize={12}
        exportName="supplier-bills"
        caption="Supplier bills"
      />

      {formOpen ? <BillForm onClose={() => setFormOpen(false)} /> : null}
      {paying ? <PaySupplierModal bill={paying} onClose={() => setPaying(null)} /> : null}
    </AppShell>
  );
}
