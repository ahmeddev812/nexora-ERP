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
  archived: "neutral",
} as const;

export default function UnitsPage() {
  const data = useERPData();

  const fields = useMemo<SimpleField[]>(
    () => [
      { key: "code", label: "Code", kind: "text", required: true, mono: true, placeholder: "e.g. EA" },
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. Each" },
      {
        key: "decimals",
        label: "Decimal places",
        kind: "number",
        required: true,
        default: 0,
        hint: "How many fractions of this unit you sell: 0 for Each, 3 for Kilograms by weight.",
      },
      {
        key: "status",
        label: "Status",
        kind: "select",
        default: "active",
        options: [
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ],
      },
    ],
    [],
  );

  const columns = useMemo<SimpleColumn[]>(
    () => [
      { key: "code", header: "Code", value: (row) => String(row.code), mono: true },
      { key: "name", header: "Name", value: (row) => String(row.name) },
      {
        key: "decimals",
        header: "Decimals",
        align: "right",
        value: (row) => Number(row.decimals ?? 0),
        mono: true,
        hideBelow: "md",
      },
      {
        key: "products",
        header: "Products",
        align: "right",
        value: (row) => data.products.filter((product) => product.unitId === row.id).length,
        hideBelow: "md",
      },
      {
        key: "status",
        header: "Status",
        value: (row) => String(row.status),
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status === "active" ? "active" : "archived"]} dot>
            {row.status === "active" ? "Active" : "Archived"}
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
    [data.products],
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
          { value: "archived", label: "Archived" },
        ],
        apply: (row, value) => String(row.status) === value,
      },
    ],
    [],
  );

  return (
    <SimpleCrudPage
      entityKey="units"
      entityLabel="Unit"
      title="Units of measure"
      description="The units products are bought and sold in, with their precision."
      breadcrumbs={[{ label: "Products", href: "/products" }, { label: "Units" }]}
      fields={fields}
      columns={columns}
      filters={filters}
      defaults={{ status: "active", decimals: 0 }}
      searchPlaceholder="Search code or name"
      searchValue={(row) => `${String(row.code)} ${String(row.name)}`}
      guardDelete={(row) => {
        const used = data.products.filter((product) => product.unitId === row.id).length;
        return used > 0
          ? `${used} product${used === 1 ? "" : "s"} still measure in this unit. Change them first.`
          : null;
      }}
    />
  );
}
