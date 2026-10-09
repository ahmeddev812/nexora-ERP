/**
 * NEXORA export helpers.
 *
 * CSV is generated without any spreadsheet dependency: RFC-4180 quoting,
 * header driven columns, round-trippable through `parseCSV`.
 * JSON exports carry a schema version so imports can validate later.
 */

export const EXPORT_SCHEMA_VERSION = 1;
export const EXPORT_APP = "nexora";

export type CSVValue = string | number | boolean | null | undefined;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.map((item) => cellToString(item)).join(" | ");
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCSV(
  rows: ReadonlyArray<Record<string, unknown>>,
  columns?: readonly string[],
): string {
  if (rows.length === 0) return columns ? columns.join(",") : "";

  const header =
    columns && columns.length > 0
      ? [...columns]
      : Array.from(rows.reduce<Set<string>>((keys, row) => {
          for (const key of Object.keys(row)) keys.add(key);
          return keys;
        }, new Set<string>()));

  const lines: string[] = [header.map(escapeCell).join(",")];

  for (const row of rows) {
    lines.push(
      header.map((key) => escapeCell(cellToString(row[key]))).join(","),
    );
  }

  return lines.join("\r\n");
}

export function dateStampedFilename(base: string, extension: string): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}`;
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeExt = extension.replace(/^\.+/, "");
  return `${safeBase || "export"}-${stamp}.${safeExt}`;
}

/** Browser-only file download. No-op during SSR. */
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;

  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/** Writes a CSV file and returns the filename used (or null on failure). */
export function exportCSV(
  baseName: string,
  rows: ReadonlyArray<Record<string, unknown>>,
  columns?: readonly string[],
): string | null {
  const filename = dateStampedFilename(baseName, "csv");
  const body = toCSV(rows, columns);
  const ok = downloadFile(filename, body, "text/csv;charset=utf-8");
  return ok ? filename : null;
}

export interface JSONExportEnvelope<T> {
  app: typeof EXPORT_APP;
  schemaVersion: number;
  exportedAt: string;
  recordCount: number;
  data: T;
}

export function buildExportEnvelope<T>(data: T): JSONExportEnvelope<T> {
  return {
    app: EXPORT_APP,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    recordCount: Array.isArray(data)
      ? data.length
      : data && typeof data === "object"
        ? Object.keys(data as object).length
        : 0,
    data,
  };
}

export function isValidExportEnvelope(
  value: unknown,
): value is JSONExportEnvelope<unknown> {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<JSONExportEnvelope<unknown>>;
  return (
    envelope.app === EXPORT_APP &&
    typeof envelope.schemaVersion === "number" &&
    envelope.schemaVersion >= 1 &&
    envelope.schemaVersion <= EXPORT_SCHEMA_VERSION &&
    "data" in envelope
  );
}

export function exportJSON<T>(baseName: string, data: T): string | null {
  const filename = dateStampedFilename(baseName, "json");
  const body = JSON.stringify(buildExportEnvelope(data), null, 2);
  const ok = downloadFile(filename, body, "application/json");
  return ok ? filename : null;
}

/* ------------------------------- Parsing -------------------------- */

/** RFC-4180 style row splitter (quotes, embedded commas and newlines). */
export function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter(
    (entry) => entry.length > 1 || (entry[0] ?? "").trim().length > 0,
  );
}

/** Header-driven parse used by master data CSV imports. */
export function parseCSV(text: string): Array<Record<string, string>> {
  const rows = parseCSVRows(text);
  if (rows.length < 2) return [];

  const header = (rows[0] ?? []).map((name) => name.trim());
  const out: Array<Record<string, string>> = [];

  for (const row of rows.slice(1)) {
    const record: Record<string, string> = {};
    header.forEach((name, index) => {
      if (!name) return;
      record[name] = (row[index] ?? "").trim();
    });
    out.push(record);
  }

  return out;
}
