import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/60 text-center",
        compact ? "px-5 py-8" : "px-6 py-14",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex size-10 items-center justify-center rounded-input border border-line bg-surface-2 text-ink-muted">
          {icon}
        </div>
      ) : null}
      <p className="serif text-xl text-ink">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
