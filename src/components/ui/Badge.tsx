import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "destructive"
  | "info";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-2 text-ink-muted",
  primary: "border-primary/25 bg-primary-soft text-primary",
  accent: "border-accent/30 bg-accent-soft text-accent-strong",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  destructive: "border-destructive/25 bg-destructive-soft text-destructive",
  info: "border-info/25 bg-info-soft text-info",
};

const DOT_TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink-faint",
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-tag border px-2 py-0.5 text-[11px] font-medium leading-4 tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn("size-1.5 rounded-full", DOT_TONES[tone])}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
