"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, type Crumb } from "@/components/layout/PageHeader";
import { useToastContext } from "@/context/ToastContext";
import type { CollectionKey, ERPItem } from "@/context/ERPDataProvider";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export type SimpleRow = Record<string, unknown>;

export type SimpleFieldKind = "text" | "number" | "select" | "textarea" | "checkbox";

export interface SimpleField {
  key: string;
  label: string;
  kind: SimpleFieldKind;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  mono?: boolean;
  options?: SelectOption[];
  default?: string | number | boolean;
}

export interface SimpleColumn {
  key: string;
  header: string;
  value?: (row: SimpleRow) => string | number;
  render?: (row: SimpleRow) => ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
  hideBelow?: "md" | "lg" | "xl";
}

export interface SimpleFilter {
  key: string;
  label: string;
  options: SelectOption[];
  default: string;
  apply: (row: SimpleRow, value: string) => boolean;
}

interface SimpleCrudPageProps {
  entityKey: CollectionKey;
  entityLabel: string;
  title: string;
  description: string;
  breadcrumbs?: Crumb[];
  fields: SimpleField[];
  columns: SimpleColumn[];
  filters?: SimpleFilter[];
  defaults?: Record<string, unknown>;
  searchValue: (row: SimpleRow) => string;
  searchPlaceholder?: string;
  /** Return a message to block the delete, or null to allow it. */
  guardDelete?: (row: SimpleRow) => string | null;
  createTitle?: string;
}

type Values = Record<string, string | boolean>;

function initialValues(fields: SimpleField[], row: SimpleRow | null): Values {
  const out: Values = {};
  for (const field of fields) {
    if (row) {
      const raw = row[field.key];
      out[field.key] =
        typeof raw === "boolean" ? raw : raw === undefined || raw === null ? "" : String(raw);
      continue;
    }
    if (field.default !== undefined) {
      out[field.key] =
        typeof field.default === "boolean" ? field.default : String(field.default);
    } else if (field.kind === "checkbox") {
      out[field.key] = false;
    } else if (field.kind === "select") {
      out[field.key] = field.options?.[0]?.value ?? "";
    } else if (field.kind === "number") {
      out[field.key] = "0";
    } else {
      out[field.key] = "";
    }
  }
  return out;
}

function coerce(field: SimpleField, raw: string | boolean): string | number | boolean {
  if (field.kind === "checkbox") return Boolean(raw);
  if (field.kind === "number") {
    const value = Number(String(raw).trim());
    return Number.isFinite(value) ? value : 0;
  }
  return field.kind === "textarea" ? String(raw) : String(raw).trim();
}

export function SimpleCrudPage({
  entityKey,
  entityLabel,
  title,
  description,
  breadcrumbs,
  fields,
  columns,
  filters,
  defaults,
  searchValue,
  searchPlaceholder,
  guardDelete,
  createTitle,
}: SimpleCrudPageProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [editing, setEditing] = useState<SimpleRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<SimpleRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const filter of filters ?? []) out[filter.key] = filter.default;
    return out;
  });

  const rows = data[entityKey] as unknown as SimpleRow[];

  const openCreate = () => {
    setEditing(null);
    setValues(initialValues(fields, null));
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = useCallback(
    (row: SimpleRow) => {
      setEditing(row);
      setValues(initialValues(fields, row));
      setErrors({});
      setFormOpen(true);
    },
    [fields],
  );

  const filtered = useMemo(() => {
    let next = rows;
    for (const filter of filters ?? []) {
      const value = filterValues[filter.key] ?? filter.default;
      if (value !== "all") next = next.filter((row) => filter.apply(row, value));
    }
    return next;
  }, [rows, filters, filterValues]);

  const tableColumns = useMemo<Array<DataTableColumn<SimpleRow>>>(
    () => [
      ...columns.map((column) => ({
        key: column.key,
        header: column.header,
        value: column.value,
        render: column.render,
        align: column.align,
        mono: column.mono,
        hideBelow: column.hideBelow,
      })),
      {
        key: "__actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <span className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-label={`Edit ${searchValue(row)}`}
              onClick={(event) => {
                event.stopPropagation();
                openEdit(row);
              }}
              className="focus-ring-visible flex size-7 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <Pencil size={13} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label={`Delete ${searchValue(row)}`}
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
    ],
    [columns, searchValue, openEdit],
  );

  const save = () => {
    const nextErrors: Record<string, string> = {};
    const built: Record<string, unknown> = {};

    for (const field of fields) {
      const raw = values[field.key] ?? "";
      if (field.kind !== "checkbox" && field.required && !String(raw).trim()) {
        nextErrors[field.key] = `${field.label} is required.`;
        continue;
      }
      built[field.key] = coerce(field, raw);
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const name = String(built.name ?? built.title ?? built.code ?? entityLabel);

    if (editing) {
      const id = String(editing.id);
      actions.updateRecord(
        entityKey,
        id,
        built as unknown as Partial<ERPItem<typeof entityKey>>,
        {
          summary: `Updated ${entityLabel.toLowerCase()} ${name}`,
        },
      );
      toast.success(`${entityLabel} updated`, name);
    } else {
      actions.createRecord(
        entityKey,
        { ...defaults, ...built } as unknown as ERPItem<typeof entityKey>,
        { summary: `Created ${entityLabel.toLowerCase()} ${name}` },
      );
      toast.success(`${entityLabel} created`, name);
    }

    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const blocked = guardDelete?.(pendingDelete);
    if (blocked) {
      toast.error(`Cannot delete ${entityLabel.toLowerCase()}`, blocked);
      setPendingDelete(null);
      return;
    }
    const name = searchValue(pendingDelete).split(" ").slice(0, 3).join(" ");
    actions.deleteRecord(entityKey, String(pendingDelete.id), {
      summary: `Deleted ${entityLabel.toLowerCase()} ${name}`,
    });
    toast.success(`${entityLabel} deleted`, name);
    setPendingDelete(null);
    setSelected((current) => {
      const next = new Set(current);
      next.delete(String(pendingDelete.id));
      return next;
    });
  };

  const confirmBulkDelete = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    for (const id of ids) {
      const row = rows.find((entry) => String(entry.id) === id);
      if (!row) continue;
      const blocked = guardDelete?.(row);
      if (blocked) {
        toast.error(`Cannot delete ${entityLabel.toLowerCase()}`, blocked);
        setBulkOpen(false);
        setSelected(new Set());
        return;
      }
    }
    const count = actions.bulkDelete(entityKey, ids, {
      summary: `Deleted ${ids.length} ${entityLabel.toLowerCase()} records`,
    });
    toast.success(`${count} ${entityLabel.toLowerCase()}${count === 1 ? "" : "s"} deleted`);
    setBulkOpen(false);
    setSelected(new Set());
  };

  const filterToolbar = (filters ?? []).map((filter) => (
    <Select
      key={filter.key}
      aria-label={filter.label}
      className="w-auto min-w-[150px]"
      options={filter.options}
      value={filterValues[filter.key] ?? filter.default}
      onChange={(event) =>
        setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))
      }
    />
  ));

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      {filterToolbar}
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
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          <Button size="sm" iconLeft={<Plus size={14} strokeWidth={1.5} />} onClick={openCreate}>
            {createTitle ?? `New ${entityLabel.toLowerCase()}`}
          </Button>
        }
      />

      <DataTable
        columns={tableColumns}
        rows={filtered}
        rowKey={(row) => String(row.id)}
        onRowClick={openEdit}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        toolbar={toolbar}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        emptyTitle={`No ${entityLabel.toLowerCase()} records`}
        emptyDescription="Add your first record to use it across documents and reports."
        pageSize={12}
        caption={`${title} list`}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${entityLabel.toLowerCase()}` : createTitle ?? `New ${entityLabel.toLowerCase()}`}
        description={description}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              {editing ? "Save changes" : `Create ${entityLabel.toLowerCase()}`}
            </Button>
          </div>
        }
      >
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {fields.map((field) => {
            const common = {
              label: field.label,
              required: field.required,
              hint: field.hint,
              error: errors[field.key],
              placeholder: field.placeholder,
            };

            if (field.kind === "textarea") {
              return (
                <div key={field.key} className="sm:col-span-2">
                  <Textarea
                    {...common}
                    rows={3}
                    value={String(values[field.key] ?? "")}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </div>
              );
            }

            if (field.kind === "checkbox") {
              return (
                <div key={field.key} className="sm:col-span-2">
                  <Checkbox
                    checked={Boolean(values[field.key])}
                    onChange={(checked) =>
                      setValues((current) => ({ ...current, [field.key]: checked }))
                    }
                    label={field.label}
                    hint={field.hint}
                  />
                </div>
              );
            }

            if (field.kind === "select") {
              return (
                <Select
                  key={field.key}
                  {...common}
                  options={field.options}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              );
            }

            return (
              <Input
                key={field.key}
                {...common}
                type={field.kind === "number" ? "number" : "text"}
                mono={field.mono}
                value={String(values[field.key] ?? "")}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
            );
          })}
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${entityLabel.toLowerCase()}?`}
        message={
          pendingDelete
            ? `${searchValue(pendingDelete)} will be removed from this workspace. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={bulkOpen}
        title={`Delete ${selected.size} records?`}
        message={`${selected.size} ${entityLabel.toLowerCase()}${selected.size === 1 ? "" : "s"} will be removed from this workspace. This cannot be undone.`}
        confirmLabel="Delete selected"
        destructive
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkOpen(false)}
      />
    </AppShell>
  );
}
