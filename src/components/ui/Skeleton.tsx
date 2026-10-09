import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "block" | "circle";
  width?: string;
  height?: string;
}

/** Shape-matching placeholder: match the final layout, not a grey box. */
export function Skeleton({
  className,
  variant = "block",
  width,
  height,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse bg-surface-2",
        variant === "text" && "h-3.5 rounded-tag",
        variant === "block" && "rounded-card",
        variant === "circle" && "rounded-full",
        className,
      )}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <Skeleton width="42%" height="14px" className="rounded-tag" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={index === lines - 1 ? "60%" : "100%"}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="border-b border-line bg-surface-2 px-4 py-3">
        <Skeleton width="30%" height="12px" className="rounded-tag" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((__, colIndex) => (
              <Skeleton
                key={colIndex}
                variant="text"
                className="rounded-tag"
                width={colIndex === 0 ? "24%" : `${Math.max(12, 20 - colIndex * 2)}%`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
