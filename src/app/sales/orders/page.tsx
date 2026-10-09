"use client";

import { useMemo, useState } from "react";
import { Check, Package, Pencil, Plus, Trash2, Undo2, X, Send } from "lucide-react";

import { DeliveryForm } from "@/components/sales/DeliveryForm";
import { OrderForm } from "@/components/sales/OrderForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { SalesOrder, StockReservation } from "@/types/erp";

type OrderStatus = SalesOrder["status"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "info",
  fulfilled: "success",
  cancelled: "destructive",
};

type Pending =
  | { kind: "submit" | "approve" | "reject" | "cancel"; order: SalesOrder }
  | { kind: "delete"; order: SalesOrder };

export default function SalesOrdersPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [deliveryFor, setDeliveryFor] = useState<SalesOrder | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  const customerById = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
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
    const list = [...data.salesOrders].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return list.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (customerFilter !== "all" && row.customerId !== customerFilter) return false;
      return true;
    });
  }, [data.salesOrders, statusFilter, customerFilter]);

  const metrics = useMemo(() => {
    const open = data.salesOrders.filter(
      (row) => row.status === "approved" || row.status === "pending",
    );
    return {
      count: data.salesOrders.length,
      pending: data.salesOrders.filter((row) => row.status === "pending").length,
      approved: data.salesOrders.filter((row) => row.status === "approved").length,
      openValue: open.reduce((acc, row) => acc + row.total, 0),
    };
  }, [data.salesOrders]);

  const availableAt = (productId: string, warehouseId: string): number => {
    const balance = data.stockBalances.find(
      (entry) => entry.productId === productId && entry.warehouseId === warehouseId,
    );
    return balance ? round2(balance.onHand - balance.reserved) : 0;
  };

  /** Blocks approval when any line cannot be covered from free stock. */
  const reserveForOrder = (order: SalesOrder): boolean => {
    const usage = new Map<string, number>();
    for (const line of order.lines) {
      const product = productById.get(line.productId);
      if (!product?.trackStock) continue;
      const needed = round2((usage.get(line.productId) ?? 0) + line.quantity);
      const available = availableAt(line.productId, order.warehouseId);
      if (available < needed) {
        toast.error(
          "Not enough free stock",
          `${product.sku} needs ${needed} in ${warehouseById.get(order.warehouseId) ?? "the warehouse"}, only ${available} is available.`,
        );
        return false;
      }
      usage.set(line.productId, needed);
    }

    for (const line of order.lines) {
      const product = productById.get(line.productId);
      if (!product?.trackStock) continue;
      actions.createRecord(
        "stockReservations",
        {
          refType: "sales_order",
          refId: order.id,
          refNumber: order.number,
          productId: line.productId,
          warehouseId: order.warehouseId,
          quantity: line.quantity,
          status: "active",
        } as unknown as StockReservation,
        { summary: `Reserved ${line.quantity} of ${product.sku} for ${order.number}` },
      );
      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: order.warehouseId,
        quantity: line.quantity,
        bucket: "reserved",
        type: "reservation",
        refType: "sales_order",
        refId: order.id,
        refNumber: order.number,
        date: order.date,
        unitCost: product.costPrice,
      });
    }
    return true;
  };

  const releaseForOrder = (order: SalesOrder, summary: string) => {
    const reservations = data.stockReservations.filter(
      (entry) => entry.refId === order.id && entry.status === "active",
    );
    for (const reservation of reservations) {
      const product = productById.get(reservation.productId);
      actions.applyStockMovement({
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        quantity: -reservation.quantity,
        bucket: "reserved",
        type: "reservation_release",
        refType: "sales_order",
        refId: order.id,
        refNumber: order.number,
        date: order.date,
        unitCost: product?.costPrice,
        notes: summary,
      });
      actions.updateRecord(
        "stockReservations",
        reservation.id,
        { status: "released", releasedAt: new Date().toISOString() },
        { summary: `Released ${reservation.quantity} of ${product?.sku ?? reservation.productId} from ${order.number}` },
      );
    }
  };

  const confirm = () => {
    if (!pending) return;
    const { order } = pending;

    if (pending.kind === "delete") {
      actions.deleteRecord("salesOrders", order.id, {
        summary: `Deleted order ${order.number}`,
      });
      toast.success("Order deleted", order.number);
      setPending(null);
      return;
    }

    if (pending.kind === "submit") {
      actions.updateRecord(
        "salesOrders",
        order.id,
        { status: "pending" },
        { summary: `Submitted order ${order.number} for approval` },
      );
      toast.success("Sent for approval", order.number);
      setPending(null);
      return;
    }

    if (pending.kind === "approve") {
      if (!reserveForOrder(order)) {
        setPending(null);
        return;
      }
      actions.updateRecord(
        "salesOrders",
        order.id,
        { status: "approved", approvedBy: user?.id, approvedAt: new Date().toISOString() },
        { summary: `Approved order ${order.number}` },
      );
      toast.success("Order approved", `${order.number} stock is now reserved`);
      setPending(null);
      return;
    }

    if (pending.kind === "reject") {
      actions.updateRecord(
        "salesOrders",
        order.id,
        { status: "cancelled" },
        { summary: `Rejected order ${order.number}` },
      );
      toast.info("Order rejected", order.number);
      setPending(null);
      return;
    }

    releaseForOrder(order, `Order ${order.number} cancelled`);
    actions.updateRecord(
      "salesOrders",
      order.id,
      { status: "cancelled" },
      { summary: `Cancelled order ${order.number}` },
    );
    toast.info("Order cancelled", `${order.number} reservations were released`);
    setPending(null);
  };

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const renderActions = (row: SalesOrder) => {
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
          key="submit"
          type="button"
          aria-label={`Submit ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "submit", order: row });
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
    if (row.status === "pending") {
      buttons.push(
        <button
          key="approve"
          type="button"
          aria-label={`Approve ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setPending({ kind: "approve", order: row });
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
            setPending({ kind: "reject", order: row });
          }}
          className={`${iconClass} hover:border-destructive hover:text-destructive`}
        >
          <X size={13} strokeWidth={1.5} />
        </button>,
      );
    }
    if (row.status === "approved") {
      buttons.push(
        <button
          key="deliver"
          type="button"
          aria-label={`Create delivery for ${row.number}`}
          onClick={(event) => {
            event.stopPropagation();
            setDeliveryFor(row);
          }}
          className={`${iconClass} hover:border-primary hover:text-primary`}
        >
          <Package size={13} strokeWidth={1.5} />
        </button>,
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
    return <span className="flex items-center justify-end gap-1.5">{buttons}</span>;
  };

  const columns: Array<DataTableColumn<SalesOrder>> = [
    {
      key: "number",
      header: "Order",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "110px",
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
          <span className="block truncate text-[11.5px] text-ink-faint">
            {warehouseById.get(row.warehouseId) ?? ""}
          </span>
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
      header: "Total",
      align: "right",
      value: (row) => row.total,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">{formatMoney(row.total, row.currency, 2)}</span>
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
          ...(Object.keys(STATUS_LABEL) as OrderStatus[]).map((status) => ({
            value: status,
            label: STATUS_LABEL[status],
          })),
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

  const copy = (() => {
    if (!pending) return { title: "", message: "", label: "", destructive: false };
    const { order, kind } = pending;
    if (kind === "delete") {
      return {
        title: "Delete order?",
        message: `${order.number} will be removed. This cannot be undone.`,
        label: "Delete",
        destructive: true,
      };
    }
    if (kind === "submit") {
      return {
        title: "Submit for approval?",
        message: `${order.number} moves to the approval queue.`,
        label: "Submit",
        destructive: false,
      };
    }
    if (kind === "approve") {
      return {
        title: "Approve order?",
        message: `${order.number} is approved and stock for all ${order.lines.length} line${order.lines.length === 1 ? "" : "s"} is reserved from ${warehouseById.get(order.warehouseId) ?? "the warehouse"}.`,
        label: "Approve",
        destructive: false,
      };
    }
    if (kind === "reject") {
      return {
        title: "Reject order?",
        message: `${order.number} moves to cancelled and no stock is held.`,
        label: "Reject",
        destructive: true,
      };
    }
    return {
      title: "Cancel approved order?",
      message: `${order.number} is cancelled and any active reservations for it are released back to available stock.`,
      label: "Cancel order",
      destructive: true,
    };
  })();

  return (
    <AppShell>
      <PageHeader
        title="Sales orders"
        description="Draft to approved to fulfilled, with stock reserved the moment approval lands."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New order
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Orders", value: String(metrics.count), hint: "All time" },
          {
            label: "Awaiting approval",
            value: String(metrics.pending),
            tone: metrics.pending > 0 ? "accent" : "default",
            hint: "Pending review",
          },
          { label: "Approved", value: String(metrics.approved), tone: "success", hint: "Stock reserved" },
          { label: "Open value", value: formatMoney(metrics.openValue, "", 0), hint: "Pending and approved" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, customer or warehouse"
        searchValue={(row) =>
          `${row.number} ${customerById.get(row.customerId)?.name ?? ""} ${warehouseById.get(row.warehouseId) ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No sales orders yet"
        emptyDescription="Create an order, submit it for approval, then fulfil it with a delivery."
        pageSize={12}
        exportName="sales-orders"
        caption="Sales orders"
      />

      {formOpen ? <OrderForm order={editing} onClose={() => setFormOpen(false)} /> : null}
      {deliveryFor ? <DeliveryForm order={deliveryFor} onClose={() => setDeliveryFor(null)} /> : null}

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
