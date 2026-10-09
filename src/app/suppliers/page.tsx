"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { CsvImportButton } from "@/components/masterData/CsvImportButton";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import {
  calculatePayables,
  invoiceBalance,
  isActiveBill,
  round2,
  sum,
} from "@/lib/calculations";
import { isOverdue, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Supplier } from "@/types/erp";

function pick(row: Record<string, string>, ...keys: string[]): string {
  const entries = Object.entries(row);
  for (const key of keys) {
    const hit = entries.find(([name]) => name.trim().toLowerCase() === key);
    if (hit && hit[1].trim()) return hit[1].trim();
  }
  return "";
}

const money = (value: number) => formatMoney(value, "", 0);

export default function SuppliersPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const router = useRouter();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);

  const today = todayKey();

  const payableBySupplier = useMemo(() => {
    const map = new Map<string, number>();
    for (const bill of data.supplierBills) {
      if (!isActiveBill(bill)) continue;
      const balance = invoiceBalance(bill);
      if (balance > 0) {
        map.set(bill.supplierId, round2((map.get(bill.supplierId) ?? 0) + balance));
      }
    }
    for (const supplier of data.suppliers) {
      if (supplier.openingBalance > 0) {
        map.set(
          supplier.id,
          round2((map.get(supplier.id) ?? 0) + supplier.openingBalance),
        );
      }
    }
    return map;
  }, [data.supplierBills, data.suppliers]);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const supplier of data.suppliers) {
      for (const tag of supplier.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [data.suppliers]);

  const rows = useMemo(
    () =>
      data.suppliers.filter((supplier) => {
        if (statusFilter !== "all" && supplier.status !== statusFilter) return false;
        if (tagFilter !== "all" && !supplier.tags.includes(tagFilter)) return false;
        return true;
      }),
    [data.suppliers, statusFilter, tagFilter],
  );

  const payables = useMemo(
    () => calculatePayables(data.supplierBills) + sum(data.suppliers, (supplier) => supplier.openingBalance),
    [data.supplierBills, data.suppliers],
  );

  const overdueCount = useMemo(
    () =>
      data.supplierBills.filter(
        (bill) =>
          isActiveBill(bill) &&
          invoiceBalance(bill) > 0 &&
          isOverdue(bill.dueDate, today),
      ).length,
    [data.supplierBills, today],
  );

  const openOrders = useMemo(
    () =>
      data.purchaseOrders.filter(
        (order) => order.status === "draft" || order.status === "sent" || order.status === "partially_received",
      ).length,
    [data.purchaseOrders],
  );

  const guard = (supplier: Supplier): string | null => {
    const orders = data.purchaseOrders.filter((order) => order.supplierId === supplier.id).length;
    const bills = data.supplierBills.filter((bill) => bill.supplierId === supplier.id).length;
    const receipts = data.goodsReceipts.filter((receipt) => receipt.supplierId === supplier.id).length;
    return orders + bills + receipts > 0
      ? `${bills} bill${bills === 1 ? "" : "s"}, ${orders} purchase order${orders === 1 ? "" : "s"} and ${receipts} receipt${receipts === 1 ? "" : "s"} still belong to this supplier. Archive it instead of deleting.`
      : null;
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const blocked = guard(pendingDelete);
    if (blocked) {
      toast.error("Cannot delete supplier", blocked);
      setPendingDelete(null);
      return;
    }
    actions.deleteRecord("suppliers", pendingDelete.id, {
      summary: `Deleted supplier ${pendingDelete.name}`,
    });
    toast.success("Supplier deleted", pendingDelete.name);
    setPendingDelete(null);
  };

  const confirmBulkDelete = () => {
    const targets = data.suppliers.filter((supplier) => selected.has(supplier.id));
    for (const supplier of targets) {
      const blocked = guard(supplier);
      if (blocked) {
        toast.error("Cannot delete supplier", `${supplier.name}: ${blocked}`);
        setBulkOpen(false);
        setSelected(new Set());
        return;
      }
    }
    const count = actions.bulkDelete(
      "suppliers",
      targets.map((supplier) => supplier.id),
      { summary: `Deleted ${targets.length} supplier records` },
    );
    toast.success(`${count} supplier${count === 1 ? "" : "s"} deleted`);
    setBulkOpen(false);
    setSelected(new Set());
  };

  const importSuppliers = (rowsIn: Array<Record<string, string>>): number => {
    const codes = new Set(data.suppliers.map((supplier) => supplier.code));
    let created = 0;
    for (const row of rowsIn) {
      const name = pick(row, "name", "supplier", "supplier name");
      if (!name) continue;

      let code = pick(row, "code", "supplier code");
      if (!code || codes.has(code)) {
        let index = 1;
        code = `SUP-${String(index).padStart(3, "0")}`;
        while (codes.has(code)) {
          index += 1;
          code = `SUP-${String(index).padStart(3, "0")}`;
        }
      }
      codes.add(code);

      const tags = pick(row, "tags", "tag")
        .split(/[;,|]/)
        .map((tag) => tag.trim())
        .filter(Boolean);

      actions.createRecord(
        "suppliers",
        {
          code,
          name,
          contactName: pick(row, "contact", "contact name") || undefined,
          email: pick(row, "email") || undefined,
          phone: pick(row, "phone") || undefined,
          city: pick(row, "city") || undefined,
          country: pick(row, "country") || undefined,
          address: pick(row, "address") || undefined,
          tags: [...new Set(tags)],
          paymentTerms: Number(pick(row, "payment terms", "terms") || 30),
          currency: data.business?.currency ?? "USD",
          openingBalance: 0,
          status: pick(row, "status") === "archived" ? "archived" : "active",
        } as unknown as Supplier,
        { action: "import", summary: `Imported supplier ${name}` },
      );
      created += 1;
    }
    return created;
  };

  const columns: Array<DataTableColumn<Supplier>> = [
    {
      key: "name",
      header: "Supplier",
      value: (row) => row.name,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] font-medium text-ink">{row.name}</span>
          <span className="numeric block text-[11.5px] text-ink-faint">{row.code}</span>
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      value: (row) => row.contactName ?? row.email ?? "",
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13px] text-ink">{row.contactName ?? "No contact"}</span>
          <span className="block truncate text-[11.5px] text-ink-faint">{row.email ?? row.phone ?? "No email"}</span>
        </span>
      ),
      hideBelow: "md",
    },
    {
      key: "city",
      header: "Location",
      value: (row) => row.city ?? row.country ?? "",
      render: (row) => (
        <span className="text-[13px] text-ink-muted">
          {[row.city, row.country].filter(Boolean).join(", ") || "Not set"}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "terms",
      header: "Terms",
      align: "right",
      value: (row) => row.paymentTerms,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">
          {row.paymentTerms > 0 ? `${row.paymentTerms} d` : "Due on receipt"}
        </span>
      ),
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "payable",
      header: "Payable",
      align: "right",
      value: (row) => payableBySupplier.get(row.id) ?? 0,
      render: (row) => {
        const balance = payableBySupplier.get(row.id) ?? 0;
        return (
          <span className={balance > 0 ? "numeric text-[13px] text-ink" : "numeric text-[13px] text-ink-faint"}>
            {money(balance)}
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
        <Badge tone={row.status === "active" ? "success" : "neutral"} dot>
          {row.status === "active" ? "Active" : "Archived"}
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
          { value: "archived", label: "Archived" },
        ]}
      />
      <Select
        aria-label="Filter by tag"
        className="w-auto min-w-[140px]"
        value={tagFilter}
        onChange={(event) => setTagFilter(event.target.value)}
        options={[
          { value: "all", label: "All tags" },
          ...tagOptions.map((tag) => ({ value: tag, label: tag })),
        ]}
      />
      <CsvImportButton onImport={importSuppliers} />
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
        title="Suppliers"
        description="The vendors you buy from, with payables pulled from live bills."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New supplier
          </Button>
        }
      />

      <SummaryStrip
        items={[
          {
            label: "Suppliers",
            value: String(data.suppliers.length),
            hint: `${data.suppliers.filter((supplier) => supplier.status === "active").length} active`,
          },
          {
            label: "Payables",
            value: money(payables),
            tone: payables > 0 ? "accent" : "default",
            hint: "Unpaid bills and balances",
          },
          {
            label: "Overdue bills",
            value: String(overdueCount),
            tone: overdueCount > 0 ? "destructive" : "default",
            hint: "Past their due date",
          },
          { label: "Open orders", value: String(openOrders), hint: "Awaiting full receipt" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
        searchPlaceholder="Search name, code, email or tag"
        searchValue={(row) =>
          `${row.name} ${row.code} ${row.email ?? ""} ${row.contactName ?? ""} ${row.tags.join(" ")}`
        }
        toolbar={toolbar}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        emptyTitle="No suppliers yet"
        emptyDescription="Add a supplier manually or import a CSV of your existing vendors."
        pageSize={12}
        exportName="suppliers"
        caption="Supplier accounts"
      />

      {formOpen ? <SupplierForm supplier={editing} onClose={() => setFormOpen(false)} /> : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete supplier?"
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
        title={`Delete ${selected.size} suppliers?`}
        message={`${selected.size} supplier${selected.size === 1 ? "" : "s"} will be removed from this workspace. This cannot be undone.`}
        confirmLabel="Delete selected"
        destructive
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkOpen(false)}
      />
    </AppShell>
  );
}
