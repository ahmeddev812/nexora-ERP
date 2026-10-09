"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, Truck, X } from "lucide-react";

import { PurchaseReturnForm } from "@/components/purchasing/PurchaseReturnForm";
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
import type { PurchaseReturn } from "@/types/erp";

type ReturnStatus = PurchaseReturn["status"];

const STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  shipped: "Shipped",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<ReturnStatus, BadgeTone> = {
  pending: "warning",
  approved: "info",
  shipped: "success",
  rejected: "destructive",
  cancelled: "neutral",
};

type Pending =
  | { kind: "approve" | "ship" | "reject" | "cancel"; record: PurchaseReturn }
  | { kind: "delete"; record: PurchaseReturn };

export default function PurchaseReturnsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseReturn | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const supplierById = useMemo(
    () => new Map(data.suppliers.map((supplier) => [supplier.id, supplier])),
    [data.suppliers],
  );
  const warehouseById = useMemo(
    () => new Map(data.warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [data.warehouses],
  );
  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const rows = useMemo(() => {
    const list = [...data.purchaseReturns].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return list.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (supplierFilter !== "all" && row.supplierId !== supplierFilter) return false;
      return true;
    });
  }, [data.purchaseReturns, statusFilter, supplierFilter]);

  const metrics = useMemo(() => ({
    count: data.purchaseReturns.length,
    pending: data.purchaseReturns.filter((row) => row.status === "pending").length,
    shipped: data.purchaseReturns.filter((row) => row.status === "shipped").length,
    value: data.purchaseReturns
      .filter((row) => row.status === "shipped" || row.status === "approved")
      .reduce((acc, row) => acc + row.total, 0),
  }), [data.purchaseReturns]);

  const shipReturn = (record: PurchaseReturn) => {
    for (const line of record.lines) {
      const product = productById.get(line.productId);
      if (!product?.trackStock) continue;
      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: record.warehouseId,
        quantity: -line.quantity,
        type: "return_out",
        refType: "purchase_return",
        refId: record.id,
        refNumber: record.number,
        date: record.date,
        unitCost: line.unitPrice,
        notes: record.reason,
      });
    }

    const payable = data.accounts.find((account) => account.code === "2000");
    const inventory = data.accounts.find((account) => account.code === "1200");
    const taxReceivable = data.accounts.find((account) => account.code === "1150");
    const entryLines = [] as { accountId: string; debit: number; credit: number }[];
    if (payable) entryLines.push({ accountId: payable.id, debit: record.total, credit: 0 });
    if (inventory) entryLines.push({ accountId: inventory.id, debit: 0, credit: record.subtotal });
    if (taxReceivable && record.taxTotal > 0) {
      entryLines.push({ accountId: taxReceivable.id, debit: 0, credit: record.taxTotal });
    }

    if (entryLines.length >= 2) {
      actions.postJournal({
        date: record.date,
        memo: `Supplier return ${record.number}`,
        refType: "purchase_return",
        refId: record.id,
        refNumber: record.number,
        lines: entryLines,
      });
    } else {
      toast.warning(
        "No payables entry posted",
        "The chart of accounts is missing account 1200, 1150 or 2000.",
      );
    }
  };

  const confirm = () => {
    if (!pending) return;
    const { record } = pending;

    if (pending.kind === "delete") {
      actions.deleteRecord("purchaseReturns", record.id, {
        summary: `Deleted supplier return ${record.number}`,
      });
      toast.success("Return deleted", record.number);
      setPending(null);
      return;
    }

    if (pending.kind === "approve") {
      actions.updateRecord(
        "purchaseReturns",
        record.id,
        { status: "approved" },
        { summary: `Approved supplier return ${record.number}` },
      );
      toast.success("Return approved", `${record.number} is ready to ship`);
      setPending(null);
      return;
    }

    if (pending.kind === "ship") {
      shipReturn(record);
      actions.updateRecord(
        "purchaseReturns",
        record.id,
        { status: "shipped" },
        { summary: `Shipped supplier return ${record.number}` },
      );
      toast.success("Return shipped", `${record.number} stock left the warehouse`);
      setPending(null);
      return;
    }

    if (pending.kind === "reject") {
      actions.updateRecord(
        "purchaseReturns",
        record.id,
        { status: "rejected" },
        { summary: `Rejected supplier return ${record.number}` },
      );
      toast.info("Return rejected", record.number);
      setPending(null);
      return;
    }

    actions.updateRecord(
      "purchaseReturns",
      record.id,
      { status: "cancelled" },
      { summary: `Cancelled supplier return ${record.number}` },
    );
    toast.info("Return cancelled", record.number);
    setPending(null);
  };

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const renderActions = (row: PurchaseReturn) => {
    const buttons: React.ReactNode[] = [];
    if (row.status === "pending") {
      buttons.push(
        <button
          key="approve"
          type="button"
          aria-label={`Approve ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "approve", record: row });
          }}
          className={`${iconClass} hover:border-success hover:text-success`}
        >
          <Check size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="reject"
          type="button"
          aria-label={`Reject ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "reject", record: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <X size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="delete"
          type="button"
          aria-label={`Delete ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "delete", record: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    if (row.status === "approved") {
      buttons.push(
        <button
          key="ship"
          type="button"
          aria-label={`Ship ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "ship", record: row });
          }}
          className={`${iconClass} hover:border-primary hover:text-primary`}
        >
          <Truck size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="edit"
          type="button"
          aria-label={`Edit ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setEditing(row);
            setFormOpen(true);
          }}
          className={`${iconClass} hover:border-line-strong hover:text-ink`}
        >
          <Pencil size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="cancel"
          type="button"
          aria-label={`Cancel ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "cancel", record: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <X size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    return <span className="flex items-center justify-end gap-1.5">{buttons}</span>;
  };

  const columns: Array<DataTableColumn<PurchaseReturn>> = [
    {
      key: "number",
      header: "Return",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "supplier",
      header: "Supplier",
      value: (row) => supplierById.get(row.supplierId)?.name ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {supplierById.get(row.supplierId)?.name ?? "Unknown supplier"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">{row.reason}</span>
        </span>
      ),
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
      key: "warehouse",
      header: "Warehouse",
      value: (row) => warehouseById.get(row.warehouseId) ?? "",
      render: (row) => (
        <span className="truncate text-[13px] text-ink-muted">
          {warehouseById.get(row.warehouseId) ?? ""}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "lines",
      header: "Lines",
      align: "right",
      value: (row) => row.lines.length,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{row.lines.length}</span>,
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "total",
      header: "Value",
      align: "right",
      value: (row) => row.total,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">
          {formatMoney(row.total, data.business?.currency ?? "USD", 2)}
        </span>
      ),
      mono: true,
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={STATUS_TONE[row.status]} dot>{STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: renderActions,
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[160px]"
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

  const copy = (() => {
    if (!pending) return { title: "", message: "", label: "", destructive: false };
    const { record, kind } = pending;
    if (kind === "delete") {
      return {
        title: "Delete supplier return?",
        message: `${record.number} will be removed. This cannot be undone.`,
        label: "Delete",
        destructive: true,
      };
    }
    if (kind === "approve") {
      return {
        title: "Approve return?",
        message: `${record.number} is cleared to ship back to ${supplierById.get(record.supplierId)?.name ?? "the supplier"}.`,
        label: "Approve",
        destructive: false,
      };
    }
    if (kind === "ship") {
      return {
        title: "Ship return?",
        message: `${record.number} leaves stock from ${warehouseById.get(record.warehouseId) ?? "the warehouse"} and reverses payables for ${formatMoney(record.total, data.business?.currency ?? "USD", 2)}.`,
        label: "Ship",
        destructive: false,
      };
    }
    if (kind === "reject") {
      return {
        title: "Reject return?",
        message: `${record.number} moves to rejected and no stock leaves.`,
        label: "Reject",
        destructive: true,
      };
    }
    return {
      title: "Cancel return?",
      message: `${record.number} is cancelled and nothing is returned.`,
      label: "Cancel",
      destructive: true,
    };
  })();

  return (
    <AppShell>
      <PageHeader
        title="Supplier returns"
        description="Approve, then ship. Stock leaves on shipment and payables are reversed."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New return
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Returns", value: String(metrics.count), hint: "All time" },
          {
            label: "Awaiting approval",
            value: String(metrics.pending),
            tone: metrics.pending > 0 ? "accent" : "default",
            hint: "Pending review",
          },
          { label: "Shipped", value: String(metrics.shipped), tone: "success", hint: "Stock out" },
          { label: "Return value", value: formatMoney(metrics.value, "", 0), hint: "Approved and shipped" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, supplier or reason"
        searchValue={(row) =>
          `${row.number} ${supplierById.get(row.supplierId)?.name ?? ""} ${row.reason}`
        }
        toolbar={toolbar}
        emptyTitle="No supplier returns yet"
        emptyDescription="Draft a return, approve it, then ship it to move stock out."
        pageSize={12}
        exportName="supplier-returns"
        caption="Supplier returns"
      />

      {formOpen ? <PurchaseReturnForm record={editing} onClose={() => setFormOpen(false)} /> : null}

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
