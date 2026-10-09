"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./Section";

const REVENUE_TARGET = 486240;
const RECEIVABLE_TARGET = 63810;
const STOCK_TARGET = 212470;

const SERIES = [18, 24, 21, 30, 27, 35, 32, 41, 38, 46, 44, 52, 49, 58];

const ROWS = [
  {
    id: "inv-0118",
    number: "INV-0118",
    customer: "Riverside Grocers",
    amount: 4820,
    status: "Paid",
    tone: "success" as const,
    due: "2026-10-04",
    terms: "30 days",
    balance: 0,
  },
  {
    id: "inv-0117",
    number: "INV-0117",
    customer: "Bayside Hotels Group",
    amount: 12410,
    status: "Partial",
    tone: "primary" as const,
    due: "2026-10-19",
    terms: "45 days",
    balance: 5100,
  },
  {
    id: "inv-0116",
    number: "INV-0116",
    customer: "Metro Office Furnishings",
    amount: 2145,
    status: "Overdue",
    tone: "destructive" as const,
    due: "2026-09-21",
    terms: "30 days",
    balance: 2145,
  },
  {
    id: "inv-0115",
    number: "INV-0115",
    customer: "Lumen Cafe Group",
    amount: 980,
    status: "Paid",
    tone: "success" as const,
    due: "2026-10-12",
    terms: "30 days",
    balance: 0,
  },
  {
    id: "inv-0114",
    number: "INV-0114",
    customer: "Kestrel Outfitters",
    amount: 6375,
    status: "Issued",
    tone: "neutral" as const,
    due: "2026-10-27",
    terms: "15 days",
    balance: 6375,
  },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function useCountUp(target: number, active: boolean, enabled: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || !enabled) return;
    let frame = 0;
    const start = performance.now();
    const duration = 1400;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, enabled, target]);

  if (!enabled) return active ? target : 0;
  return value;
}

function buildChart() {
  const width = 520;
  const height = 152;
  const pad = 10;
  const max = Math.max(...SERIES);
  const points = SERIES.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / (SERIES.length - 1);
    const y = height - pad - (value / max) * (height - pad * 2);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return { line: "", area: "" };

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L${last.x} ${height} L${first.x} ${height} Z`;
  return { line, area };
}

const CHART = buildChart();

export function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);

  const revenue = useCountUp(REVENUE_TARGET, inView, !reduced);
  const receivable = useCountUp(RECEIVABLE_TARGET, inView, !reduced);
  const stock = useCountUp(STOCK_TARGET, inView, !reduced);
  const activeRow = ROWS.find((row) => row.id === selected) ?? null;

  return (
    <section id="preview" className="scroll-mt-24 border-y border-line bg-surface-2/60 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>The workspace</Eyebrow>
            <h2 className="serif mt-4 max-w-xl text-[clamp(1.9rem,4vw,2.9rem)] leading-[1.06] tracking-tight text-ink">
              The screen your team opens every morning
            </h2>
          </div>
          <p className="max-w-sm text-[14.5px] leading-relaxed text-ink-muted">
            Numbers are computed from the documents on the left, never typed in.
            Pick a row below to see what the invoice knows about itself.
          </p>
        </div>

        <div
          ref={ref}
          className="mt-10 overflow-hidden rounded-hero border border-line bg-surface card-rest"
        >
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
              </span>
              <span className="numeric text-[11.5px] text-ink-faint">
                harbor field supply / dashboard
              </span>
            </div>
            <Badge tone="success" dot>
              Local session
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="border-b border-line p-5 sm:p-7 lg:col-span-7 lg:border-b-0 lg:border-r">
              <p className="numeric text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                Net revenue · last 90 days
              </p>
              <p className="numeric mt-2 text-[clamp(2.2rem,5vw,3.1rem)] leading-none text-ink">
                {money(revenue)}
              </p>

              <div className="mt-6 h-[152px] w-full">
                <svg
                  viewBox="0 0 520 152"
                  className="h-full w-full"
                  role="img"
                  aria-label="Revenue trend over the last fourteen days"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="preview-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.15 160)" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="oklch(0.55 0.15 160)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0, 1, 2, 3].map((row) => (
                    <line
                      key={row}
                      x1="0"
                      x2="520"
                      y1={10 + row * 44}
                      y2={10 + row * 44}
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                  ))}
                  <path d={CHART.area} fill="url(#preview-area)" />
                  <motion.path
                    d={CHART.line}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduced ? undefined : { pathLength: 0 }}
                    animate={inView ? { pathLength: 1 } : undefined}
                    transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-muted">
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-primary" aria-hidden="true" />
                  Daily invoiced value
                </span>
                <span className="numeric text-ink-faint">14 day window</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:col-span-5">
              <div className="border-b border-line p-5 sm:p-7">
                <p className="numeric text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                  Open receivables
                </p>
                <p className="numeric mt-2 text-3xl leading-none text-ink">
                  {money(receivable)}
                </p>
                <p className="mt-3 text-[12.5px] text-ink-muted">
                  7 invoices, 1 past due
                </p>
              </div>
              <div className="p-5 sm:p-7">
                <p className="numeric text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                  Stock at cost
                </p>
                <p className="numeric mt-2 text-3xl leading-none text-ink">
                  {money(stock)}
                </p>
                <p className="mt-3 text-[12.5px] text-ink-muted">
                  18 products across 2 warehouses
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-line">
            <div className="hidden grid-cols-[110px_1fr_120px_110px] gap-4 border-b border-line px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-ink-faint sm:grid">
              <span>Document</span>
              <span>Customer</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>

            <ul className="divide-y divide-line">
              {ROWS.map((row) => {
                const isActive = selected === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSelected(isActive ? null : row.id)}
                      className={cn(
                        "focus-ring-visible grid w-full grid-cols-2 items-center gap-x-4 gap-y-1 px-5 py-3 text-left transition-colors duration-150 sm:grid-cols-[110px_1fr_120px_110px]",
                        isActive
                          ? "bg-primary-soft"
                          : "hover:bg-surface-2 cursor-pointer",
                      )}
                    >
                      <span className="numeric text-[12.5px] text-ink">{row.number}</span>
                      <span className="truncate text-[13.5px] text-ink-muted">
                        {row.customer}
                      </span>
                      <span className="numeric text-right text-[13px] text-ink">
                        {money(row.amount)}
                      </span>
                      <span className="flex justify-end">
                        <Badge tone={row.tone}>{row.status}</Badge>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {activeRow ? (
              <div className="slide-in border-t border-line bg-surface-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  <p className="numeric text-[13px] text-ink">{activeRow.number}</p>
                  <p className="text-[13px] text-ink-muted">
                    Terms <span className="numeric text-ink">{activeRow.terms}</span>
                  </p>
                  <p className="text-[13px] text-ink-muted">
                    Due <span className="numeric text-ink">{activeRow.due}</span>
                  </p>
                  <p className="text-[13px] text-ink-muted">
                    Balance{" "}
                    <span className="numeric text-ink">{money(activeRow.balance)}</span>
                  </p>
                  <span className="ml-auto text-[12.5px] text-primary">
                    Allocations, tax and audit entries are one click away
                  </span>
                </div>
              </div>
            ) : (
              <p className="border-t border-line bg-surface-2 px-5 py-4 text-[12.5px] text-ink-faint">
                Select an invoice to inspect its terms, balance and audit trail.
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-[12px] text-ink-faint">
          Illustrative workspace. Every figure in the product itself is calculated
          from your own documents.
        </p>
      </div>
    </section>
  );
}
