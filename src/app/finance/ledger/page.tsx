"use client";

import { useMemo, useState } from "react";

import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useERPData } from "@/hooks/useERPData";
import {
  isDebitAccount,
  journalAccountTotals,
  naturalBalance,
  round2,
} from "@/lib/calculations";
import { formatDate, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";

interface LedgerRow {
  id: string;
  date: string;
  entryId: string;
  entryNumber: string;
  memo: string;
  debit: number;
  credit: number;
  running: number;
}

export default function GeneralLedgerPage() {
  const data = useERPData();

  const accounts = useMemo(
    () => [...data.accounts].sort((a, b) => a.code.localeCompare(b.code)),
    [data.accounts],
  );
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayKey());

  const activeId = accountId || accounts[0]?.id || "";
  const account = accounts.find((entry) => entry.id === activeId);

  const allTotals = useMemo(() => journalAccountTotals(data.journalEntries), [data.journalEntries]);

  const entries = useMemo(() => {
    const list = [...data.journalEntries].sort((a, b) =>
      a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date),
    );
    return list.filter((entry) => {
      if (entry.status !== "posted") return false;
      if (from && entry.date < from) return false;
      if (to && entry.date > to) return false;
      return true;
    });
  }, [data.journalEntries, from, to]);

  const rows = useMemo(() => {
    if (!account) return [];
    const debitNature = isDebitAccount(account.type);
    let running = 0;

    const openingTotals = journalAccountTotals(
      data.journalEntries.filter((entry) => entry.date < (from || "0000-01-01")),
    ).get(account.id);
    const openingBalance = naturalBalance(account.type, openingTotals);

    running = openingBalance;

    const out: LedgerRow[] = [];
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.accountId !== account.id) continue;
        const signed = debitNature
          ? round2(line.debit - line.credit)
          : round2(line.credit - line.debit);
        running = round2(running + signed);
        out.push({
          id: line.id,
          date: entry.date,
          entryId: entry.id,
          entryNumber: entry.number,
          memo: entry.memo,
          debit: line.debit,
          credit: line.credit,
          running,
        });
      }
    }
    return out;
  }, [account, entries, data.journalEntries, from]);

  const metrics = useMemo(() => {
    const debit = round2(rows.reduce((acc, row) => acc + row.debit, 0));
    const credit = round2(rows.reduce((acc, row) => acc + row.credit, 0));
    const closing = rows.length > 0 ? rows[rows.length - 1]?.running ?? 0 : 0;
    return { debit, credit, closing: round2(closing), count: rows.length };
  }, [rows]);

  const accountBalance = account ? naturalBalance(account.type, allTotals.get(account.id)) : 0;

  const columns: Array<DataTableColumn<LedgerRow>> = [
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
      key: "entry",
      header: "Entry",
      value: (row) => row.entryNumber,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.entryNumber}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "memo",
      header: "Memo",
      value: (row) => row.memo,
      render: (row) => <span className="block truncate text-[13.5px] text-ink">{row.memo}</span>,
    },
    {
      key: "debit",
      header: "Debit",
      align: "right",
      value: (row) => row.debit,
      render: (row) => (
        <span className={`numeric text-[13px] ${row.debit > 0 ? "text-ink" : "text-ink-faint"}`}>
          {row.debit > 0 ? formatMoney(row.debit, "", 2) : ""}
        </span>
      ),
      mono: true,
      hideBelow: "md",
    },
    {
      key: "credit",
      header: "Credit",
      align: "right",
      value: (row) => row.credit,
      render: (row) => (
        <span className={`numeric text-[13px] ${row.credit > 0 ? "text-ink" : "text-ink-faint"}`}>
          {row.credit > 0 ? formatMoney(row.credit, "", 2) : ""}
        </span>
      ),
      mono: true,
      hideBelow: "md",
    },
    {
      key: "running",
      header: "Balance",
      align: "right",
      value: (row) => row.running,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">{formatMoney(row.running, "", 2)}</span>
      ),
      mono: true,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="General ledger"
        description="Every posted line for one account, in date order, with a running balance."
      />

      <SummaryStrip
        items={[
          { label: "Lines", value: String(metrics.count), hint: "In the selected range" },
          { label: "Total debits", value: formatMoney(metrics.debit, "", 0), hint: "Range total" },
          { label: "Total credits", value: formatMoney(metrics.credit, "", 0), hint: "Range total" },
          {
            label: "Closing balance",
            value: formatMoney(metrics.closing, "", 2),
            tone: "accent",
            hint: account ? `${account.code} ${account.name}` : "Pick an account",
          },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          aria-label="Account"
          className="w-auto min-w-[220px]"
          options={accounts.map((entry) => ({
            value: entry.id,
            label: `${entry.code} · ${entry.name}`,
          }))}
          value={activeId}
          onChange={(event) => setAccountId(event.target.value)}
        />
        <Input
          aria-label="From date"
          type="date"
          mono
          inputClassName="w-auto"
          className="w-auto"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input
          aria-label="To date"
          type="date"
          mono
          inputClassName="w-auto"
          className="w-auto"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <p className="text-[12.5px] text-ink-muted">
          {account ? (
            <>
              Current balance {formatMoney(accountBalance, "", 2)} · natural{" "}
              {isDebitAccount(account.type) ? "debit" : "credit"} account
            </>
          ) : null}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchPlaceholder="Search memo or entry number"
        searchValue={(row) => `${row.entryNumber} ${row.memo}`}
        emptyTitle="No ledger activity"
        emptyDescription="Widen the date range or pick another account."
        pageSize={15}
        exportName="general-ledger"
        caption="General ledger"
      />
    </AppShell>
  );
}
