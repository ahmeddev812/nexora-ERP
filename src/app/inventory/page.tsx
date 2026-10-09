"use client";

import { useMemo, useState } from "react";

import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useERPData } from "@/hooks/useERPData";
import { round2, stockStatus, type StockStatus } from "@/lib/calculations";
import { formatMoney } from "@/lib/id";

const STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const STATUS_TONE: Record<StockStatus, BadgeTone> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "destructive",
};

interface StockRow {
  id: string;
  sku: string;
  name: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  reorder: number;
  status: StockStatus;
  tracked: boolean;
}

export default function StockOverviewPage() {
  const data = useERPData();

  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const warehouseById = useMemo(
    () => new Map(data.warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [data.warehouses],
  );
  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const rows = useMemo<StockRow[]>(() => {
    const out: StockRow[] = [];
    for (const balance of data.stockBalances) {
      const product = productById.get(balance.productId);
      if (!product) continue;
      const available = round2(balance.onHand - balance.reserved);
      const status = stockStatus(product, available);
      out.push({
        id: balance.id,
        sku: product.sku,
        name: product.name,
        warehouseId: balance.warehouseId,
        warehouseName: warehouseById.get(balance.warehouseId) ?? "Unassigned",
        onHand: balance.onHand,
        reserved: balance.reserved,
        available,
        reorder: product.reorderLevel,
        status,
        tracked: product.trackStock,
      });
    }
    return out;
  }, [data.stockBalances, productById, warehouseById]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (warehouseFilter !== "all" && row.warehouseId !== warehouseFilter) return false;
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        return true;
      }),
    [rows, warehouseFilter, statusFilter],
  );

  const metrics = useMemo(() => {
    const skus = new Set(rows.map((row) => row.sku));
    const stockValue = round2(
      data.stockBalances.reduce((acc, balance) => {
        const product = productById.get(balance.productId);
        return product ? acc + balance.onHand * product.costPrice : acc;
      }, 0),
    );
    const low = new Set(rows.filter((row) => row.status === "low_stock").map((row) => row.sku));
    const out = new Set(rows.filter((row) => row.status === "out_of_stock").map((row) => row.sku));
    return { skus: skus.size, stockValue, low: low.size, out: out.size };
  }, [rows, data.stockBalances, productById]);

  const columns: Array<DataTableColumn<StockRow>> = [
    {
      key: "sku",
      header: "SKU",
      value: (row) => row.sku,
      render: (row) => <span className="numeric text-[12.5px] text-ink-muted">{row.sku}</span>,
      mono: true,
      width: "130px",
    },
    {
      key: "name",
      header: "Product",
      value: (row) => row.name,
      render: (row) => <span className="truncate text-[13.5px] text-ink">{row.name}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      value: (row) => row.warehouseName,
      render: (row) => <span className="text-[13px] text-ink-muted">{row.warehouseName}</span>,
      hideBelow: "md",
    },
    {
      key: "onHand",
      header: "On hand",
      align: "right",
      value: (row) => row.onHand,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.onHand}</span>,
      mono: true,
    },
    {
      key: "reserved",
      header: "Reserved",
      align: "right",
      value: (row) => row.reserved,
      render: (row) => (
        <span className={row.reserved > 0 ? "numeric text-[13px] text-ink-muted" : "numeric text-[13px] text-ink-faint"}>
          {row.reserved}
        </span>
      ),
      mono: true,
      hideBelow: "md",
    },
    {
      key: "available",
      header: "Available",
      align: "right",
      value: (row) => row.available,
      render: (row) => (
        <span className={row.available <= 0 ? "numeric text-[13px] text-destructive" : "numeric text-[13px] text-ink"}>
          {row.available}
        </span>
      ),
      mono: true,
    },
    {
      key: "reorder",
      header: "Reorder",
      align: "right",
      value: (row) => row.reorder,
      render: (row) => <span className="numeric text-[13px] text-ink-faint">{row.reorder}</span>,
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) =>
        row.tracked ? (
          <Badge tone={STATUS_TONE[row.status]} dot>
            {STATUS_LABEL[row.status]}
          </Badge>
        ) : (
          <Badge tone="neutral">Not tracked</Badge>
        ),
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
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
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[150px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          { value: "in_stock", label: "In stock" },
          { value: "low_stock", label: "Low stock" },
          { value: "out_of_stock", label: "Out of stock" },
        ]}
      />
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Stock"
        description="On-hand, reserved and available quantities for every item in every warehouse."
      />

      <SummaryStrip
        items={[
          { label: "Stocked SKUs", value: String(metrics.skus), hint: `${rows.length} warehouse positions` },
          { label: "Stock value", value: formatMoney(metrics.stockValue, "", 0), hint: "On hand at cost" },
          {
            label: "Low stock",
            value: String(metrics.low),
            tone: metrics.low > 0 ? "accent" : "default",
            hint: "At or below reorder level",
          },
          {
            label: "Out of stock",
            value: String(metrics.out),
            tone: metrics.out > 0 ? "destructive" : "default",
            hint: "Nothing available",
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        searchPlaceholder="Search SKU, product or warehouse"
        searchValue={(row) => `${row.sku} ${row.name} ${row.warehouseName}`}
        toolbar={toolbar}
        emptyTitle="No stock positions yet"
        emptyDescription="Balances appear once goods are received, transferred or adjusted."
        pageSize={15}
        exportName="stock-overview"
        caption="Stock overview"
      />
    </AppShell>
  );
}
