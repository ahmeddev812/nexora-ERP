"use client";

import { useMemo, useState } from "react";

import { ReceiptForm } from "@/components/purchasing/ReceiptForm";
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
import type { GoodsReceipt } from "@/types/erp";

type ReceiptStatus = GoodsReceipt["status"];

const STATUS_LABEL: Record<ReceiptStatus, string> = {
  draft: "Draft",
  posted: "Posted",
  partial: "Partial",
};

const STATUS_TONE: Record<ReceiptStatus, BadgeTone> = {
  draft: "neutral",
  posted: "success",
  partial: "warning",
};

export default function PurchaseReceiptsPage() {
  const data = useERPData();

  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const supplierById = useMemo(
    () => new Map(data.suppliers.map((supplier) => [supplier.id, supplier])),
    [data.suppliers],
  );
  const warehouseById = useMemo(
    () => new Map(data.warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [data.warehouses],
  );
  const orderById = useMemo(
    () => new Map(data.purchaseOrders.map((order) => [order.id, order])),
    [data.purchaseOrders],
  );

  const valueOf = (receipt: GoodsReceipt): number =>
    round2(
      receipt.lines.reduce((sum, line) => sum + line.receivedQuantity * line.unitCost, 0),
    );

  const rows = useMemo(() => {
    const list = [...data.goodsReceipts].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return statusFilter === "all" ? list : list.filter((row) => row.status === statusFilter);
  }, [data.goodsReceipts, statusFilter]);

  const metrics = useMemo(() => {
    const values = data.goodsReceipts.map(valueOf);
    const units = data.goodsReceipts.reduce(
      (acc, receipt) =>
        acc + receipt.lines.reduce((sum, line) => sum + line.receivedQuantity, 0),
      0,
    );
    return {
      count: data.goodsReceipts.length,
      partial: data.goodsReceipts.filter((row) => row.status === "partial").length,
      units,
      value: values.reduce((acc, value) => acc + value, 0),
    };
  }, [data.goodsReceipts]);

  const columns: Array<DataTableColumn<GoodsReceipt>> = [
    {
      key: "number",
      header: "Receipt",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "order",
      header: "Purchase order",
      value: (row) => orderById.get(row.orderId)?.number ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">
            {orderById.get(row.orderId)?.number ?? "Deleted order"}
          </span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {supplierById.get(row.supplierId)?.name ?? ""}
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
      key: "units",
      header: "Units in",
      align: "right",
      value: (row) => row.lines.reduce((sum, line) => sum + line.receivedQuantity, 0),
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {row.lines.reduce((sum, line) => sum + line.receivedQuantity, 0)}
        </span>
      ),
      mono: true,
      hideBelow: "lg",
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
      key: "value",
      header: "Value in",
      align: "right",
      value: (row) => valueOf(row),
      render: (row) => (
        <span className="numeric text-[13px] text-ink">{formatMoney(valueOf(row), "", 2)}</span>
      ),
      mono: true,
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={STATUS_TONE[row.status]} dot>{STATUS_LABEL[row.status]}</Badge>,
    },
  ];

  const toolbar = (
    <Select
      aria-label="Filter by status"
      className="w-auto min-w-[150px]"
      value={statusFilter}
      onChange={(event) => setStatusFilter(event.target.value)}
      options={[
        { value: "all", label: "All statuses" },
        { value: "posted", label: "Posted" },
        { value: "partial", label: "Partial" },
        { value: "draft", label: "Draft" },
      ]}
    />
  );

  return (
    <AppShell>
      <PageHeader
        title="Goods receipts"
        description="Every posting grows stock and values inventory against payables."
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            New receipt
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Receipts", value: String(metrics.count), hint: "All time" },
          {
            label: "Partial receipts",
            value: String(metrics.partial),
            tone: metrics.partial > 0 ? "accent" : "default",
            hint: "Orders still open",
          },
          { label: "Units received", value: String(metrics.units), hint: "Across all receipts" },
          { label: "Stock value in", value: formatMoney(metrics.value, "", 0), hint: "At unit cost" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search receipt, order or supplier"
        searchValue={(row) =>
          `${row.number} ${orderById.get(row.orderId)?.number ?? ""} ${supplierById.get(row.supplierId)?.name ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No goods receipts yet"
        emptyDescription="Send a purchase order, then post a receipt against it."
        pageSize={12}
        exportName="goods-receipts"
        caption="Goods receipts"
      />

      {formOpen ? <ReceiptForm order={null} onClose={() => setFormOpen(false)} /> : null}
    </AppShell>
  );
}
