"use client";

import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/ui/StatCard";
import { formatMoney } from "@/lib/id";
import type { DashboardModel } from "@/hooks/useDashboardModel";

const money = (value: number) => formatMoney(value, "", 0);

interface MetricStripProps {
  model: DashboardModel;
}

export function MetricStrip({ model }: MetricStripProps) {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={`Revenue · ${model.days}d`}
        value={model.revenue.value}
        format={money}
        delta={model.revenue.delta}
        deltaCaption="vs previous"
        spark={model.revenueSeries.map((point) => point.value)}
        icon={<Icon name="analytics" size={16} strokeWidth={1.5} />}
        hint={`${model.invoicesInRange} invoices issued`}
        onClick={() => router.push("/reports")}
      />
      <StatCard
        label={`Collected · ${model.days}d`}
        value={model.collected.value}
        format={money}
        delta={model.collected.delta}
        deltaCaption="vs previous"
        spark={model.collectedSeries.map((point) => point.value)}
        icon={<Icon name="payments" size={16} strokeWidth={1.5} />}
        hint={
          model.collectionRate === null
            ? "No invoices in this period"
            : `${model.collectionRate.toFixed(0)}% of revenue collected`
        }
        onClick={() => router.push("/finance/payments")}
      />
      <StatCard
        label="Cash at bank"
        value={model.cash}
        format={money}
        spark={model.cashSeries.map((point) => point.value)}
        icon={<Icon name="ledger" size={16} strokeWidth={1.5} />}
        hint="Cleared balance across cash accounts"
        onClick={() => router.push("/finance/ledger")}
      />
      <StatCard
        label={`Net profit · ${model.days}d`}
        value={model.netProfit.value}
        format={money}
        delta={model.netProfit.delta}
        deltaCaption="vs previous"
        invertDelta={false}
        icon={<Icon name="statements" size={16} strokeWidth={1.5} />}
        hint={
          model.margin === null
            ? "Revenue minus cost and operating expenses"
            : `${model.margin.toFixed(1)}% gross margin`
        }
        onClick={() => router.push("/finance/statements")}
      />
    </div>
  );
}
