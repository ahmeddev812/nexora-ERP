import { formatMoney } from "@/lib/id";
import type { DocumentTotals } from "@/types/erp";

interface TotalsBlockProps {
  totals: DocumentTotals;
  currency?: string;
}

export function TotalsBlock({ totals, currency = "" }: TotalsBlockProps) {
  const rows = [
    { label: "Subtotal", value: totals.subtotal },
    { label: "Discount", value: -totals.discountTotal },
    { label: "Tax", value: totals.taxTotal },
  ];

  return (
    <div className="w-full max-w-xs rounded-card border border-line bg-surface p-4">
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-[13px]">
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="numeric text-ink">{formatMoney(row.value, currency, 2)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 border-t border-line pt-2">
          <dt className="text-[13px] font-medium text-ink">Total</dt>
          <dd className="numeric text-base font-medium text-ink">
            {formatMoney(totals.total, currency, 2)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
