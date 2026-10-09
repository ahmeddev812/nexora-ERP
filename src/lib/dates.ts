/**
 * NEXORA date helpers.
 *
 * Everything in the app stores day granularity as `YYYY-MM-DD` ("date key")
 * in the browser's local timezone. Parsing never uses `new Date(string)`
 * for date keys, because that is interpreted as UTC and shifts the day.
 */

export type DateKey = string;

export type DateFormat = "iso" | "us" | "eu";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(input: Date | string | number = new Date()): DateKey {
  if (typeof input === "string" && DATE_KEY_PATTERN.test(input)) {
    return input.slice(0, 10);
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return todayKey();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function parseDateKey(key: DateKey): Date {
  const safe = DATE_KEY_PATTERN.test(key) ? key : todayKey();
  const [year = "1970", month = "01", day = "01"] = safe.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function subtractDays(key: DateKey, days: number): DateKey {
  return addDays(key, -days);
}

export function addMonths(key: DateKey, months: number): DateKey {
  const date = parseDateKey(key);
  const targetDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(targetDay, lastDay));
  return toDateKey(date);
}

/** Ascending list of the last N days, ending on `from` (default: today). */
export function getLastNDays(n: number, from: DateKey = todayKey()): DateKey[] {
  const size = Math.max(1, Math.floor(n));
  const out: DateKey[] = [];
  for (let i = size - 1; i >= 0; i -= 1) {
    out.push(subtractDays(from, i));
  }
  return out;
}

export function daysBetween(from: DateKey, to: DateKey): number {
  const start = parseDateKey(from).getTime();
  const end = parseDateKey(to).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function formatDate(
  value: Date | DateKey | string,
  format: DateFormat = "iso",
): string {
  const key = toDateKey(value);
  const [year = "", month = "", day = ""] = key.split("-");

  if (format === "us") return `${month}/${day}/${year}`;
  if (format === "eu") return `${day}/${month}/${year}`;
  return key;
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDateTime(
  value: string | Date,
  format: DateFormat = "iso",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
  const key = toDateKey(date);
  const [, month = "01", day = "01"] = key.split("-");
  const year = key.slice(0, 4);
  const monthIndex = Math.max(0, Math.min(11, Number(month) - 1));

  if (format === "us") return `${month}/${day}/${year} ${time}`;
  if (format === "eu") return `${day}/${month}/${year} ${time}`;
  if (format === "iso") return `${key} ${time}`;

  return `${MONTHS_SHORT[monthIndex]} ${Number(day)}, ${year} ${time}`;
}

/** Compact "12m ago" label for activity feeds. */
export function relativeLabel(value: string | Date, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

export function monthLabel(year: number, month: number): string {
  const index = Math.max(0, Math.min(11, month - 1));
  return `${MONTHS_SHORT[index]} ${year}`;
}

export function startOfMonth(key: DateKey): DateKey {
  const date = parseDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(key: DateKey): DateKey {
  const date = parseDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function isOverdue(dueDate: DateKey, asOf: DateKey = todayKey()): boolean {
  return daysBetween(dueDate, asOf) > 0;
}

/* --------------------------- Aging buckets ------------------------ */

export type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export const AGING_BUCKETS: AgingBucket[] = ["0-30", "31-60", "61-90", "90+"];

/**
 * Buckets an outstanding document by its age in days.
 * Future dates are clamped into the first bucket.
 */
export function agingBucket(
  date: DateKey,
  asOf: DateKey = todayKey(),
): AgingBucket {
  const age = Math.max(0, daysBetween(date, asOf));
  if (age <= 30) return "0-30";
  if (age <= 60) return "31-60";
  if (age <= 90) return "61-90";
  return "90+";
}
