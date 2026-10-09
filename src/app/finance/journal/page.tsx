"use client";

import { useMemo, useState } from "react";
import { Plus, Undo2 } from "lucide-react";

import { JournalForm } from "@/components/finance/JournalForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { formatDate, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { JournalEntry, JournalStatus } from "@/types/erp";

const STATUS_LABEL: Record<JournalStatus, string> = {
  draft: "Draft",
  posted: "Posted",
  reversed: "Reversed",
};

const STATUS_TONE: Record<JournalStatus, BadgeTone> = {
  draft: "neutral",
  posted: "success",
  reversed: "destructive",
};

export default function FinanceJournalPage() {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState<JournalEntry | null>(null);
  const [reversing, setReversing] = useState<JournalEntry | null>(null);

  const accountById = useMemo(
    () => new Map(data.accounts.map((account) => [account.id, account])),
    [data.accounts],
  );

  const rows = useMemo(() => {
    const list = [...data.journalEntries].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    );
    return statusFilter === "all" ? list : list.filter((row) => row.status === statusFilter);
  }, [data.journalEntries, statusFilter]);

  const metrics = useMemo(() => {
    let debit = 0;
    for (const entry of data.journalEntries) {
      if (entry.status !== "posted") continue;
      debit += entry.totalDebit;
    }
    return {
      count: data.journalEntries.length,
      posted: data.journalEntries.filter((entry) => entry.status === "posted").length,
      reversed: data.journalEntries.filter((entry) => entry.status === "reversed").length,
      debit: round2(debit),
    };
  }, [data.journalEntries]);

  const confirmReversal = () => {
    const entry = reversing;
    setReversing(null);
    if (!entry) return;

    const created = actions.postJournal({
      date: todayKey(),
      memo: `Reversal of ${entry.number}: ${entry.memo}`,
      refType: "reversal",
      refId: entry.id,
      refNumber: entry.number,
      lines: entry.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.credit,
        credit: line.debit,
        memo: `Reversal of ${entry.number}`,
      })),
    });

    if (!created) {
      toast.error("Reversal failed", "The mirrored entry did not balance.");
      return;
    }

    actions.updateRecord(
      "journalEntries",
      created.id,
      { reversesEntryId: entry.id },
      { summary: `Reversal of ${entry.number}` },
    );
    actions.updateRecord(
      "journalEntries",
      entry.id,
      { status: "reversed", reversedByEntryId: created.id },
      { summary: `Reversed ${entry.number} with ${created.number}` },
    );
    toast.success("Entry reversed", `${entry.number} reversed by ${created.number}`);
  };

  const columns: Array<DataTableColumn<JournalEntry>> = [
    {
      key: "number",
      header: "Entry",
      value: (row) => row.number,
      render: (row) => <span className="numeric text-[13px] text-ink">{row.number}</span>,
      mono: true,
      width: "110px",
    },
    {
      key: "date",
      header: "Date",
      value: (row) => row.date,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>
      ),
      hideBelow: "md",
    },
    {
      key: "memo",
      header: "Memo",
      value: (row) => row.memo,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-[13.5px] text-ink">{row.memo}</span>
          <span className="block truncate text-[11.5px] text-ink-faint">
            {row.refType === "manual" ? "Manual journal" : row.refNumber || row.refType}
          </span>
        </span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      align: "right",
      value: (row) => row.lines.length,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{row.lines.length}</span>
      ),
      mono: true,
      hideBelow: "lg",
    },
    {
      key: "debit",
      header: "Total",
      align: "right",
      value: (row) => row.totalDebit,
      render: (row) => (
        <span className="numeric text-[13px] text-ink">
          {formatMoney(row.totalDebit, "", 2)}
        </span>
      ),
      mono: true,
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => (
        <Badge tone={STATUS_TONE[row.status]} dot>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) =>
        row.status === "posted" ? (
          <span className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-label={`Reverse ${row.number}`}
              onClick={(event) => {
                event.stopPropagation();
                setReversing(row);
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
            >
              <Undo2 size={13} strokeWidth={1.5} />
            </button>
          </span>
        ) : (
          <span className="text-[12px] text-ink-faint">Locked</span>
        ),
    },
  ];

  const toolbar = (
    <Select
      aria-label="Filter by status"
      className="w-auto min-w-[150px]"
      value={statusFilter}
      onChange={(event) => setStatusFilter(event.target.value)}
      options={[
        { value: "all", label: "All entries" },
        { value: "posted", label: "Posted" },
        { value: "reversed", label: "Reversed" },
        { value: "draft", label: "Draft" },
      ]}
    />
  );

  return (
    <AppShell>
      <PageHeader
        title="Journal"
        description="Manual double-entry postings. Posted entries are locked to reversals only."
        actions={
          <Button
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={() => setFormOpen(true)}
          >
            New journal
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: "Entries", value: String(metrics.count), hint: "All time" },
          { label: "Posted", value: String(metrics.posted), tone: "success", hint: "On the books" },
          {
            label: "Reversed",
            value: String(metrics.reversed),
            tone: metrics.reversed > 0 ? "destructive" : "default",
            hint: "Replaced by a mirror",
          },
          { label: "Posted debits", value: formatMoney(metrics.debit, "", 0), hint: "Credits match" },
        ]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={(row) => setViewing(row)}
        searchPlaceholder="Search number, memo or reference"
        searchValue={(row) => `${row.number} ${row.memo} ${row.refNumber ?? ""} ${row.refType}`}
        toolbar={toolbar}
        emptyTitle="No journal entries"
        emptyDescription="Post a manual journal or let sales and purchasing do it for you."
        pageSize={12}
        exportName="journal-entries"
        caption="Journal entries"
      />

      {formOpen ? <JournalForm onClose={() => setFormOpen(false)} /> : null}

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.number} · ${viewing.memo}` : ""}
        description={
          viewing
            ? `${formatDate(viewing.date, "us")} · ${STATUS_LABEL[viewing.status]} · ${viewing.refType}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewing ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Memo</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {viewing.lines.map((line) => {
                  const account = accountById.get(line.accountId);
                  return (
                    <tr key={line.id} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-2">
                        <span className="numeric block text-ink">{account?.code ?? "-"}</span>
                        <span className="block text-[12px] text-ink-faint">
                          {account?.name ?? "Unknown account"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-muted">{line.memo || ""}</td>
                      <td className="numeric px-3 py-2 text-right text-ink">
                        {line.debit > 0 ? formatMoney(line.debit, "", 2) : ""}
                      </td>
                      <td className="numeric px-3 py-2 text-right text-ink">
                        {line.credit > 0 ? formatMoney(line.credit, "", 2) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface-2 text-[12.5px]">
                  <td className="px-3 py-2 font-medium text-ink" colSpan={2}>
                    Totals
                  </td>
                  <td className="numeric px-3 py-2 text-right text-ink">
                    {formatMoney(viewing.totalDebit, "", 2)}
                  </td>
                  <td className="numeric px-3 py-2 text-right text-ink">
                    {formatMoney(viewing.totalCredit, "", 2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={reversing !== null}
        title="Reverse journal entry?"
        message={`${reversing?.number ?? ""} stays on file and a mirrored entry with swapped debits and credits is posted today. Nothing is edited or deleted.`}
        confirmLabel="Post reversal"
        destructive
        onConfirm={confirmReversal}
        onCancel={() => setReversing(null)}
      />
    </AppShell>
  );
}
