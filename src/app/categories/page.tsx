"use client";

import { useMemo } from "react";

import {
  SimpleCrudPage,
  type SimpleColumn,
  type SimpleField,
  type SimpleFilter,
  type SimpleRow,
} from "@/components/masterData/SimpleCrudPage";
import { Badge } from "@/components/ui/Badge";
import { useERPData } from "@/hooks/useERPData";
import { formatDateTime } from "@/lib/dates";

const STATUS_TONE = {
  active: "success",
  archived: "neutral",
} as const;

function statusCell(row: SimpleRow) {
  const status = row.status === "active" ? "active" : "archived";
  return <Badge tone={STATUS_TONE[status]} dot>{status === "active" ? "Active" : "Archived"}</Badge>;
}

export default function CategoriesPage() {
  const data = useERPData();

  const fields = useMemo<SimpleField[]>(
    () => [
      { key: "code", label: "Code", kind: "text", required: true, mono: true, placeholder: "e.g. CAT-001" },
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. Accessories" },
      {
        key: "parentId",
        label: "Parent category",
        kind: "select",
        options: [
          { value: "", label: "None (top level)" },
          ...data.categories.map((category) => ({ value: category.id, label: category.name })),
        ],
      },
      {
        key: "description",
        label: "Description",
        kind: "textarea",
        hint: "Shown on product forms and reports.",
        placeholder: "What this group covers.",
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
    [data.categories],
  );

  const columns = useMemo<SimpleColumn[]>(
    () => [
      { key: "code", header: "Code", value: (row) => String(row.code), mono: true },
      { key: "name", header: "Name", value: (row) => String(row.name) },
      {
        key: "parent",
        header: "Parent",
        value: (row) => {
          const parent = data.categories.find((entry) => entry.id === row.parentId);
          return parent?.name ?? "Top level";
        },
        hideBelow: "md",
      },
      { key: "products", header: "Products", align: "right", value: (row) => data.products.filter((product) => product.categoryId === row.id).length, hideBelow: "lg" },
      {
        key: "status",
        header: "Status",
        value: (row) => String(row.status),
        render: statusCell,
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
    [data.categories, data.products],
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
      entityKey="categories"
      entityLabel="Category"
      title="Categories"
      description="Groups that organise your catalogue and roll up in reports."
      breadcrumbs={[{ label: "Products", href: "/products" }, { label: "Categories" }]}
      fields={fields}
      columns={columns}
      filters={filters}
      defaults={{ parentId: null, status: "active" }}
      searchPlaceholder="Search code or name"
      searchValue={(row) => `${String(row.code)} ${String(row.name)}`}
      guardDelete={(row) => {
        const used = data.products.filter((product) => product.categoryId === row.id).length;
        return used > 0
          ? `${used} product${used === 1 ? "" : "s"} still use this category. Reassign them first.`
          : null;
      }}
    />
  );
}
