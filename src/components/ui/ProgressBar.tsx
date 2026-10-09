import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  hint?: string;
  tone?: "primary" | "accent" | "success" | "warning" | "destructive";
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

const TONES: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  hint,
  tone = "primary",
  size = "md",
  showValue = true,
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = (clamped / safeMax) * 100;

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? (
            <span className="text-[13px] font-medium text-ink">{label}</span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="numeric text-[13px] text-ink-muted">
              {hint ?? `${Math.round(percent)}%`}
            </span>
          ) : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-2",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            TONES[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
