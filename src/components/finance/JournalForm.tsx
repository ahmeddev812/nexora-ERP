"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";

interface DraftLine {
  key: string;
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
}

let lineSeq = 0;

const makeLine = (accountId = ""): DraftLine => {
  lineSeq += 1;
  return { key: `jl_${lineSeq}`, accountId, debit: "", credit: "", memo: "" };
};

export function JournalForm({ onClose }: { onClose: () => void }) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const activeAccounts = useMemo(
    () => data.accounts.filter((account) => account.status === "active"),
    [data.accounts],
  );

  const [date, setDate] = useState(todayKey());
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() => [
    makeLine(activeAccounts[0]?.id ?? ""),
    makeLine(activeAccounts[1]?.id ?? ""),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      debit += Number(line.debit) || 0;
      credit += Number(line.credit) || 0;
    }
    return { debit: round2(debit), credit: round2(credit) };
  }, [lines]);

  const difference = round2(totals.debit - totals.credit);
  const balanced = totals.debit > 0 && difference === 0;

  const update = (key: string, patch: Partial<DraftLine>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const post = () => {
    const nextErrors: Record<string, string> = {};
    const filled = lines.filter(
      (line) => line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0),
    );
    if (memo.trim().length < 3) nextErrors.memo = "A short memo is required.";
    if (filled.length < 2) nextErrors.lines = "A journal needs at least two lines.";
    if (filled.some((line) => Number(line.debit) > 0 && Number(line.credit) > 0)) {
      nextErrors.lines = "Each line posts either a debit or a credit, never both.";
    }
    if (!balanced) {
      nextErrors.lines = `Debits ${formatMoney(totals.debit, "", 2)} must equal credits ${formatMoney(totals.credit, "", 2)}.`;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const created = actions.postJournal({
      date,
      memo: memo.trim(),
      refType: "manual",
      refId: null,
      lines: filled.map((line) => ({
        accountId: line.accountId,
        debit: round2(Number(line.debit) || 0),
        credit: round2(Number(line.credit) || 0),
        memo: line.memo.trim() || undefined,
      })),
    });

    if (!created) {
      toast.error("Journal not posted", "Debits and credits must balance.");
      return;
    }

    toast.success("Journal posted", `${created.number} · ${memo.trim()}`);
    onClose();
  };

  const addLine = () => setLines((current) => [...current, makeLine(activeAccounts[0]?.id ?? "")]);
  const removeLine = (key: string) =>
    setLines((current) => (current.length > 2 ? current.filter((line) => line.key !== key) : current));

  const columns =
    "md:grid-cols-[minmax(180px,1fr)_110px_110px_minmax(140px,0.8fr)_32px]";

  return (
    <Modal
      open
      onClose={onClose}
      title="New manual journal"
      description="Debits must equal credits before anything posts. Posted entries can only be reversed."
      size="lg"
      footer={
        <div className="flex items-center items-end justify-between gap-4">
          <p className="text-[13px] text-ink-muted">
            Total debit {formatMoney(totals.debit, "", 2)} · Total credit{" "}
            {formatMoney(totals.credit, "", 2)}
            {difference !== 0 ? (
              <span className="text-destructive"> · Difference {formatMoney(difference, "", 2)}</span>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={post} disabled={!balanced}>
              Post journal
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Date"
          type="date"
          mono
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Textarea
          label="Memo"
          required
          rows={2}
          error={errors.memo}
          placeholder="What is this entry for?"
          value={memo}
          onChange={(event) => {
            setMemo(event.target.value);
            setErrors((current) => ({ ...current, memo: "" }));
          }}
        />
      </div>

      <div className="mt-4">
        <div
          className={`hidden border-b border-line bg-surface-2 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint md:grid md:gap-2 ${columns}`}
        >
          <span>Account</span>
          <span className="text-right">Debit</span>
          <span className="text-right">Credit</span>
          <span>Line memo</span>
          <span />
        </div>

        <div className="divide-y divide-line">
          {lines.map((line) => (
            <div
              key={line.key}
              className={`grid gap-2 px-3 py-2.5 md:items-center ${columns}`}
            >
              <Select
                aria-label="Account"
                options={activeAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.code} · ${account.name}`,
                }))}
                value={line.accountId}
                onChange={(event) => update(line.key, { accountId: event.target.value })}
              />
              <Input
                aria-label="Debit"
                type="number"
                mono
                value={line.debit}
                onChange={(event) =>
                  update(line.key, { debit: event.target.value, credit: "" })
                }
                inputClassName="text-right"
              />
              <Input
                aria-label="Credit"
                type="number"
                mono
                value={line.credit}
                onChange={(event) =>
                  update(line.key, { credit: event.target.value, debit: "" })
                }
                inputClassName="text-right"
              />
              <Input
                aria-label="Line memo"
                placeholder="Optional"
                value={line.memo}
                onChange={(event) => update(line.key, { memo: event.target.value })}
              />
              <button
                type="button"
                aria-label="Remove line"
                onClick={() => removeLine(line.key)}
                className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={1.5} />}
            onClick={addLine}
          >
            Add line
          </Button>
          {!balanced ? (
            <p className="text-[12.5px] text-destructive">
              {errors.lines ?? "Debits and credits must match before posting."}
            </p>
          ) : errors.lines ? (
            <p className="text-[12.5px] text-destructive">{errors.lines}</p>
          ) : (
            <p className="text-[12.5px] text-success">Balanced and ready to post</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[12.5px] text-ink-faint">
        Posting as {user?.name ?? "the current user"} writes an audit entry with the journal.
      </p>
    </Modal>
  );
}
