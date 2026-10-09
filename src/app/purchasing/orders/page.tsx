"use client";

import { useMemo, useState } from "react";
import { FileText, Pencil, Plus, Receipt, Send, Trash2, Undo2 } from "lucide-react";

import { BillForm } from "@/components/purchasing/BillForm";
import { PurchaseOrderForm } from "@/components/purchasing/PurchaseOrderForm";
import { ReceiptForm } from "@/components/purchasing/ReceiptForm";
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
import type { PurchaseOrder } from "@/types/erp";

type OrderStatus = PurchaseOrder["status"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  draft: "neutral",
  sent: "info",
  partially_received: "warning",
  received: "success",
  cancelled: "destructive",
};

type Pending =
  | { kind: "send" | "cancel"; order: PurchaseOrder }
  | { kind: "delete"; order: PurchaseOrder };

export default function PurchaseOrdersPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [receiptFor, setReceiptFor] = useState<PurchaseOrder | null>(null);
  const [billOpen, setBillOpen] = useState(false);
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

  const rows = useMemo(() => {
    const list = [...data.purchaseOrders].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return list.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (supplierFilter !== "all" && row.supplierId !== supplierFilter) return false;
      return true;
    });
  }, [data.purchaseOrders, statusFilter, supplierFilter]);

  const metrics = useMemo(() => {
    const open = data.purchaseOrders.filter(
      (row) => row.status === "sent" || row.status === "partially_received",
    );
    return {
      count: data.purchaseOrders.length,
      open: open.length,
      received: data.purchaseOrders.filter((row) => row.status === "received").length,
      openValue: open.reduce((acc, row) => acc + row.total, 0),
    };
  }, [data.purchaseOrders]);

  const confirm = () => {
    if (!pending) return;
    const { order } = pending;

    if (pending.kind === "delete") {
      actions.deleteRecord("purchaseOrders", order.id, {
        summary: `Deleted purchase order ${order.number}`,
      });
      toast.success("Purchase order deleted", order.number);
      setPending(null);
      return;
    }

    if (pending.kind === "send") {
      actions.updateRecord(
        "purchaseOrders",
        order.id,
        { status: "sent" },
        { summary: `Sent purchase order ${order.number} to the supplier` },
      );
      toast.success("Order sent", `${order.number} is ready to receive against`);
      setPending(null);
      return;
    }

    actions.updateRecord(
      "purchaseOrders",
      order.id,
      { status: "cancelled" },
      { summary: `Cancelled purchase order ${order.number}` },
    );
    toast.info("Order cancelled", order.number);
    setPending(null);
  };

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const renderActions = (row: PurchaseOrder) => {
    const buttons: React.ReactNode[] = [];
    if (row.status === "draft") {
      buttons.push(
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
          key="send"
          type="button"
          aria-label={`Send ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "send", order: row });
          }}
          className={`${iconClass} hover:border-primary hover:text-primary`}
        >
          <Send size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="delete"
          type="button"
          aria-label={`Delete ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "delete", order: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    if (row.status === "sent" || row.status === "partially_received") {
      const receipted = data.goodsReceipts.some((entry) => entry.orderId === row.id);
      buttons.push(
        <button
          key="receive"
          type="button"
          aria-label={`Receive goods for ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setReceiptFor(row);
          }}
          className={`${iconClass} hover:border-primary hover:text-primary`}
        >
          <Receipt size={13} strokeWidth={1.5} />
        </button>,
        <button
          key="bill"
          type="button"
          aria-label={`Create bill for ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setBillOpen(true);
          }}
          className={`${iconClass} hover:border-line-strong hover:text-ink`}
        >
          <FileText size={13} strokeWidth={1.5} />
        </button>,
      );
      if (!receipted) {
        buttons.push(
          <button
            key="cancel"
            type="button"
            aria-label={`Cancel ${row.number}`}
            onClick={(event) => {
              event.stopPropagation();
              setPending({ kind: "cancel", order: row });
            }}
            className={`${iconClass} hover:border-destructive hover:text-destructive`}
          >
            <Undo2 size={13} strokeWidth={1.5} />
          </button>,
        );
      }
    }
    if (row.status === "received") {
      buttons.push(
        <button
          key="bill"
          type="button"
          aria-label={`Create bill for ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setBillOpen(true);
          }}
          className={`${iconClass} hover:border-line-strong hover:text-ink`}
        >
          <FileText size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    return <span className="flex items-center justify-end gap-1.5">{buttons}</span>;
  };

  const columns: Array<DataTableColumn<PurchaseOrder>> = [
    {
      key: "number",
      header: "Order",
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
          <span className="block truncate text-[11.5px] text-ink-faint">
            {warehouseById.get(row.warehouseId) ?? ""}
          </span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Ordered",
      value: (row) => row.date,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>
      ),
      hideBelow: "md",
    },
    {
      key: "expectedDate",
      header: "Expected",
      value: (row) => row.expectedDate,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatDate(row.expectedDate, "us")}
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
        <span className="numeric text-[13px] text-ink">
          {formatMoney(row.total, row.currency, 2)}
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
        className="w-auto min-w-[170px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          ...(Object.keys(STATUS_LABEL) as OrderStatus[]).map((status) => ({
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
    const { order, kind } = pending;
    if (kind === "delete") {
      return {
        title: "Delete purchase order?",
        message: `${order.number} will be removed. This cannot be undone.`,
        label: "Delete",
        destructive: true,
      };
    }
    if (kind === "send") {
      return {
        title: "Send order to supplier?",
        message: `${order.number} moves to sent and can be received against.`,
        label: "Send",
        destructive: false,
      };
    }
    return {
      title: "Cancel purchase order?",
      message: `${order.number} is cancelled and cannot be received or billed.`,
      label: "Cancel order",
      destructive: true,
    };
  })();

  return (
    <AppShell>
      <PageHeader
        title="Purchase orders"
        description="Buy from suppliers, receive stock in stages, then settle the bill."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New purchase order
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Orders", value: String(metrics.count), hint: "All time" },
          {
            label: "Open orders",
            value: String(metrics.open),
            tone: metrics.open > 0 ? "accent" : "default",
            hint: "Sent or part received",
          },
          { label: "Received", value: String(metrics.received), tone: "success", hint: "Stock is in" },
          { label: "Open value", value: formatMoney(metrics.openValue, "", 0), hint: "Not yet received" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, supplier or warehouse"
        searchValue={(row) =>
          `${row.number} ${supplierById.get(row.supplierId)?.name ?? ""} ${warehouseById.get(row.warehouseId) ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No purchase orders yet"
        emptyDescription="Convert an approved request or create an order straight away."
        pageSize={12}
        exportName="purchase-orders"
        caption="Purchase orders"
      />

      {formOpen ? (
        <PurchaseOrderForm order={editing} request={null} onClose={() => setFormOpen(false)} />
      ) : null}
      {receiptFor ? <ReceiptForm order={receiptFor} onClose={() => setReceiptFor(null)} /> : null}
      {billOpen ? <BillForm onClose={() => setBillOpen(false)} /> : null}

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
