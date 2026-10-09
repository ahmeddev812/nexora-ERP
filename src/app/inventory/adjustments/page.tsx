"use client";

import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { AdjustmentForm } from "@/components/inventory/AdjustmentForm";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { StockAdjustment } from "@/types/erp";

type AdjustmentStatus = StockAdjustment["status"];
type AdjustmentReason = StockAdjustment["reason"];

const STATUS_LABEL: Record<AdjustmentStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_TONE: Record<AdjustmentStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const REASON_LABEL: Record<AdjustmentReason, string> = {
  count_correction: "Count correction",
  damage: "Damage",
  theft: "Theft",
  other: "Other",
};

type PendingKind = "approve" | "reject";

export default function StockAdjustmentsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState<{ kind: PendingKind; adjustment: StockAdjustment } | null>(
    null,
  );

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
      [...data.stockAdjustments].sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
      ),
    [data.stockAdjustments],
  );

  const approve = (adjustment: StockAdjustment) => {
    for (const line of adjustment.lines) {
      if (!line.quantityDelta) continue;
      const product = productById.get(line.productId);
      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: adjustment.warehouseId,
        quantity: line.quantityDelta,
        type: "adjustment",
        refType: "stock_adjustment",
        refId: adjustment.id,
        refNumber: adjustment.number,
        date: adjustment.date,
        unitCost: line.unitCost ?? product?.costPrice,
        notes: REASON_LABEL[adjustment.reason],
      });
    }

    const netValue = round2(
      adjustment.lines.reduce(
        (acc, line) =>
          acc +
          line.quantityDelta *
            (line.unitCost ?? productById.get(line.productId)?.costPrice ?? 0),
        0,
      ),
    );

    if (netValue !== 0) {
      const inventory = data.accounts.find((account) => account.code === "1200");
      const variance = data.accounts.find((account) => account.code === "6600");
      const magnitude = Math.abs(netValue);
      if (inventory && variance) {
        actions.postJournal({
          date: adjustment.date,
          memo: `Stock adjustment ${adjustment.number}`,
          refType: "stock_adjustment",
          refId: adjustment.id,
          refNumber: adjustment.number,
          lines:
            netValue < 0
              ? [
                  { accountId: variance.id, debit: magnitude, credit: 0 },
                  { accountId: inventory.id, debit: 0, credit: magnitude },
                ]
              : [
                  { accountId: inventory.id, debit: magnitude, credit: 0 },
                  { accountId: variance.id, debit: 0, credit: magnitude },
                ],
        });
      } else {
        toast.warning(
          "No journal entry posted",
          "The chart of accounts is missing account 1200 or 6600.",
        );
      }
    }

    actions.updateRecord(
      "stockAdjustments",
      adjustment.id,
      {
        status: "approved",
        decidedBy: user?.id ?? "system",
        decidedAt: new Date().toISOString(),
      },
      { summary: `Approved adjustment ${adjustment.number}` },
    );
    toast.success("Adjustment approved", `${adjustment.number} applied to stock`);
  };

  const reject = (adjustment: StockAdjustment) => {
    actions.updateRecord(
      "stockAdjustments",
      adjustment.id,
      {
        status: "rejected",
        decidedBy: user?.id ?? "system",
        decidedAt: new Date().toISOString(),
      },
      { summary: `Rejected adjustment ${adjustment.number}` },
    );
    toast.info("Adjustment rejected", adjustment.number);
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === "approve") approve(pending.adjustment);
    else reject(pending.adjustment);
    setPending(null);
  };

  const columns: Array<DataTableColumn<StockAdjustment>> = [
    {
      key: "number",
      header: "Adjustment",
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
      key: "reason",
      header: "Reason",
      value: (row) => REASON_LABEL[row.reason],
      render: (row) => (
        <span className="block min-w-0">
          <Badge tone={row.reason === "count_correction" ? "info" : "neutral"}>
            {REASON_LABEL[row.reason]}
          </Badge>
          <span className="mt-1 block truncate text-[11.5px] text-ink-faint">
            {row.notes ?? "No notes"}
          </span>
        </span>
      ),
    },
    {
      key: "delta",
      header: "Net delta",
      align: "right",
      value: (row) => row.lines.reduce((acc, line) => acc + line.quantityDelta, 0),
      render: (row) => {
        const delta = round2(row.lines.reduce((acc, line) => acc + line.quantityDelta, 0));
        return (
          <span className={delta < 0 ? "numeric text-[13px] text-destructive" : "numeric text-[13px] text-success"}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        );
      },
      mono: true,
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      value: (row) =>
        row.lines.reduce(
          (acc, line) =>
            acc +
            line.quantityDelta * (line.unitCost ?? productById.get(line.productId)?.costPrice ?? 0),
          0,
        ),
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatMoney(
            Math.abs(
              row.lines.reduce(
                (acc, line) =>
                  acc +
                  line.quantityDelta *
                    (line.unitCost ?? productById.get(line.productId)?.costPrice ?? 0),
                0,
              ),
            ),
            "",
            2,
          )}
        </span>
      ),
      mono: true,
      hideBelow: "lg",
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
      render: (row) =>
        row.status === "pending" ? (
          <span className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-label={`Approve ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setPending({ kind: "approve", adjustment: row });
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
                setPending({ kind: "reject", adjustment: row });
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </span>
        ) : null,
    },
  ];

  const pendingCount = rows.filter((row) => row.status === "pending").length;

  return (
    <AppShell>
      <PageHeader
        title="Stock adjustments"
        description="Count corrections, damage and shrinkage, with approval before anything moves."
        breadcrumbs={[{ label: "Stock", href: "/inventory" }, { label: "Adjustments" }]}
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => setFormOpen(true)}
          >
            New adjustment
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search number, reason or notes"
        searchValue={(row) =>
          `${row.number} ${REASON_LABEL[row.reason]} ${row.notes ?? ""} ${
            warehouseById.get(row.warehouseId) ?? ""
          }`
        }
        emptyTitle="No adjustments yet"
        emptyDescription="Submit an adjustment to correct counts after a cycle count."
        pageSize={12}
        exportName="stock-adjustments"
        caption="Stock adjustments"
        emptyAction={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            New adjustment
          </Button>
        }
      />

      {pendingCount > 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-muted">
          {pendingCount} adjustment{pendingCount === 1 ? "" : "s"} waiting for approval.
        </p>
      ) : null}

      {formOpen ? <AdjustmentForm onClose={() => setFormOpen(false)} /> : null}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === "approve" ? "Approve adjustment?" : "Reject adjustment?"}
        message={
          pending
            ? pending.kind === "approve"
              ? `${pending.adjustment.number} writes ${pending.adjustment.lines.length} movement${pending.adjustment.lines.length === 1 ? "" : "s"} and posts the value difference to the ledger.`
              : `${pending.adjustment.number} will be rejected. Stock is left untouched.`
            : ""
        }
        confirmLabel={pending?.kind === "approve" ? "Approve" : "Reject"}
        destructive={pending?.kind === "reject"}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
