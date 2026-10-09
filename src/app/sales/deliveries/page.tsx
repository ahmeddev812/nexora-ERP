"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Send, X } from "lucide-react";

import { DeliveryForm } from "@/components/sales/DeliveryForm";
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
import { round2 } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import type { Delivery } from "@/types/erp";

type DeliveryStatus = Delivery["status"];

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  draft: "Draft",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<DeliveryStatus, BadgeTone> = {
  draft: "neutral",
  shipped: "warning",
  delivered: "success",
  cancelled: "destructive",
};

type Pending = { kind: "ship" | "deliver" | "cancel"; delivery: Delivery };

export default function DeliveriesPage() {
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
  const orderById = useMemo(
    () => new Map(data.salesOrders.map((order) => [order.id, order])),
    [data.salesOrders],
  );
  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const rows = useMemo(() => {
    const list = [...data.deliveries].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return statusFilter === "all"
      ? list
      : list.filter((row) => row.status === statusFilter);
  }, [data.deliveries, statusFilter]);

  const metrics = useMemo(
    () => ({
      count: data.deliveries.length,
      open: data.deliveries.filter(
        (row) => row.status === "draft" || row.status === "shipped",
      ).length,
      delivered: data.deliveries.filter((row) => row.status === "delivered").length,
      units: data.deliveries
        .filter((row) => row.status === "delivered")
        .reduce(
          (acc, row) => acc + row.lines.reduce((sum, line) => sum + line.quantity, 0),
          0,
        ),
    }),
    [data.deliveries],
  );

  const deliveredForOrder = (orderId: string): Record<string, number> => {
    const totals: Record<string, number> = {};
    for (const delivery of data.deliveries) {
      if (delivery.orderId !== orderId || delivery.status === "cancelled") continue;
      for (const line of delivery.lines) {
        totals[line.productId] = round2((totals[line.productId] ?? 0) + line.quantity);
      }
    }
    return totals;
  };

  const completeOrderIfFulfilled = (delivery: Delivery) => {
    const order = orderById.get(delivery.orderId);
    if (!order || order.status !== "approved") return;

    const delivered = deliveredForOrder(order.id);
    const complete = order.lines.every(
      (line) => (delivered[line.productId] ?? 0) >= line.quantity,
    );
    if (!complete) return;

    const leftovers = data.stockReservations.filter(
      (entry) => entry.refId === order.id && entry.status === "active",
    );
    for (const reservation of leftovers) {
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
        date: delivery.date,
        unitCost: product?.costPrice,
        notes: "Reservation completed by delivery",
      });
      actions.updateRecord(
        "stockReservations",
        reservation.id,
        { status: "fulfilled", releasedAt: new Date().toISOString() },
        { summary: `Fulfilled reservation for ${order.number}` },
      );
    }

    actions.updateRecord(
      "salesOrders",
      order.id,
      { status: "fulfilled" },
      { summary: `Order ${order.number} fulfilled by ${delivery.number}` },
    );
    toast.success("Order fulfilled", `${order.number} is fully delivered`);
  };

  const markDelivered = (delivery: Delivery) => {
    const order = orderById.get(delivery.orderId);

    for (const line of delivery.lines) {
      const product = productById.get(line.productId);
      if (!product?.trackStock) continue;

      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: delivery.warehouseId,
        quantity: -line.quantity,
        type: "delivery",
        refType: "sales_order",
        refId: delivery.orderId,
        refNumber: order?.number ?? delivery.number,
        date: delivery.date,
        unitCost: product.costPrice,
        notes: `Delivery ${delivery.number}`,
      });

      const reservation = data.stockReservations.find(
        (entry) =>
          entry.refId === delivery.orderId &&
          entry.productId === line.productId &&
          entry.status === "active",
      );
      if (reservation) {
        const consume = round2(Math.min(reservation.quantity, line.quantity));
        actions.applyStockMovement({
          productId: line.productId,
          warehouseId: delivery.warehouseId,
          quantity: -consume,
          bucket: "reserved",
          type: "reservation_release",
          refType: "sales_order",
          refId: delivery.orderId,
          refNumber: order?.number ?? delivery.number,
          date: delivery.date,
          unitCost: product.costPrice,
          notes: `Reserved stock shipped on ${delivery.number}`,
        });
        actions.updateRecord(
          "stockReservations",
          reservation.id,
          consume >= reservation.quantity
            ? { status: "fulfilled", releasedAt: new Date().toISOString() }
            : { quantity: round2(reservation.quantity - consume) },
          { summary: `Reserved stock shipped on ${delivery.number}` },
        );
      }
    }

    const cogs = round2(
      delivery.lines.reduce(
        (acc, line) => acc + (productById.get(line.productId)?.costPrice ?? 0) * line.quantity,
        0,
      ),
    );
    if (cogs > 0) {
      const cogsAccount = data.accounts.find((account) => account.code === "5000");
      const inventoryAccount = data.accounts.find((account) => account.code === "1200");
      if (cogsAccount && inventoryAccount) {
        actions.postJournal({
          date: delivery.date,
          memo: `COGS for ${delivery.number}`,
          refType: "delivery",
          refId: delivery.id,
          refNumber: delivery.number,
          lines: [
            { accountId: cogsAccount.id, debit: cogs, credit: 0 },
            { accountId: inventoryAccount.id, debit: 0, credit: cogs },
          ],
        });
      } else {
        toast.warning(
          "No COGS entry posted",
          "The chart of accounts is missing account 5000 or 1200.",
        );
      }
    }

    actions.updateRecord(
      "deliveries",
      delivery.id,
      { status: "delivered" },
      { summary: `Delivered ${delivery.number}` },
    );
    toast.success("Delivery completed", `${delivery.number} stock deducted`);
    completeOrderIfFulfilled(delivery);
  };

  const confirm = () => {
    if (!pending) return;
    const { delivery, kind } = pending;
    if (kind === "ship") {
      actions.updateRecord(
        "deliveries",
        delivery.id,
        { status: "shipped" },
        { summary: `Shipped ${delivery.number}` },
      );
      toast.success("Delivery shipped", delivery.number);
    }
    if (kind === "deliver") markDelivered(delivery);
    if (kind === "cancel") {
      actions.updateRecord(
        "deliveries",
        delivery.id,
        { status: "cancelled" },
        { summary: `Cancelled ${delivery.number}` },
      );
      toast.info("Delivery cancelled", delivery.number);
    }
    setPending(null);
  };

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const columns: Array<DataTableColumn<Delivery>> = [
    {
      key: "number",
      header: "Delivery",
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
      key: "order",
      header: "Order",
      value: (row) => orderById.get(row.orderId)?.number ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="numeric block text-[13px] text-ink">
            {orderById.get(row.orderId)?.number ?? "No order"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {customerById.get(row.customerId)?.name ?? ""}
          </span>
        </span>
      ),
    },
    {
      key: "lines",
      header: "Units",
      align: "right",
      value: (row) => row.lines.reduce((acc, line) => acc + line.quantity, 0),
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {row.lines.reduce((acc, line) => acc + line.quantity, 0)} / {row.lines.length} ln
        </span>
      ),
      mono: true,
      hideBelow: "md",
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
      render: (row) => (
        <span className="flex items-center justify-end gap-1.5">
          {row.status === "draft" ? (
            <button
              type="button"
              aria-label={`Ship ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPending({ kind: "ship", delivery: row });
              }}
              className={`${iconClass} hover:border-primary hover:text-primary`}
            >
              <Send size={13} strokeWidth={1.5} />
            </button>
          ) : null}
          {row.status === "draft" || row.status === "shipped" ? (
            <>
              <button
                type="button"
                aria-label={`Deliver ${row.number}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setPending({ kind: "deliver", delivery: row });
                }}
                className={`${iconClass} hover:border-success hover:text-success`}
              >
                <Check size={13} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={`Cancel ${row.number}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setPending({ kind: "cancel", delivery: row });
                }}
                className={`${iconClass} hover:border-destructive hover:text-destructive`}
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </>
          ) : null}
        </span>
      ),
    },
  ];

  const copy = (() => {
    if (!pending) return { title: "", message: "", label: "", destructive: false };
    const { delivery, kind } = pending;
    if (kind === "ship") {
      return {
        title: "Ship delivery?",
        message: `${delivery.number} is marked as shipped. Stock is deducted when it is delivered.`,
        label: "Ship",
        destructive: false,
      };
    }
    if (kind === "deliver") {
      return {
        title: "Mark delivered?",
        message: `${delivery.number} deducts stock from ${delivery.lines.length} line${delivery.lines.length === 1 ? "" : "s"}, releases matching reservations and posts the cost of goods sold.`,
        label: "Deliver",
        destructive: false,
      };
    }
    return {
      title: "Cancel delivery?",
      message: `${delivery.number} is cancelled. No stock has moved yet, so nothing is reversed.`,
      label: "Cancel",
      destructive: true,
    };
  })();

  return (
    <AppShell>
      <PageHeader
        title="Deliveries"
        description="Fulfil approved orders. Stock leaves the warehouse on delivery, not before."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => setFormOpen(true)}
          >
            New delivery
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Deliveries", value: String(metrics.count) },
          { label: "Open", value: String(metrics.open), tone: metrics.open > 0 ? "accent" : "default", hint: "Draft or shipped" },
          { label: "Delivered", value: String(metrics.delivered), tone: "success", hint: "Stock deducted" },
          { label: "Units shipped", value: String(metrics.units), hint: "Across delivered orders" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search delivery, order or customer"
        searchValue={(row) =>
          `${row.number} ${orderById.get(row.orderId)?.number ?? ""} ${customerById.get(row.customerId)?.name ?? ""}`
        }
        toolbar={
          <Select
            aria-label="Filter by status"
            className="w-auto min-w-[150px]"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: "all", label: "All statuses" },
              ...(Object.keys(STATUS_LABEL) as DeliveryStatus[]).map((status) => ({
                value: status,
                label: STATUS_LABEL[status],
              })),
            ]}
          />
        }
        emptyTitle="No deliveries yet"
        emptyDescription="Create a delivery from an approved sales order."
        pageSize={12}
        exportName="deliveries"
        caption="Sales deliveries"
        emptyAction={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            New delivery
          </Button>
        }
      />

      {formOpen ? <DeliveryForm order={null} onClose={() => setFormOpen(false)} /> : null}

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
