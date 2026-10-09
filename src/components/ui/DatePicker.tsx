"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  addMonths,
  formatDate,
  monthLabel,
  parseDateKey,
  startOfMonth,
  todayKey,
  type DateFormat,
  type DateKey,
} from "@/lib/dates";
import { FieldShell } from "./Input";

interface DatePickerProps {
  value: DateKey | null;
  onChange: (value: DateKey | null) => void;
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  min?: DateKey;
  max?: DateKey;
  allowClear?: boolean;
  displayFormat?: DateFormat;
  required?: boolean;
  className?: string;
  id?: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DatePicker({
  value,
  onChange,
  label,
  hint,
  error,
  placeholder = "Pick a date",
  min,
  max,
  allowClear = false,
  displayFormat = "iso",
  required,
  className,
  id,
}: DatePickerProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const popoverId = `${fieldId}-popover`;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<DateKey>(startOfMonth(value ?? todayKey()));
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cursorDate = parseDateKey(cursor);
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  const dayId = (key: DateKey) => `${fieldId}-day-${key}`;

  const selectDay = (key: DateKey) => {
    if (min && key < min) return;
    if (max && key > max) return;
    onChange(key);
    setOpen(false);
  };

  const moveFocus = (from: DateKey, deltaDays: number) => {
    const date = parseDateKey(from);
    date.setDate(date.getDate() + deltaDays);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;

    if (key.slice(0, 7) !== cursor) setCursor(startOfMonth(key));
    requestAnimationFrame(() => document.getElementById(dayId(key))?.focus());
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const key = target.dataset.date;
    if (!key) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(key, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(key, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(key, -7);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(key, 7);
    }
  };

  const cells: Array<DateKey | null> = [
    ...Array.from<DateKey | null>({ length: firstWeekday }).fill(null),
  ];
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  const display = value ? formatDate(value, displayFormat) : "";

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <button
            id={fieldId}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={popoverId}
            onClick={() => setOpen((current) => !current)}
            className={cn(
              "focus-ring-visible flex h-10 w-full items-center justify-between gap-2 rounded-input border bg-surface px-3 text-left text-sm transition-[border-color] duration-150",
              "hover:border-line-strong focus:border-primary/60",
              error ? "border-destructive" : "border-line",
              value ? "text-ink" : "text-ink-faint",
            )}
          >
            <span className="numeric truncate">{display || placeholder}</span>
            <span className="flex items-center gap-1 text-ink-faint">
              {allowClear && value ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear date"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.stopPropagation();
                      onChange(null);
                    }
                  }}
                  className="rounded-tag p-0.5 hover:bg-surface-2 hover:text-ink"
                >
                  <X size={13} strokeWidth={1.5} />
                </span>
              ) : null}
              <Calendar size={15} strokeWidth={1.5} />
            </span>
          </button>
        </div>

        {open ? (
          <div
            id={popoverId}
            role="dialog"
            aria-label={label ?? "Choose a date"}
            className="glass modal-shadow slide-in absolute left-0 z-50 mt-1.5 w-[286px] rounded-card border border-line p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCursor(startOfMonth(addMonths(cursor, -1)))}
                className="focus-ring-visible rounded-tag p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <ChevronLeft size={15} strokeWidth={1.5} />
              </button>
              <span className="text-sm font-medium text-ink">
                {monthLabel(year, month + 1)}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCursor(startOfMonth(addMonths(cursor, 1)))}
                className="focus-ring-visible rounded-tag p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <ChevronRight size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1" aria-hidden="true">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-ink-faint"
                >
                  {day.slice(0, 1)}
                </span>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-1"
              onKeyDown={onGridKeyDown}
            >
              {cells.map((key, index) => {
                if (!key) {
                  return <span key={`blank-${index}`} className="size-8" />;
                }

                const disabled = (min !== undefined && key < min) || (max !== undefined && key > max);
                const selected = value === key;
                const isToday = key === today;

                return (
                  <button
                    key={key}
                    id={dayId(key)}
                    type="button"
                    data-date={key}
                    disabled={disabled}
                    aria-label={formatDate(key, "eu")}
                    aria-pressed={selected}
                    onClick={() => selectDay(key)}
                    className={cn(
                      "focus-ring-visible size-8 rounded-tag text-[13px] transition-colors duration-100",
                      selected
                        ? "bg-primary font-semibold text-on-primary"
                        : isToday
                          ? "border border-primary/40 font-medium text-ink"
                          : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                      disabled && "pointer-events-none opacity-35",
                    )}
                  >
                    {Number(key.slice(8, 10))}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}
