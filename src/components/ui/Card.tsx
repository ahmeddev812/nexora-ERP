import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type CardElevation = "flat" | "rest" | "hover";
export type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  padding?: CardPadding;
  interactive?: boolean;
  children: ReactNode;
}

const ELEVATION: Record<CardElevation, string> = {
  flat: "",
  rest: "card-rest",
  hover: "card-hover",
};

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  elevation = "rest",
  padding = "md",
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface",
        ELEVATION[elevation],
        PADDING[padding],
        interactive &&
          "cursor-pointer transition-[box-shadow,border-color] duration-150 hover:card-hover hover:border-line-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
