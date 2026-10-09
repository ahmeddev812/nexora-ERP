"use client";

import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/id";
import type { DashboardModel } from "@/hooks/useDashboardModel";

interface PipelinePanelProps {
  model: DashboardModel;
}

export function PipelinePanel({ model }: PipelinePanelProps) {
  return (
    <Card className="min-w-0">
      <CardHeader
        title="Order pipeline"
        description="Quotation through cash, with everything open right now."
      />

      <ol className="flex flex-col gap-2 xl:flex-row xl:items-stretch">
        {model.pipeline.map((stage, index) => (
          <li key={stage.id} className="flex min-w-0 items-center gap-2 xl:flex-1">
            <Link
              href={stage.href}
              className="focus-ring-visible flex min-w-0 flex-1 items-center gap-3 rounded-input border border-line bg-surface-2/60 px-3 py-2.5 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted">
                <Icon name={stage.icon} size={15} strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="numeric block text-lg leading-none text-ink">{stage.count}</span>
                <span className="mt-1 block truncate text-[11.5px] font-medium text-ink-muted">
                  {stage.label}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {typeof stage.amount === "number"
                    ? `${formatMoney(stage.amount, "", 0)} · ${stage.hint}`
                    : stage.hint}
                </span>
              </span>
            </Link>
            {index < model.pipeline.length - 1 ? (
              <span aria-hidden="true" className="shrink-0 text-ink-faint max-xl:hidden">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <section className="mt-6 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Top products
          </h3>
          <span className="text-[11px] text-ink-faint">by invoiced revenue, {model.days} days</span>
        </div>

        {model.topProducts.length === 0 ? (
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
            No product lines have been invoiced in this period.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {model.topProducts.map((product) => (
              <li key={product.id}>
                <ProgressBar
                  value={product.share}
                  max={100}
                  label={product.name}
                  hint={`${formatMoney(product.revenue, "", 0)} · ${product.share.toFixed(0)}%`}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
