"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

interface StatCardProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  delta?: number | null;
  deltaCaption?: string;
  invertDelta?: boolean;
  spark?: number[];
  icon?: ReactNode;
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

function useCountUp(value: number, duration = 750): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = Number.isFinite(value) ? value : 0;
    const from = fromRef.current;
    const span = reduced ? 0 : duration;

    const started = performance.now();
    const tick = (now: number) => {
      const elapsed = now - started;
      if (span <= 0 || elapsed >= span) {
        fromRef.current = target;
        setDisplay(target);
        return;
      }
      const progress = elapsed / span;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return display;
}

const DEFAULT_FORMAT = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;

  const width = 100;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-7 w-full", className)}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="spark-path"
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  format = DEFAULT_FORMAT,
  delta = null,
  deltaCaption,
  invertDelta = false,
  spark,
  icon,
  hint,
  loading = false,
  onClick,
  className,
}: StatCardProps) {
  const animated = useCountUp(value);
  const deltaUp = delta !== null && delta > 0;
  const deltaDown = delta !== null && delta < 0;
  const positive = invertDelta ? deltaDown : deltaUp;
  const negative = invertDelta ? deltaUp : deltaDown;

  if (loading) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-card border border-line bg-surface p-5",
          className,
        )}
        aria-busy="true"
      >
        <Skeleton variant="text" width="55%" height="12px" className="rounded-tag" />
        <Skeleton width="70%" height="28px" className="mt-3 rounded-tag" />
        <Skeleton variant="text" width="100%" height="24px" className="mt-3 rounded-tag" />
      </div>
    );
  }

  const content = (
    <>
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 h-7 w-7 rounded-tr-card border-r border-t border-primary/25"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            {label}
          </p>
          <p className="numeric mt-2 text-[26px] leading-none text-ink">
            {format(animated)}
          </p>
        </div>
        {icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-input border border-line bg-surface-2 text-ink-muted">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {delta !== null ? (
            <span
              className={cn(
                "numeric inline-flex items-center gap-0.5 rounded-tag border px-1.5 py-0.5 text-[11px] font-medium",
                positive && "border-success/25 bg-success-soft text-success",
                negative && "border-destructive/25 bg-destructive-soft text-destructive",
                !positive && !negative && "border-line bg-surface-2 text-ink-muted",
              )}
            >
              {deltaUp ? (
                <ChevronUp size={12} strokeWidth={2} />
              ) : deltaDown ? (
                <ChevronDown size={12} strokeWidth={2} />
              ) : null}
              {Math.abs(delta).toFixed(1)}%
            </span>
          ) : null}
          {deltaCaption ? (
            <span className="ml-2 text-[12px] text-ink-faint">{deltaCaption}</span>
          ) : null}
        </div>
        {spark && spark.length > 1 ? (
          <span className="w-24 shrink-0 text-primary/70">
            <Sparkline values={spark} />
          </span>
        ) : null}
      </div>

      {hint ? <p className="mt-2 text-[12px] text-ink-faint">{hint}</p> : null}
    </>
  );

  const classes = cn(
    "relative overflow-hidden rounded-card border border-line bg-surface p-5 text-left",
    "transition-[box-shadow,border-color] duration-150",
    onClick ? "cursor-pointer hover:card-hover hover:border-line-strong" : "card-rest",
    "focus-ring-visible",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
