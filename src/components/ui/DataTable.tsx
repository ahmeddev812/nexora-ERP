"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { cn } from "@/lib/cn";
import { exportCSV } from "@/lib/export";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Sort key. Without it the column renders unsortable. */
  value?: (row: T) => string | number;
  /** Cell renderer. Falls back to `value`. */
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  mono?: boolean;
  /** Hide the column below this breakpoint. */
  hideBelow?: "md" | "lg" | "xl";
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  searchValue?: (row: T) => string;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  loading?: boolean;
  pageSize?: number;
  exportName?: string;
  /** Renders a checkbox column and a select-all control. */
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onSelectionChange?: (next: Set<string>) => void;
  selectionLabel?: string;
  className?: string;
  caption?: string;
}

const HIDE_CLASSES = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

const ALIGN_CLASSES = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

type SortState = { key: string; direction: "asc" | "desc" } | null;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  searchPlaceholder,
  searchValue,
  toolbar,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  loading = false,
  pageSize = 10,
  exportName,
  selectable = false,
  selectedIds,
  onSelectionChange,
  selectionLabel = "Select rows",
  className,
  caption,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !searchValue) return rows;
    return rows.filter((row) => searchValue(row).toLowerCase().includes(term));
  }, [rows, query, searchValue]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((entry) => entry.key === sort.key);
    if (!column?.value) return filtered;

    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = column.value?.(a);
      const right = column.value?.(b);
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * factor;
      }
      return String(left ?? "").localeCompare(String(right ?? "")) * factor;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(activePage * pageSize, activePage * pageSize + pageSize);

  const allVisibleIds = sorted.map((row) => rowKey(row));
  const selectedCount = allVisibleIds.filter((id) => selectedIds?.has(id)).length;
  const allSelected = allVisibleIds.length > 0 && selectedCount === allVisibleIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleRow = (id: string, checked: boolean) => {
    const draft = new Set(selectedIds ?? []);
    if (checked) draft.add(id);
    else draft.delete(id);
    onSelectionChange?.(draft);
  };

  const toggleAll = (checked: boolean) => {
    const draft = new Set(selectedIds ?? []);
    for (const id of allVisibleIds) {
      if (checked) draft.add(id);
      else draft.delete(id);
    }
    onSelectionChange?.(draft);
  };

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.value) return;
    setPage(0);
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: "asc" };
      if (current.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  };

  const cellClass = (column: DataTableColumn<T>) =>
    cn(
      "px-4 py-3 text-sm",
      column.align ? ALIGN_CLASSES[column.align] : "text-left",
      column.hideBelow ? HIDE_CLASSES[column.hideBelow] : undefined,
      column.mono && "numeric",
    );

  const headerClass = (column: DataTableColumn<T>) =>
    cn(
      "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint",
      column.align ? ALIGN_CLASSES[column.align] : undefined,
      column.hideBelow ? HIDE_CLASSES[column.hideBelow] : undefined,
    );

  const startRow = sorted.length === 0 ? 0 : activePage * pageSize + 1;
  const endRow = Math.min(sorted.length, (activePage + 1) * pageSize);

  return (
    <div className={cn("rounded-card border border-line bg-surface", className)}>
      {(searchValue || toolbar || exportName) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          {searchValue ? (
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={15}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder ?? "Search"}
                aria-label={searchPlaceholder ?? "Search"}
                className="focus-ring-visible h-9 w-full rounded-input border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint transition-[border-color] hover:border-line-strong focus:border-primary/60"
              />
            </div>
          ) : null}

          {toolbar}

          {exportName ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const exportRows = sorted.map((row) => {
                  const record: Record<string, unknown> = {};
                  for (const column of columns) {
                    const rendered = column.render?.(row) ?? column.value?.(row);
                    record[column.key] =
                      typeof rendered === "string" ||
                      typeof rendered === "number" ||
                      typeof rendered === "boolean"
                        ? rendered
                        : column.value?.(row) ?? "";
                  }
                  return record;
                });
                exportCSV(exportName, exportRows, columns.map((column) => column.key));
              }}
            >
              Export CSV
            </Button>
          ) : null}
        </div>
      )}

      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line bg-surface-2/70">
              {selectable ? (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    label={selectionLabel}
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const sortable = Boolean(column.value);
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      active
                        ? sort?.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : sortable
                          ? "none"
                          : undefined
                    }
                    className={headerClass(column)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={cn(
                          "focus-ring-visible inline-flex items-center gap-1 rounded-tag uppercase tracking-[0.12em] transition-colors hover:text-ink",
                          active && "text-ink",
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort?.direction === "asc" ? (
                            <ChevronUp size={13} strokeWidth={2} />
                          ) : (
                            <ChevronDown size={13} strokeWidth={2} />
                          )
                        ) : (
                          <ChevronDown
                            size={13}
                            strokeWidth={1.5}
                            className="opacity-30"
                          />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {loading
                ? Array.from({ length: Math.min(pageSize, 5) }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {selectable ? (
                      <td className="px-4 py-3">
                        <Skeleton variant="text" width="14px" className="rounded-tag" />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.key} className={cellClass(column)}>
                        <Skeleton
                          variant="text"
                          width={column.key === columns[0]?.key ? "70%" : "50%"}
                          className="rounded-tag"
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((row) => (
                  <tr
                    key={rowKey(row)}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter") {
                              if (event.target instanceof HTMLInputElement) return;
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "transition-colors",
                      onRowClick &&
                        "cursor-pointer hover:bg-surface-2/70 focus-ring-visible",
                    )}
                  >
                    {selectable ? (
                      <td
                        className="px-4 py-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds?.has(rowKey(row)) ?? false}
                          onChange={(checked) => toggleRow(rowKey(row), checked)}
                          label={
                            columns[0]?.value
                              ? `Select ${String(columns[0].value(row))}`
                              : `Select row ${rowKey(row)}`
                          }
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.key} className={cellClass(column)}>
                        {column.render
                          ? column.render(row)
                          : column.value
                            ? String(column.value(row))
                            : null}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!loading && visible.length === 0 ? (
        <div className="px-4 py-6">
          <EmptyState
            compact
            title={query ? "No matches" : emptyTitle}
            description={
              query
                ? `Nothing matches "${query}". Try a different search.`
                : emptyDescription
            }
            action={emptyAction}
          />
        </div>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="numeric text-[12px] text-ink-faint">
            {startRow}-{endRow} of {sorted.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={activePage === 0}
              onClick={() => setPage(activePage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} strokeWidth={1.5} />
            </Button>
            <span className="numeric px-2 text-[12px] text-ink-muted">
              {activePage + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={activePage >= pageCount - 1}
              onClick={() => setPage(activePage + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={15} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
