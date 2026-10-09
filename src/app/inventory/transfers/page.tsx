"use client";

import { useMemo, useState } from "react";
import { Plus, Send, Check, X } from "lucide-react";

import { TransferForm } from "@/components/inventory/TransferForm";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import type { StockTransfer } from "@/types/erp";

type StockTransferStatus = StockTransfer["status"];

const STATUS_LABEL: Record<StockTransferStatus, string> = {
  draft: "Draft",
  in_transit: "In transit",
  received: "Received",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<StockTransferStatus, BadgeTone> = {
  draft: "neutral",
  in_transit: "warning",
  received: "success",
  cancelled: "destructive",
};

type PendingKind = "send" | "receive" | "cancel";

export default function StockTransfersPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState<{ kind: PendingKind; transfer: StockTransfer } | null>(null);

  const warehouseById = useMemo(
    () => new Map(data.warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [data.warehouses],
  );
  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const rows = useMemo(
    () =>
      [...data.stockTransfers].sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
      ),
    [data.stockTransfers],
  );

  const availableAt = (productId: string, warehouseId: string): number => {
    const balance = data.stockBalances.find(
      (entry) => entry.productId === productId && entry.warehouseId === warehouseId,
    );
    if (!balance) return 0;
    return round2(balance.onHand - balance.reserved);
  };

  const send = (transfer: StockTransfer) => {
    for (const line of transfer.lines) {
      const product = productById.get(line.productId);
      if (!product?.trackStock) continue;
      const available = availableAt(line.productId, transfer.fromWarehouseId);
      if (available < line.quantity) {
        toast.error(
          "Cannot send transfer",
          `${product.sku} has ${available} available, ${line.quantity} needed.`,
        );
        return;
      }
    }

    for (const line of transfer.lines) {
      const product = productById.get(line.productId);
      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: transfer.fromWarehouseId,
        quantity: -line.quantity,
        type: "transfer_out",
        refType: "stock_transfer",
        refId: transfer.id,
        refNumber: transfer.number,
        date: transfer.date,
        unitCost: product?.costPrice,
        notes: transfer.notes,
      });
    }

    actions.updateRecord(
      "stockTransfers",
      transfer.id,
      { status: "in_transit" },
      { summary: `Sent transfer ${transfer.number}` },
    );
    toast.success("Transfer sent", `${transfer.number} left the source warehouse`);
  };

  const receive = (transfer: StockTransfer) => {
    for (const line of transfer.lines) {
      const product = productById.get(line.productId);
      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: transfer.toWarehouseId,
        quantity: line.quantity,
        type: "transfer_in",
        refType: "stock_transfer",
        refId: transfer.id,
        refNumber: transfer.number,
        date: transfer.date,
        unitCost: product?.costPrice,
        notes: transfer.notes,
      });
    }

    actions.updateRecord(
      "stockTransfers",
      transfer.id,
      {
        status: "received",
        lines: transfer.lines.map((line) => ({ ...line, receivedQuantity: line.quantity })),
      },
      { summary: `Received transfer ${transfer.number}` },
    );
    toast.success("Transfer received", `${transfer.number} arrived at the destination`);
  };

  const cancel = (transfer: StockTransfer) => {
    if (transfer.status === "in_transit") {
      for (const line of transfer.lines) {
        const product = productById.get(line.productId);
        actions.applyStockMovement({
          productId: line.productId,
          warehouseId: transfer.fromWarehouseId,
          quantity: line.quantity,
          type: "transfer_in",
          refType: "stock_transfer",
          refId: transfer.id,
          refNumber: transfer.number,
          date: transfer.date,
          unitCost: product?.costPrice,
          notes: "Cancelled transfer returned to source",
        });
      }
    }

    actions.updateRecord(
      "stockTransfers",
      transfer.id,
      { status: "cancelled" },
      { summary: `Cancelled transfer ${transfer.number}` },
    );
    toast.info("Transfer cancelled", transfer.number);
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === "send") send(pending.transfer);
    if (pending.kind === "receive") receive(pending.transfer);
    if (pending.kind === "cancel") cancel(pending.transfer);
    setPending(null);
  };

  const confirmCopy = () => {
    if (!pending) return { title: "", message: "" };
    const { kind, transfer } = pending;
    const route = `${warehouseById.get(transfer.fromWarehouseId) ?? "?"} to ${
      warehouseById.get(transfer.toWarehouseId) ?? "?"
    }`;
    if (kind === "send") {
      return {
        title: "Send transfer?",
        message: `${transfer.number} moves ${transfer.lines.length} line${
          transfer.lines.length === 1 ? "" : "s"
        } out of ${warehouseById.get(transfer.fromWarehouseId) ?? "the source"}. Stock is deducted and a movement is written for each line.`,
      };
    }
    if (kind === "receive") {
      return {
        title: "Receive transfer?",
        message: `${transfer.number} arrives at ${
          warehouseById.get(transfer.toWarehouseId) ?? "the destination"
        }. Stock is added and a movement is written for each line.`,
      };
    }
    return {
      title: "Cancel transfer?",
      message: `${transfer.number} (${route}) will be cancelled${
        transfer.status === "in_transit" ? " and stock in transit returned to the source" : ""
      }.`,
    };
  };

  const columns: Array<DataTableColumn<StockTransfer>> = [
    {
      key: "number",
      header: "Transfer",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "120px",
    },
    {
      key: "date",
      header: "Date",
      value: (row) => row.date,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>
      ),
      width: "110px",
    },
    {
      key: "route",
      header: "Route",
      value: (row) =>
        `${warehouseById.get(row.fromWarehouseId) ?? ""} ${warehouseById.get(row.toWarehouseId) ?? ""}`,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13px] text-ink">
            {warehouseById.get(row.fromWarehouseId) ?? "Unknown"}{" "}
            <span className="text-ink-faint">→</span>{" "}
            {warehouseById.get(row.toWarehouseId) ?? "Unknown"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">{row.notes ?? "No notes"}</span>
        </span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      align: "right",
      value: (row) => row.lines.length,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {row.lines.reduce((acc, line) => acc + line.quantity, 0)} u / {row.lines.length} ln
        </span>
      ),
      mono: true,
      hideBelow: "md",
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
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
              aria-label={`Send ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPending({ kind: "send", transfer: row });
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-primary hover:text-primary"
            >
              <Send size={13} strokeWidth={1.5} />
            </button>
          ) : null}
          {row.status === "in_transit" ? (
            <button
              type="button"
              aria-label={`Receive ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPending({ kind: "receive", transfer: row });
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-success hover:text-success"
            >
              <Check size={13} strokeWidth={1.5} />
            </button>
          ) : null}
          {row.status === "draft" || row.status === "in_transit" ? (
            <button
              type="button"
              aria-label={`Cancel ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPending({ kind: "cancel", transfer: row });
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          ) : null}
        </span>
      ),
    },
  ];

  const copy = confirmCopy();

  return (
    <AppShell>
      <PageHeader
        title="Stock transfers"
        description="Move goods between warehouses with a send and receive trail."
        breadcrumbs={[{ label: "Stock", href: "/inventory" }, { label: "Transfers" }]}
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => setFormOpen(true)}
          >
            New transfer
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, warehouse or notes"
        searchValue={(row) =>
          `${row.number} ${warehouseById.get(row.fromWarehouseId) ?? ""} ${
            warehouseById.get(row.toWarehouseId) ?? ""
          } ${row.notes ?? ""}`
        }
        emptyTitle="No transfers yet"
        emptyDescription="Create a transfer to rebalance stock across warehouses."
        pageSize={12}
        exportName="stock-transfers"
        caption="Stock transfers"
      />

      {formOpen ? <TransferForm onClose={() => setFormOpen(false)} /> : null}

      <ConfirmDialog
        open={pending !== null}
        title={copy.title}
        message={copy.message}
        confirmLabel={
          pending?.kind === "send" ? "Send" : pending?.kind === "receive" ? "Receive" : "Cancel transfer"
        }
        destructive={pending?.kind === "cancel"}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
