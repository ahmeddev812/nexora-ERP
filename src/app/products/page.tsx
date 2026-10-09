"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { CsvImportButton } from "@/components/masterData/CsvImportButton";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { ProductForm } from "@/components/products/ProductForm";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2, stockAvailable, sum } from "@/lib/calculations";
import { formatMoney } from "@/lib/id";
import type { Product } from "@/types/erp";

function pick(row: Record<string, string>, ...keys: string[]): string {
  const entries = Object.entries(row);
  for (const key of keys) {
    const hit = entries.find(([name]) => name.trim().toLowerCase() === key);
    if (hit && hit[1].trim()) return hit[1].trim();
  }
  return "";
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "success",
  draft: "neutral",
  archived: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

export default function ProductsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);

  const stockByProduct = useMemo(() => {
    const map = new Map<string, { onHand: number; reserved: number }>();
    for (const balance of data.stockBalances) {
      const current = map.get(balance.productId) ?? { onHand: 0, reserved: 0 };
      current.onHand += balance.onHand;
      current.reserved += balance.reserved;
      map.set(balance.productId, current);
    }
    return map;
  }, [data.stockBalances]);

  const categoryById = useMemo(
    () => new Map(data.categories.map((category) => [category.id, category.name])),
    [data.categories],
  );
  const unitById = useMemo(
    () => new Map(data.units.map((unit) => [unit.id, unit])),
    [data.units],
  );

  const rows = useMemo(
    () =>
      data.products.filter((product) => {
        if (statusFilter !== "all" && product.status !== statusFilter) return false;
        if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;
        return true;
      }),
    [data.products, statusFilter, categoryFilter],
  );

  const stockValue = useMemo(
    () =>
      round2(
        sum(data.products, (product) => {
          const aggregate = stockByProduct.get(product.id);
          if (!aggregate || !product.trackStock) return 0;
          return aggregate.onHand * product.costPrice;
        }),
      ),
    [data.products, stockByProduct],
  );

  const lowStock = useMemo(
    () =>
      data.products.filter((product) => {
        if (product.status !== "active" || !product.trackStock) return false;
        const aggregate = stockByProduct.get(product.id);
        const available = stockAvailable({ onHand: aggregate?.onHand ?? 0, reserved: aggregate?.reserved ?? 0 });
        return available <= product.reorderLevel;
      }).length,
    [data.products, stockByProduct],
  );

  const outOfStock = useMemo(
    () =>
      data.products.filter((product) => {
        if (product.status !== "active" || !product.trackStock) return false;
        const aggregate = stockByProduct.get(product.id);
        return (aggregate?.onHand ?? 0) <= 0;
      }).length,
    [data.products, stockByProduct],
  );

  const guard = (product: Product): string | null => {
    const balances = data.stockBalances.filter((balance) => balance.productId === product.id).length;
    const movements = data.stockMovements.filter((movement) => movement.productId === product.id).length;
    const sales = data.salesOrders.filter((order) =>
      order.lines.some((line) => line.productId === product.id),
    ).length;
    const purchases = data.purchaseOrders.filter((order) =>
      order.lines.some((line) => line.productId === product.id),
    ).length;
    const total = balances + movements + sales + purchases;
    return total > 0
      ? `${balances} stock balance${balances === 1 ? "" : "s"}, ${movements} movement${movements === 1 ? "" : "s"}, ${sales} sales order${sales === 1 ? "" : "s"} and ${purchases} purchase order${purchases === 1 ? "" : "s"} still reference this product. Archive it instead of deleting.`
      : null;
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const blocked = guard(pendingDelete);
    if (blocked) {
      toast.error("Cannot delete product", blocked);
      setPendingDelete(null);
      return;
    }
    actions.deleteRecord("products", pendingDelete.id, {
      summary: `Deleted product ${pendingDelete.name}`,
    });
    toast.success("Product deleted", pendingDelete.name);
    setPendingDelete(null);
  };

  const confirmBulkDelete = () => {
    const targets = data.products.filter((product) => selected.has(product.id));
    for (const product of targets) {
      const blocked = guard(product);
      if (blocked) {
        toast.error("Cannot delete product", `${product.name}: ${blocked}`);
        setBulkOpen(false);
        setSelected(new Set());
        return;
      }
    }
    const count = actions.bulkDelete(
      "products",
      targets.map((product) => product.id),
      { summary: `Deleted ${targets.length} product records` },
    );
    toast.success(`${count} product${count === 1 ? "" : "s"} deleted`);
    setBulkOpen(false);
    setSelected(new Set());
  };

  const importProducts = (rowsIn: Array<Record<string, string>>): number => {
    const skus = new Set(data.products.map((product) => product.sku));
    let created = 0;
    for (const row of rowsIn) {
      const name = pick(row, "name", "product", "product name");
      if (!name) continue;

      let sku = pick(row, "sku", "code");
      if (!sku || skus.has(sku)) {
        let index = 1;
        sku = `SKU-${String(index).padStart(4, "0")}`;
        while (skus.has(sku)) {
          index += 1;
          sku = `SKU-${String(index).padStart(4, "0")}`;
        }
      }
      skus.add(sku);

      const categoryName = pick(row, "category").toLowerCase();
      const category =
        data.categories.find((entry) => entry.name.toLowerCase() === categoryName) ?? null;
      const unitName = pick(row, "unit").toLowerCase();
      const unit = data.units.find((entry) => entry.name.toLowerCase() === unitName || entry.code.toLowerCase() === unitName) ?? null;

      actions.createRecord(
        "products",
        {
          sku,
          name,
          barcode: pick(row, "barcode") || undefined,
          categoryId: category ? category.id : null,
          unitId: unit ? unit.id : null,
          supplierId: null,
          costPrice: Number(pick(row, "cost", "cost price") || 0),
          sellPrice: Number(pick(row, "price", "sell price", "sellprice") || 0),
          taxRate: Number(pick(row, "tax", "tax rate") || 0),
          reorderLevel: Number(pick(row, "reorder", "reorder level") || 0),
          trackStock: pick(row, "track stock").toLowerCase() !== "no",
          status: (["active", "draft", "archived"].includes(pick(row, "status").toLowerCase())
            ? pick(row, "status").toLowerCase()
            : "active") as Product["status"],
        } as unknown as Product,
        { action: "import", summary: `Imported product ${name}` },
      );
      created += 1;
    }
    return created;
  };

  const columns: Array<DataTableColumn<Product>> = [
    {
      key: "name",
      header: "Product",
      value: (row) => row.name,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] font-medium text-ink">{row.name}</span>
          <span className="numeric block text-[11.5px] text-ink-faint">{row.sku}</span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      value: (row) => (row.categoryId ? categoryById.get(row.categoryId) ?? "" : ""),
      render: (row) => (
        <span className="text-[13px] text-ink-muted">
          {row.categoryId ? categoryById.get(row.categoryId) ?? "Uncategorised" : "Uncategorised"}
        </span>
      ),
      hideBelow: "md",
    },
    {
      key: "unit",
      header: "Unit",
      value: (row) => (row.unitId ? unitById.get(row.unitId)?.code ?? "" : ""),
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {row.unitId ? unitById.get(row.unitId)?.code ?? "-" : "-"}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      value: (row) => row.costPrice,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatMoney(row.costPrice, "", 2)}</span>
      ),
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      value: (row) => row.sellPrice,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">{formatMoney(row.sellPrice, "", 2)}</span>
      ),
      mono: true,
    },
    {
      key: "stock",
      header: "On hand",
      align: "right",
      value: (row) => {
        const aggregate = stockByProduct.get(row.id);
        return row.trackStock ? aggregate?.onHand ?? 0 : -1;
      },
      render: (row) => {
        if (!row.trackStock) return <span className="text-[13px] text-ink-faint">Not tracked</span>;
        const aggregate = stockByProduct.get(row.id);
        const available = stockAvailable({
          onHand: aggregate?.onHand ?? 0,
          reserved: aggregate?.reserved ?? 0,
        });
        const low = available <= row.reorderLevel;
        return (
          <span className={low ? "numeric text-[13px] text-destructive" : "numeric text-[13px] text-ink"}>
            {available}
          </span>
        );
      },
      mono: true,
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => (
        <Badge tone={STATUS_TONE[row.status] ?? "neutral"} dot>
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <span className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            aria-label={`Edit ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setEditing(row);
              setFormOpen(true);
            }}
            className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Pencil size={13} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setPendingDelete(row);
            }}
            className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </span>
      ),
    },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[140px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "draft", label: "Draft" },
          { value: "archived", label: "Archived" },
        ]}
      />
      <Select
        aria-label="Filter by category"
        className="w-auto min-w-[160px]"
        value={categoryFilter}
        onChange={(event) => setCategoryFilter(event.target.value)}
        options={[
          { value: "all", label: "All categories" },
          ...data.categories.map((category) => ({ value: category.id, label: category.name })),
        ]}
      />
      <CsvImportButton onImport={importProducts} />
      {selected.size > 0 ? (
        <div className="flex items-center gap-2">
          <span className="numeric rounded-tag border border-primary/25 bg-primary-soft px-2 py-1 text-[11.5px] font-medium text-primary">
            {selected.size} selected
          </span>
          <Button variant="destructive" size="sm" onClick={() => setBulkOpen(true)}>
            Delete selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Products"
        description="Catalogue, pricing and stock positions across every warehouse."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New product
          </Button>
        }
      />

      <SummaryStrip
        items={[
          {
            label: "Products",
            value: String(data.products.length),
            hint: `${data.products.filter((product) => product.status === "active").length} active`,
          },
          { label: "Stock value", value: formatMoney(stockValue, "", 0), hint: "On hand at cost" },
          {
            label: "Low stock",
            value: String(lowStock),
            tone: lowStock > 0 ? "accent" : "default",
            hint: "At or below reorder level",
          },
          {
            label: "Out of stock",
            value: String(outOfStock),
            tone: outOfStock > 0 ? "destructive" : "default",
            hint: "Zero on hand",
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search name, SKU or barcode"
        searchValue={(row) => `${row.name} ${row.sku} ${row.barcode ?? ""}`}
        toolbar={toolbar}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        emptyTitle="No products yet"
        emptyDescription="Add a product manually or import a CSV of your existing catalogue."
        pageSize={12}
        exportName="products"
        caption="Product catalogue"
      />

      {formOpen ? <ProductForm product={editing} onClose={() => setFormOpen(false)} /> : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete product?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be removed from this workspace. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={bulkOpen}
        title={`Delete ${selected.size} products?`}
        message={`${selected.size} product${selected.size === 1 ? "" : "s"} will be removed from this workspace. This cannot be undone.`}
        confirmLabel="Delete selected"
        destructive
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkOpen(false)}
      />
    </AppShell>
  );
}
