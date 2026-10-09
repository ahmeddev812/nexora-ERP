"use client";

import { useMemo, useState } from "react";
import { Layers, Undo2 } from "lucide-react";

import { ReserveDialog } from "@/components/inventory/ReserveDialog";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { StockReservation } from "@/types/erp";

type ReservationStatus = StockReservation["status"];

const STATUS_LABEL: Record<ReservationStatus, string> = {
  active: "Active",
  released: "Released",
  fulfilled: "Fulfilled",
};

const STATUS_TONE: Record<ReservationStatus, BadgeTone> = {
  active: "info",
  released: "neutral",
  fulfilled: "success",
};

export default function StockReservationsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRelease, setPendingRelease] = useState<StockReservation | null>(null);

  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );
  const warehouseById = useMemo(
    () => new Map(data.warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [data.warehouses],
  );

  const rows = useMemo(
    () =>
      [...data.stockReservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.stockReservations],
  );

  const activeCount = rows.filter((row) => row.status === "active").length;
  const heldUnits = rows
    .filter((row) => row.status === "active")
    .reduce((acc, row) => acc + row.quantity, 0);

  const release = (reservation: StockReservation) => {
    const product = productById.get(reservation.productId);
    actions.applyStockMovement({
      productId: reservation.productId,
      warehouseId: reservation.warehouseId,
      quantity: -reservation.quantity,
      bucket: "reserved",
      type: "reservation_release",
      refType: "sales_order",
      refId: reservation.refId,
      refNumber: reservation.refNumber,
      date: formatDate(reservation.createdAt, "iso"),
      unitCost: product?.costPrice,
      notes: `Released reservation for ${reservation.refNumber}`,
    });

    actions.updateRecord(
      "stockReservations",
      reservation.id,
      { status: "released", releasedAt: new Date().toISOString() },
      {
        summary: `Released ${reservation.quantity} of ${product?.sku ?? reservation.productId} from ${reservation.refNumber}`,
      },
    );
    toast.success("Reservation released", reservation.refNumber);
  };

  const columns: Array<DataTableColumn<StockReservation>> = [
    {
      key: "order",
      header: "Order",
      value: (row) => row.refNumber,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.refNumber}</span>,
      mono: true,
      width: "120px",
    },
    {
      key: "product",
      header: "Product",
      value: (row) => {
        const product = productById.get(row.productId);
        return `${product?.sku ?? ""} ${product?.name ?? ""}`;
      },
      render: (row) => {
        const product = productById.get(row.productId);
        return (
          <span className="block min-w-0">
            <span className="block truncate text-[13.5px] text-ink">
              {product?.name ?? "Unknown product"}
            </span>
            <span className="numeric block text-[11.5px] text-ink-faint">
              {product?.sku ?? "-"}
            </span>
          </span>
        );
      },
    },
    {
      key: "warehouse",
      header: "Warehouse",
      value: (row) => warehouseById.get(row.warehouseId) ?? "",
      render: (row) => (
        <span className="text-[13px] text-ink-muted">
          {warehouseById.get(row.warehouseId) ?? "Unknown"}
        </span>
      ),
      hideBelow: "md",
    },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      value: (row) => row.quantity,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.quantity}</span>,
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
      key: "created",
      header: "Reserved",
      value: (row) => row.createdAt,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatDateTime(row.createdAt, "us")}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) =>
        row.status === "active" ? (
          <button
            type="button"
            aria-label={`Release reservation for ${row.refNumber}`}
            onClick={(event) => {
              event.stopPropagation();
              setPendingRelease(row);
            }}
            className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
          >
            <Undo2 size={13} strokeWidth={1.5} />
          </button>
        ) : null,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Stock reservations"
        description="Quantities held for approved sales orders, released when plans change."
        breadcrumbs={[{ label: "Stock", href: "/inventory" }, { label: "Reservations" }]}
        actions={
          <Button
            size="sm"
            iconLeft={<Layers size={14} strokeWidth={1.5} />}
            onClick={() => setDialogOpen(true)}
          >
            Reserve for order
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search order number, SKU or product"
        searchValue={(row) => {
          const product = productById.get(row.productId);
          return `${row.refNumber} ${product?.sku ?? ""} ${product?.name ?? ""}`;
        }}
        emptyTitle="No reservations yet"
        emptyDescription="Reserve stock for an approved sales order to keep it available."
        pageSize={12}
        exportName="stock-reservations"
        caption="Stock reservations"
        emptyAction={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Reserve for order
          </Button>
        }
      />

      <p className="mt-3 text-[12.5px] text-ink-muted">
        {activeCount} active reservation{activeCount === 1 ? "" : "s"} holding {heldUnits} unit
        {heldUnits === 1 ? "" : "s"} across {data.warehouses.length} warehouse
        {data.warehouses.length === 1 ? "" : "s"}.
      </p>

      {dialogOpen ? <ReserveDialog onClose={() => setDialogOpen(false)} /> : null}

      <ConfirmDialog
        open={pendingRelease !== null}
        title="Release reservation?"
        message={
          pendingRelease
            ? `${pendingRelease.quantity} unit${pendingRelease.quantity === 1 ? "" : "s"} held for ${pendingRelease.refNumber} return to available stock.`
            : ""
        }
        confirmLabel="Release"
        destructive
        onConfirm={() => {
          if (pendingRelease) release(pendingRelease);
          setPendingRelease(null);
        }}
        onCancel={() => setPendingRelease(null)}
      />
    </AppShell>
  );
}
