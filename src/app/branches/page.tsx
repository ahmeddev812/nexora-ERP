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

export default function BranchesPage() {
  const data = useERPData();

  const fields = useMemo<SimpleField[]>(
    () => [
      { key: "code", label: "Code", kind: "text", required: true, mono: true, placeholder: "e.g. HQ" },
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. Head office" },
      { key: "address", label: "Address", kind: "text", placeholder: "Street and number" },
      { key: "city", label: "City", kind: "text", placeholder: "e.g. Austin" },
      { key: "phone", label: "Phone", kind: "text", mono: true, placeholder: "e.g. +1 512 555 0100" },
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
    [],
  );

  const columns = useMemo<SimpleColumn[]>(
    () => [
      { key: "code", header: "Code", value: (row) => String(row.code), mono: true },
      { key: "name", header: "Name", value: (row) => String(row.name) },
      {
        key: "city",
        header: "City",
        value: (row) => String(row.city ?? ""),
        hideBelow: "md",
      },
      {
        key: "phone",
        header: "Phone",
        value: (row) => String(row.phone ?? ""),
        render: (row) =>
          row.phone ? (
            <span className="numeric text-[13px] text-ink-muted">{String(row.phone)}</span>
          ) : (
            <span className="text-ink-faint">None</span>
          ),
        hideBelow: "lg",
      },
      {
        key: "warehouses",
        header: "Warehouses",
        align: "right",
        value: (row) => data.warehouses.filter((warehouse) => warehouse.branchId === row.id).length,
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
    [data.warehouses],
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
      entityKey="branches"
      entityLabel="Branch"
      title="Branches"
      description="The locations your business operates from, for documents and reporting."
      breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Branches" }]}
      fields={fields}
      columns={columns}
      filters={filters}
      defaults={{ status: "active" }}
      searchPlaceholder="Search code, name or city"
      searchValue={(row) =>
        `${String(row.code)} ${String(row.name)} ${String(row.city ?? "")}`
      }
      guardDelete={(row) => {
        const used = data.warehouses.filter((warehouse) => warehouse.branchId === row.id).length;
        return used > 0
          ? `${used} warehouse${used === 1 ? "" : "es"} still belong to this branch. Move them first.`
          : null;
      }}
    />
  );
}
