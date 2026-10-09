"use client";

import { useMemo } from "react";

import {
  SimpleCrudPage,
  type SimpleColumn,
  type SimpleField,
  type SimpleFilter,
} from "@/components/masterData/SimpleCrudPage";
import { Badge } from "@/components/ui/Badge";
import { useERPData } from "@/hooks/useERPData";
import { formatDateTime } from "@/lib/dates";

const STATUS_TONE = {
  active: "success",
  inactive: "neutral",
} as const;

export default function WarehousesPage() {
  const data = useERPData();

  const fields = useMemo<SimpleField[]>(
    () => [
      { key: "code", label: "Code", kind: "text", required: true, mono: true, placeholder: "e.g. WH-01" },
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. Central store" },
      {
        key: "branchId",
        label: "Branch",
        kind: "select",
        options: [
          { value: "", label: "No branch" },
          ...data.branches.map((branch) => ({ value: branch.id, label: branch.name })),
        ],
      },
      {
        key: "isDefault",
        label: "Default warehouse",
        kind: "checkbox",
        hint: "New documents start here.",
      },
      {
        key: "status",
        label: "Status",
        kind: "select",
        default: "active",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [data.branches],
  );

  const columns = useMemo<SimpleColumn[]>(
    () => [
      { key: "code", header: "Code", value: (row) => String(row.code), mono: true },
      { key: "name", header: "Name", value: (row) => String(row.name) },
      {
        key: "branch",
        header: "Branch",
        value: (row) => {
          const branch = data.branches.find((entry) => entry.id === row.branchId);
          return branch?.name ?? "No branch";
        },
        hideBelow: "md",
      },
      {
        key: "stock",
        header: "Stock lines",
        align: "right",
        value: (row) => data.stockBalances.filter((balance) => balance.warehouseId === row.id).length,
        hideBelow: "lg",
      },
      {
        key: "isDefault",
        header: "Default",
        value: (row) => (row.isDefault ? "Yes" : "No"),
        render: (row) =>
          row.isDefault ? (
            <Badge tone="accent">Default</Badge>
          ) : (
            <span className="text-ink-faint">No</span>
          ),
        hideBelow: "md",
      },
      {
        key: "status",
        header: "Status",
        value: (row) => String(row.status),
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status === "active" ? "active" : "inactive"]} dot>
            {row.status === "active" ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        header: "Updated",
        value: (row) => String(row.updatedAt ?? ""),
        render: (row) => (
          <span className="numeric text-[12.5px] text-ink-muted">
            {formatDateTime(String(row.updatedAt ?? ""), "us")}
          </span>
        ),
        hideBelow: "lg",
      },
    ],
    [data.branches, data.stockBalances],
  );

  const filters = useMemo<SimpleFilter[]>(
    () => [
      {
        key: "status",
        label: "Status",
        default: "all",
        options: [
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
        apply: (row, value) => String(row.status) === value,
      },
    ],
    [],
  );

  return (
    <SimpleCrudPage
      entityKey="warehouses"
      entityLabel="Warehouse"
      title="Warehouses"
      description="Where stock is held. Every balance and movement belongs to one."
      breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Warehouses" }]}
      fields={fields}
      columns={columns}
      filters={filters}
      defaults={{ branchId: null, isDefault: false, status: "active" }}
      searchPlaceholder="Search code or name"
      searchValue={(row) => `${String(row.code)} ${String(row.name)}`}
      guardDelete={(row) => {
        const id = String(row.id);
        const lines = data.stockBalances.filter((balance) => balance.warehouseId === id).length;
        if (lines > 0) {
          return `${lines} stock line${lines === 1 ? "" : "s"} still sit in this warehouse. Move or adjust them first.`;
        }
        if (data.warehouses.length <= 1) {
          return "This is the last warehouse in the workspace. Create another one first.";
        }
        return null;
      }}
    />
  );
}
