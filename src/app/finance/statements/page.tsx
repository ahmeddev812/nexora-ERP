"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";

import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { useERPData } from "@/hooks/useERPData";
import {
  balanceSheet,
  incomeStatement,
  journalAccountTotals,
  round2,
  trialBalance,
} from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { StatementRow } from "@/lib/calculations";

type TabId = "income" | "balance" | "trial";

function firstOfYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

export default function StatementsPage() {
  const data = useERPData();

  const [tab, setTab] = useState<TabId>("income");
  const [from, setFrom] = useState(firstOfYear());
  const [to, setTo] = useState(todayKey());

  const periodTotals = useMemo(
    () => journalAccountTotals(data.journalEntries, { from, to }),
    [data.journalEntries, from, to],
  );
  const cumulativeTotals = useMemo(
    () => journalAccountTotals(data.journalEntries, { to }),
    [data.journalEntries, to],
  );

  const period = useMemo(() => incomeStatement(data.accounts, periodTotals), [data.accounts, periodTotals]);
  const cumulative = useMemo(
    () => incomeStatement(data.accounts, cumulativeTotals),
    [data.accounts, cumulativeTotals],
  );
  const sheet = useMemo(
    () => balanceSheet(data.accounts, cumulativeTotals, cumulative.netProfit),
    [data.accounts, cumulativeTotals, cumulative.netProfit],
  );
  const trial = useMemo(() => trialBalance(data.accounts, cumulativeTotals), [data.accounts, cumulativeTotals]);

  const currency = data.business?.currency ?? "USD";
  const rangeLabel =
    tab === "income" ? `${from} to ${to}` : `As of ${to}`;

  const summaryItems =
    tab === "income"
      ? [
          { label: "Revenue", value: formatMoney(period.revenue, "", 0), hint: rangeLabel },
          { label: "Expenses", value: formatMoney(period.expenses, "", 0), hint: rangeLabel },
          {
            label: "Net profit",
            value: formatMoney(period.netProfit, "", 0),
            tone: (period.netProfit >= 0 ? "success" : "destructive") as
              | "success"
              | "destructive",
            hint: rangeLabel,
          },
          { label: "Accounts touched", value: String(period.revenueRows.length + period.expenseRows.length), hint: "Non zero balances" },
        ]
      : tab === "balance"
        ? [
            { label: "Assets", value: formatMoney(sheet.totalAssets, "", 0), hint: rangeLabel },
            { label: "Liabilities", value: formatMoney(sheet.totalLiabilities, "", 0), hint: rangeLabel },
            { label: "Equity", value: formatMoney(sheet.totalEquity, "", 0), hint: "Includes retained profit" },
            {
              label: "Balanced",
              value: sheet.balanced ? "Yes" : "No",
              tone: (sheet.balanced ? "success" : "destructive") as "success" | "destructive",
              hint: "Assets equal funding",
            },
          ]
        : [
            { label: "Accounts listed", value: String(trial.rows.length), hint: rangeLabel },
            { label: "Total debits", value: formatMoney(trial.totalDebit, "", 0), hint: "Natural balances" },
            { label: "Total credits", value: formatMoney(trial.totalCredit, "", 0), hint: "Natural balances" },
            {
              label: "Balanced",
              value: trial.balanced ? "Yes" : "No",
              tone: (trial.balanced ? "success" : "destructive") as "success" | "destructive",
              hint: "Debits equal credits",
            },
          ];

  const trialColumns: Array<DataTableColumn<(typeof trial.rows)[number]>> = [
    {
      key: "code",
      header: "Code",
      value: (row) => row.code,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{row.code}</span>,
      mono: true,
      width: "90px",
    },
    {
      key: "name",
      header: "Account",
      value: (row) => row.name,
      render: (row) => (
        <span className="text-[13.5px] text-ink">
          {row.name} <span className="text-ink-faint">({row.type})</span>
        </span>
      ),
    },
    {
      key: "debit",
      header: "Debit",
      align: "right",
      value: (row) => row.debit,
      render: (row) => (
        <span className={`numeric text-[13px] ${row.debit ? "text-ink" : "text-ink-faint"}`}>
          {row.debit ? formatMoney(row.debit, currency, 2) : ""}
        </span>
      ),
      mono: true,
    },
    {
      key: "credit",
      header: "Credit",
      align: "right",
      value: (row) => row.credit,
      render: (row) => (
        <span className={`numeric text-[13px] ${row.credit ? "text-ink" : "text-ink-faint"}`}>
          {row.credit ? formatMoney(row.credit, currency, 2) : ""}
        </span>
      ),
      mono: true,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        className="print:hidden"
        title="Financial statements"
        description="Income statement, balance sheet and trial balance straight from posted journals."
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="focus-ring-visible inline-flex items-center gap-2 rounded-input border border-line bg-surface px-3 py-2 text-[13px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Printer size={14} strokeWidth={1.5} />
            Print
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <Tabs
          className="min-w-[280px]"
          tabs={[
            { id: "income", label: "Income statement" },
            { id: "balance", label: "Balance sheet" },
            { id: "trial", label: "Trial balance" },
          ]}
          value={tab}
          onChange={(id) => setTab(id as TabId)}
        />
        {tab === "income" ? (
          <Input
            aria-label="From date"
            type="date"
            mono
            className="w-auto"
            inputClassName="w-auto"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        ) : null}
        <Input
          aria-label={tab === "income" ? "To date" : "As of date"}
          type="date"
          mono
          className="w-auto"
          inputClassName="w-auto"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <p className="text-[12.5px] text-ink-muted">{rangeLabel}</p>
      </div>

      <div className="print:hidden">
        <SummaryStrip items={summaryItems} />
      </div>

      {tab === "income" ? (
        <div className="rounded-card border border-line bg-surface">
          <Section title="Revenue" subtitle={`Accounts earning income · ${rangeLabel}`}>
            {period.revenueRows.length === 0 ? (
              <EmptyLine label="No revenue posted in this range" />
            ) : (
              period.revenueRows.map((row) => (
                <AmountLine key={row.accountId} row={row} currency={currency} />
              ))
            )}
            <TotalLine label="Total revenue" value={period.revenue} currency={currency} />
          </Section>
          <Section title="Expenses" subtitle={`Accounts spending money · ${rangeLabel}`}>
            {period.expenseRows.length === 0 ? (
              <EmptyLine label="No expenses posted in this range" />
            ) : (
              period.expenseRows.map((row) => (
                <AmountLine key={row.accountId} row={row} currency={currency} />
              ))
            )}
            <TotalLine label="Total expenses" value={period.expenses} currency={currency} />
          </Section>
          <TotalLine
            label={period.netProfit >= 0 ? "Net profit" : "Net loss"}
            value={period.netProfit}
            currency={currency}
            strong
          />
        </div>
      ) : null}

      {tab === "balance" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-line bg-surface">
            <Section title="Assets" subtitle={`What the business owns · ${rangeLabel}`}>
              {sheet.assetRows.length === 0 ? (
                <EmptyLine label="No asset balances" />
              ) : (
                sheet.assetRows.map((row) => (
                  <AmountLine key={row.accountId} row={row} currency={currency} />
                ))
              )}
              <TotalLine label="Total assets" value={sheet.totalAssets} currency={currency} />
            </Section>
          </div>
          <div className="rounded-card border border-line bg-surface">
            <Section title="Liabilities" subtitle="What the business owes">
              {sheet.liabilityRows.length === 0 ? (
                <EmptyLine label="No liability balances" />
              ) : (
                sheet.liabilityRows.map((row) => (
                  <AmountLine key={row.accountId} row={row} currency={currency} />
                ))
              )}
              <TotalLine label="Total liabilities" value={sheet.totalLiabilities} currency={currency} />
            </Section>
            <Section title="Equity" subtitle="Funding and retained profit">
              {sheet.equityRows.length === 0 ? (
                <EmptyLine label="No equity balances" />
              ) : (
                sheet.equityRows.map((row) => (
                  <AmountLine key={row.accountId} row={row} currency={currency} />
                ))
              )}
              <AmountLine
                row={{
                  accountId: "retained",
                  code: "RET",
                  name: "Retained profit to date",
                  type: "equity",
                  amount: sheet.retainedEarnings,
                }}
                currency={currency}
              />
              <TotalLine label="Total equity" value={sheet.totalEquity} currency={currency} />
            </Section>
            <TotalLine
              label="Total liabilities and equity"
              value={round2(sheet.totalLiabilities + sheet.totalEquity)}
              currency={currency}
              strong
            />
          </div>
        </div>
      ) : null}

      {tab === "trial" ? (
        <>
          <DataTable
            columns={trialColumns}
            rows={trial.rows}
            rowKey={(row) => row.accountId}
            searchPlaceholder="Search code or account"
            searchValue={(row) => `${row.code} ${row.name}`}
            emptyTitle="Nothing posted yet"
            emptyDescription="Post journals and balances appear here."
            pageSize={20}
            exportName="trial-balance"
            caption="Trial balance"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
            <p className="text-[13.5px] text-ink">
              Total debit {formatMoney(trial.totalDebit, currency, 2)} · Total credit{" "}
              {formatMoney(trial.totalCredit, currency, 2)}
            </p>
            <Badge tone={trial.balanced ? "success" : "destructive"} dot>
              {trial.balanced ? "Balanced" : "Out of balance"}
            </Badge>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="text-[11.5px] text-ink-faint">{subtitle}</p> : null}
      </div>
      <div className="divide-y divide-line/60">{children}</div>
    </section>
  );
}

function AmountLine({ row, currency }: { row: StatementRow; currency: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[13px] text-ink-muted">
        <span className="numeric mr-2 text-ink-faint">{row.code}</span>
        {row.name}
      </span>
      <span className="numeric text-[13px] text-ink">
        {formatMoney(row.amount, currency, 2)}
      </span>
    </div>
  );
}

function TotalLine({
  label,
  value,
  currency,
  strong = false,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-t border-line px-5 py-3 ${
        strong ? "bg-surface-2" : ""
      }`}
    >
      <span className={strong ? "text-sm font-semibold text-ink" : "text-[13px] font-medium text-ink"}>
        {label}
      </span>
      <span className={`numeric ${strong ? "text-base" : "text-[13.5px]"} text-ink`}>
        {formatMoney(value, currency, 2)}
      </span>
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <p className="py-2 text-[13px] text-ink-faint">{label}</p>;
}
