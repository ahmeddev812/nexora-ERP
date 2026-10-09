"use client";

import { useMemo, useState } from "react";

import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useERPData } from "@/hooks/useERPData";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { StockMovement, StockMovementType } from "@/types/erp";

const TYPE_LABEL: Record<StockMovementType, string> = {
  opening: "Opening balance",
  receipt: "Goods receipt",
  delivery: "Delivery",
  sale: "Sale",
  return_in: "Customer return in",
  return_out: "Sales return out",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  adjustment: "Adjustment",
  reservation: "Reserved",
  reservation_release: "Reservation released",
};

const TYPE_TONE: Record<StockMovementType, BadgeTone> = {
  opening: "neutral",
  receipt: "success",
  delivery: "primary",
  sale: "primary",
  return_in: "success",
  return_out: "warning",
  transfer_in: "success",
  transfer_out: "accent",
  adjustment: "warning",
  reservation: "info",
  reservation_release: "neutral",
};

const REF_LABEL: Record<string, string> = {
  sales_order: "Sales order",
  delivery: "Delivery",
  sales_invoice: "Invoice",
  stock_transfer: "Transfer",
  stock_adjustment: "Adjustment",
  goods_receipt: "Receipt",
  purchase_order: "Purchase order",
  supplier_bill: "Bill",
  customer_return: "Return",
  purchase_return: "Purchase return",
  stock_reservation: "Reservation",
  opening: "Opening",
};

export default function StockMovementsPage() {
  const data = useERPData();

  const [typeFilter, setTypeFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );
  const warehouseById = useMemo(
    () => new Map(data.warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [data.warehouses],
  );

  const rows = useMemo(() => {
    const list = data.stockMovements
      .map((movement) => {
        const product = productById.get(movement.productId);
        if (!product) return null;
        return {
          ...movement,
          sku: product.sku,
          productName: product.name,
          warehouseName: warehouseById.get(movement.warehouseId) ?? "Unassigned",
        };
      })
      .filter((row): row is StockMovement & {
        sku: string;
        productName: string;
        warehouseName: string;
      } => row !== null);

    return list
      .filter((row) => {
        if (typeFilter !== "all" && row.type !== typeFilter) return false;
        if (warehouseFilter !== "all" && row.warehouseId !== warehouseFilter) return false;
        return true;
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }, [data.stockMovements, productById, warehouseById, typeFilter, warehouseFilter]);

  const totals = useMemo(() => {
    const count = rows.length;
    const inbound = rows
      .filter((row) => row.quantity > 0)
      .reduce((acc, row) => acc + Math.abs(row.quantity), 0);
    const outbound = rows
      .filter((row) => row.quantity < 0)
      .reduce((acc, row) => acc + Math.abs(row.quantity), 0);
    return { count, inbound, outbound };
  }, [rows]);

  const columns: Array<
    DataTableColumn<StockMovement & { sku: string; productName: string; warehouseName: string }>
  > = [
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
      key: "type",
      header: "Type",
      value: (row) => row.type,
      render: (row) => <Badge tone={TYPE_TONE[row.type] ?? "neutral"}>{TYPE_LABEL[row.type] ?? row.type}</Badge>,
    },
    {
      key: "product",
      header: "Product",
      value: (row) => `${row.sku} ${row.productName}`,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">{row.productName}</span>
          <span className="numeric block text-[11.5px] text-ink-faint">{row.sku}</span>
        </span>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      value: (row) => row.warehouseName,
      render: (row) => <span className="text-[13px] text-ink-muted">{row.warehouseName}</span>,
      hideBelow: "md",
    },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      value: (row) => row.quantity,
      render: (row) => (
        <span
          className={
            row.quantity < 0
              ? "numeric text-[13px] text-destructive"
              : row.quantity > 0
                ? "numeric text-[13px] text-success"
                : "numeric text-[13px] text-ink-faint"
          }
        >
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
      mono: true,
    },
    {
      key: "balanceAfter",
      header: "Balance after",
      align: "right",
      value: (row) => row.balanceAfter,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.balanceAfter}</span>,
      mono: true,
      hideBelow: "md",
    },
    {
      key: "unitCost",
      header: "Unit cost",
      align: "right",
      value: (row) => row.unitCost,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {formatMoney(row.unitCost, "", 2)}
        </span>
      ),
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "ref",
      header: "Reference",
      value: (row) => row.refNumber ?? row.refType,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13px] text-ink">{row.refNumber ?? "Manual"}</span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {REF_LABEL[row.refType] ?? row.refType}
          </span>
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "notes",
      header: "Notes",
      value: (row) => row.notes ?? "",
      render: (row) => (
        <span className="block truncate text-[13px] text-ink-muted">{row.notes ?? "-"}</span>
      ),
      hideBelow: "xl",
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by movement type"
        className="w-auto min-w-[170px]"
        value={typeFilter}
        onChange={(event) => setTypeFilter(event.target.value)}
        options={[
          { value: "all", label: "All movement types" },
          ...(Object.keys(TYPE_LABEL) as StockMovementType[]).map((type) => ({
            value: type,
            label: TYPE_LABEL[type],
          })),
        ]}
      />
      <Select
        aria-label="Filter by warehouse"
        className="w-auto min-w-[160px]"
        value={warehouseFilter}
        onChange={(event) => setWarehouseFilter(event.target.value)}
        options={[
          { value: "all", label: "All warehouses" },
          ...data.warehouses.map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
          })),
        ]}
      />
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Stock movements"
        description="Immutable ledger of every quantity change, with the balance that resulted."
        breadcrumbs={[{ label: "Stock", href: "/inventory" }, { label: "Movements" }]}
      />

      <SummaryStrip
        items={[
          { label: "Entries shown", value: String(totals.count) },
          { label: "Units in", value: `+${totals.inbound}`, tone: "success" },
          { label: "Units out", value: `-${totals.outbound}`, tone: "accent" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search SKU, product, reference or notes"
        searchValue={(row) =>
          `${row.sku} ${row.productName} ${row.refNumber ?? ""} ${row.notes ?? ""}`
        }
        toolbar={toolbar}
        emptyTitle="No movements yet"
        emptyDescription="Every receipt, transfer, adjustment and sale writes a row here."
        pageSize={20}
        exportName="stock-movements"
        caption="Stock movement ledger"
      />
    </AppShell>
  );
}
