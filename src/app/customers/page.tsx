"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { CustomerForm } from "@/components/customers/CustomerForm";
import { CsvImportButton } from "@/components/masterData/CsvImportButton";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { invoiceBalance, isActiveSale, round2, sum } from "@/lib/calculations";
import { isOverdue, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Customer } from "@/types/erp";

function pick(row: Record<string, string>, ...keys: string[]): string {
  const entries = Object.entries(row);
  for (const key of keys) {
    const hit = entries.find(([name]) => name.trim().toLowerCase() === key);
    if (hit && hit[1].trim()) return hit[1].trim();
  }
  return "";
}

const money = (value: number) => formatMoney(value, "", 0);

export default function CustomersPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const router = useRouter();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);

  const balanceByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const invoice of data.salesInvoices) {
      if (!isActiveSale(invoice)) continue;
      const balance = invoiceBalance(invoice);
      if (balance > 0) {
        map.set(invoice.customerId, round2((map.get(invoice.customerId) ?? 0) + balance));
      }
    }
    return map;
  }, [data.salesInvoices]);

  const today = todayKey();

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const customer of data.customers) {
      for (const tag of customer.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [data.customers]);

  const rows = useMemo(
    () =>
      data.customers.filter((customer) => {
        if (statusFilter !== "all" && customer.status !== statusFilter) return false;
        if (tagFilter !== "all" && !customer.tags.includes(tagFilter)) return false;
        return true;
      }),
    [data.customers, statusFilter, tagFilter],
  );

  const outstanding = useMemo(
    () => round2(sum([...balanceByCustomer.values()], (value) => value)),
    [balanceByCustomer],
  );

  const overdueCount = useMemo(
    () =>
      data.salesInvoices.filter(
        (invoice) =>
          isActiveSale(invoice) &&
          invoiceBalance(invoice) > 0 &&
          isOverdue(invoice.dueDate, today),
      ).length,
    [data.salesInvoices, today],
  );

  const guard = (customer: Customer): string | null => {
    const orders = data.salesOrders.filter((order) => order.customerId === customer.id).length;
    const invoices = data.salesInvoices.filter(
      (invoice) => invoice.customerId === customer.id,
    ).length;
    const quotes = data.quotations.filter((quote) => quote.customerId === customer.id).length;
    const total = orders + invoices + quotes;
    return total > 0
      ? `${invoices} invoice${invoices === 1 ? "" : "s"}, ${orders} order${orders === 1 ? "" : "s"} and ${quotes} quotation${quotes === 1 ? "" : "s"} still belong to this customer. Archive it instead of deleting.`
      : null;
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const blocked = guard(pendingDelete);
    if (blocked) {
      toast.error("Cannot delete customer", blocked);
      setPendingDelete(null);
      return;
    }
    actions.deleteRecord("customers", pendingDelete.id, {
      summary: `Deleted customer ${pendingDelete.name}`,
    });
    toast.success("Customer deleted", pendingDelete.name);
    setPendingDelete(null);
  };

  const confirmBulkDelete = () => {
    const targets = data.customers.filter((customer) => selected.has(customer.id));
    for (const customer of targets) {
      const blocked = guard(customer);
      if (blocked) {
        toast.error("Cannot delete customer", `${customer.name}: ${blocked}`);
        setBulkOpen(false);
        setSelected(new Set());
        return;
      }
    }
    const count = actions.bulkDelete(
      "customers",
      targets.map((customer) => customer.id),
      { summary: `Deleted ${targets.length} customer records` },
    );
    toast.success(`${count} customer${count === 1 ? "" : "s"} deleted`);
    setBulkOpen(false);
    setSelected(new Set());
  };

  const importCustomers = (rowsIn: Array<Record<string, string>>): number => {
    const codes = new Set(data.customers.map((customer) => customer.code));
    let created = 0;
    for (const row of rowsIn) {
      const name = pick(row, "name", "customer", "customer name");
      if (!name) continue;

      let code = pick(row, "code", "customer code");
      if (!code || codes.has(code)) {
        let index = 1;
        code = `CUS-${String(index).padStart(3, "0")}`;
        while (codes.has(code)) {
          index += 1;
          code = `CUS-${String(index).padStart(3, "0")}`;
        }
      }
      codes.add(code);

      const tags = pick(row, "tags", "tag")
        .split(/[;,|]/)
        .map((tag) => tag.trim())
        .filter(Boolean);

      actions.createRecord(
        "customers",
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
          creditLimit: Number(pick(row, "credit limit", "creditlimit") || 0),
          paymentTerms: Number(pick(row, "payment terms", "terms") || 30),
          currency: data.business?.currency ?? "USD",
          openingBalance: 0,
          status: pick(row, "status") === "archived" ? "archived" : "active",
        } as unknown as Customer,
        { action: "import", summary: `Imported customer ${name}` },
      );
      created += 1;
    }
    return created;
  };

  const columns: Array<DataTableColumn<Customer>> = [
    {
      key: "name",
      header: "Customer",
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
      key: "tags",
      header: "Tags",
      value: (row) => row.tags.join(", "),
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
          {row.tags.length > 2 ? (
            <span className="numeric text-[11.5px] text-ink-faint">+{row.tags.length - 2}</span>
          ) : null}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "balance",
      header: "Outstanding",
      align: "right",
      value: (row) => balanceByCustomer.get(row.id) ?? 0,
      render: (row) => {
        const balance = balanceByCustomer.get(row.id) ?? 0;
        return (
          <span className={balance > 0 ? "numeric text-[13px] text-ink" : "numeric text-[13px] text-ink-faint"}>
            {money(balance)}
          </span>
        );
      },
      mono: true,
    },
    {
      key: "creditLimit",
      header: "Credit limit",
      align: "right",
      value: (row) => row.creditLimit,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{money(row.creditLimit)}</span>,
      mono: true,
      hideBelow: "md",
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
      <CsvImportButton onImport={importCustomers} />
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
        title="Customers"
        description="Every account you sell to, with balances pulled from live invoices."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New customer
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Customers", value: String(data.customers.length), hint: `${data.customers.filter((customer) => customer.status === "active").length} active` },
          { label: "Outstanding", value: money(outstanding), tone: outstanding > 0 ? "accent" : "default", hint: "Unpaid invoice balances" },
          { label: "Overdue invoices", value: String(overdueCount), tone: overdueCount > 0 ? "destructive" : "default", hint: "Past their due date" },
          {
            label: "Credit extended",
            value: money(sum(data.customers, (customer) => customer.creditLimit)),
            hint: "Sum of configured limits",
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/customers/${row.id}`)}
        searchPlaceholder="Search name, code, email or tag"
        searchValue={(row) =>
          `${row.name} ${row.code} ${row.email ?? ""} ${row.contactName ?? ""} ${row.tags.join(" ")}`
        }
        toolbar={toolbar}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        emptyTitle="No customers yet"
        emptyDescription="Add a customer manually or import a CSV of your existing accounts."
        pageSize={12}
        exportName="customers"
        caption="Customer accounts"
      />

      {formOpen ? <CustomerForm customer={editing} onClose={() => setFormOpen(false)} /> : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete customer?"
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
        title={`Delete ${selected.size} customers?`}
        message={`${selected.size} customer${selected.size === 1 ? "" : "s"} will be removed from this workspace. This cannot be undone.`}
        confirmLabel="Delete selected"
        destructive
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkOpen(false)}
      />
    </AppShell>
  );
}
