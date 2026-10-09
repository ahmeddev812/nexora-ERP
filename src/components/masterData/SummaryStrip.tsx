import { cn } from "@/lib/cn";

export interface SummaryItem {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "destructive" | "accent";
}

const TONES = {
  default: "text-ink",
  success: "text-success",
  destructive: "text-destructive",
  accent: "text-accent-strong",
} as const;

export function SummaryStrip({ items }: { items: SummaryItem[] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {item.label}
          </p>
          <p className={cn("numeric mt-1.5 text-xl leading-none", TONES[item.tone ?? "default"])}>
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
