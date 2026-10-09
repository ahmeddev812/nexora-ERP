"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import type { Account, AccountType } from "@/types/erp";

const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
};

interface AccountFormProps {
  /** null opens a blank record. */
  account: Account | null;
  onClose: () => void;
}

export function AccountForm({ account, onClose }: AccountFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [code, setCode] = useState(account?.code ?? "");
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "asset");
  const [parentId, setParentId] = useState(account?.parentId ?? "");
  const [description, setDescription] = useState(account?.description ?? "");
  const [status, setStatus] = useState<Account["status"]>(account?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parentOptions = useMemo(
    () =>
      data.accounts
        .filter((entry) => entry.id !== account?.id && entry.type === type)
        .map((entry) => ({ value: entry.id, label: `${entry.code} · ${entry.name}` })),
    [data.accounts, account, type],
  );

  const save = () => {
    const nextErrors: Record<string, string> = {};
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (trimmedCode.length === 0) nextErrors.code = "Code is required.";
    if (trimmedName.length === 0) nextErrors.name = "Name is required.";
    const clash = data.accounts.some(
      (entry) => entry.id !== account?.id && entry.code.toUpperCase() === trimmedCode,
    );
    if (clash) nextErrors.code = "That code is already used by another account.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      code: trimmedCode,
      name: trimmedName,
      type,
      parentId: parentId || null,
      description: description.trim() || undefined,
      status,
    };

    if (account) {
      actions.updateRecord("accounts", account.id, payload, {
        summary: `Updated account ${trimmedCode} ${trimmedName}`,
      });
      toast.success("Account updated", `${trimmedCode} ${trimmedName}`);
    } else {
      actions.createRecord(
        "accounts",
        { ...payload, isSystem: false } as unknown as Account,
        { summary: `Created account ${trimmedCode} ${trimmedName}`, number: trimmedCode },
      );
      toast.success("Account created", `${trimmedCode} ${trimmedName}`);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={account ? `Edit ${account.code} ${account.name}` : "New account"}
      description="Codes drive every journal lookup, so keep them short and stable."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {account ? "Save changes" : "Create account"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Code"
          required
          mono
          error={errors.code}
          hint="For example 1100"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setErrors((current) => ({ ...current, code: "" }));
          }}
          disabled={account?.isSystem === true}
        />
        <Input
          label="Name"
          required
          error={errors.name}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: "" }));
          }}
        />
        <Select
          label="Type"
          options={(Object.keys(TYPE_LABEL) as AccountType[]).map((entry) => ({
            value: entry,
            label: TYPE_LABEL[entry],
          }))}
          value={type}
          onChange={(event) => {
            setType(event.target.value as AccountType);
            setParentId("");
          }}
          disabled={account?.isSystem === true}
        />
        <Select
          label="Parent account"
          options={[{ value: "", label: "No parent" }, ...parentOptions]}
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
        />
        <Select
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
          value={status}
          onChange={(event) => setStatus(event.target.value as Account["status"])}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            rows={2}
            placeholder="What posts here?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </div>
      {account?.isSystem ? (
        <p className="mt-3 text-[12.5px] text-ink-muted">
          System accounts keep their code and type because live journal entries point at them.
        </p>
      ) : null}
    </Modal>
  );
}
