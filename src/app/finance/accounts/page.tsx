"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { AccountForm } from "@/components/finance/AccountForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { isDebitAccount, journalAccountTotals, naturalBalance, round2, sum } from "@/lib/calculations";
import { formatMoney } from "@/lib/id";
import type { Account, AccountType } from "@/types/erp";

const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
};

const TYPE_TONE: Record<AccountType, BadgeTone> = {
  asset: "info",
  liability: "warning",
  equity: "primary",
  revenue: "success",
  expense: "accent",
};

export default function FinanceAccountsPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const totals = useMemo(
    () => journalAccountTotals(data.journalEntries),
    [data.journalEntries],
  );

  const balanceOf = (account: Account): number =>
    naturalBalance(account.type, totals.get(account.id));

  const rows = useMemo(
    () =>
      [...data.accounts]
        .sort((a, b) => a.code.localeCompare(b.code))
        .filter((account) => {
          if (typeFilter !== "all" && account.type !== typeFilter) return false;
          if (statusFilter !== "all" && account.status !== statusFilter) return false;
          return true;
        }),
    [data.accounts, typeFilter, statusFilter],
  );

  const metrics = useMemo(() => {
    const balanceOf = (account: Account): number =>
      naturalBalance(account.type, totals.get(account.id));
    const debit = round2(
      sum(
        data.accounts.filter((account) => isDebitAccount(account.type)),
        (account) => Math.max(balanceOf(account), 0),
      ),
    );
    const credit = round2(
      sum(
        data.accounts.filter((account) => !isDebitAccount(account.type)),
        (account) => Math.max(balanceOf(account), 0),
      ),
    );
    return {
      count: data.accounts.length,
      active: data.accounts.filter((account) => account.status === "active").length,
      debit,
      credit,
    };
  }, [data.accounts, totals]);

  const remove = () => {
    if (!deleting) return;
    if (deleting.isSystem) {
      toast.error("System account", `${deleting.code} is part of the chart and stays put.`);
      setDeleting(null);
      return;
    }
    const referenced = data.journalEntries.some((entry) =>
      entry.lines.some((line) => line.accountId === deleting.id),
    );
    if (referenced) {
      toast.error("Account in use", "Journal history points at this account, so it stays.");
      setDeleting(null);
      return;
    }
    actions.deleteRecord("accounts", deleting.id, {
      summary: `Deleted account ${deleting.code} ${deleting.name}`,
    });
    toast.success("Account deleted", deleting.code);
    setDeleting(null);
  };

  const iconClass =
    "focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors";

  const columns: Array<DataTableColumn<Account>> = [
    {
      key: "code",
      header: "Code",
      value: (row) => row.code,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.code}</span>,
      mono: true,
      width: "90px",
    },
    {
      key: "name",
      header: "Name",
      value: (row) => row.name,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">{row.name}</span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {row.description || (row.parentId ? "Sub account" : "Top level")}
          </span>
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      value: (row) => row.type,
      render: (row) => <Badge tone={TYPE_TONE[row.type]}>{TYPE_LABEL[row.type]}</Badge>,
      hideBelow: "md",
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      value: (row) => balanceOf(row),
      render: (row) => {
        const balance = balanceOf(row);
        return (
          <span
            className={`numeric text-[13px] ${balance === 0 ? "text-ink-faint" : "text-ink"}`}
          >
            {formatMoney(balance, "", 2)}
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
            aria-label={`Edit ${row.code}`}
            onClick={(event) => {
              event.stopPropagation();
              setEditing(row);
              setFormOpen(true);
            }}
            className={`${iconClass} hover:border-line-strong hover:text-ink`}
          >
            <Pencil size={13} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${row.code}`}
            onClick={(event) => {
              event.stopPropagation();
              setDeleting(row);
            }}
            className={`${iconClass} hover:border-destructive hover:text-destructive`}
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
        aria-label="Filter by type"
        className="w-auto min-w-[140px]"
        value={typeFilter}
        onChange={(event) => setTypeFilter(event.target.value)}
        options={[
          { value: "all", label: "All types" },
          ...(Object.keys(TYPE_LABEL) as AccountType[]).map((entry) => ({
            value: entry,
            label: TYPE_LABEL[entry],
          })),
        ]}
      />
      <Select
        aria-label="Filter by status"
        className="w-auto min-w-[130px]"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ]}
      />
    </div>
  );

  return (
    <AppShell>
      <PageHeader
        title="Chart of accounts"
        description="Assets, liabilities, equity, revenue and expense. Every posting resolves to a code here."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New account
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Accounts", value: String(metrics.count), hint: "All time" },
          { label: "Active", value: String(metrics.active), tone: "success", hint: "Ready to post" },
          { label: "Debit balances", value: formatMoney(metrics.debit, "", 0), hint: "Assets and expenses" },
          { label: "Credit balances", value: formatMoney(metrics.credit, "", 0), hint: "Funding and income" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search code, name or description"
        searchValue={(row) => `${row.code} ${row.name} ${row.description ?? ""}`}
        toolbar={toolbar}
        emptyTitle="No accounts yet"
        emptyDescription="Add an account to start posting manual journals."
        pageSize={14}
        exportName="chart-of-accounts"
        caption="Chart of accounts"
      />

      {formOpen ? <AccountForm account={editing} onClose={() => setFormOpen(false)} /> : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete account?"
        message={`${deleting?.code ?? ""} ${deleting?.name ?? ""} will be removed. Accounts with journal history stay.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </AppShell>
  );
}
