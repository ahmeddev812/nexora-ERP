"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { formatMoney } from "@/lib/id";
import type { DashboardDays, DashboardModel } from "@/hooks/useDashboardModel";

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const money = (value: number) => formatMoney(value, "", 0);

interface ChartPoint {
  date: string;
  revenue: number;
  collected: number;
}

const PERIOD_TABS = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
];

interface RevenuePanelProps {
  model: DashboardModel;
}

export function RevenuePanel({ model }: RevenuePanelProps) {
  const points = useMemo<ChartPoint[]>(() => {
    const collectedByDate = new Map(
      model.collectedSeries.map((point) => [point.date, point.value]),
    );
    return model.revenueSeries.map((point) => ({
      date: point.date,
      revenue: point.value,
      collected: collectedByDate.get(point.date) ?? 0,
    }));
  }, [model.revenueSeries, model.collectedSeries]);

  return (
    <Card className="min-w-0">
      <CardHeader
        title="Revenue and collections"
        description="Invoiced revenue against cash received, by day."
        actions={
          <Tabs
            tabs={PERIOD_TABS}
            value={String(model.days)}
            onChange={(id) => model.setDays(Number(id) as DashboardDays)}
          />
        }
      />

      <div className="h-[248px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.24} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid-line)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              tickFormatter={(value) => String(value).slice(5)}
              minTickGap={28}
            />
            <YAxis
              width={54}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              tickFormatter={(value) => compact.format(Number(value))}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text)",
              }}
              labelStyle={{ color: "var(--text-faint)", fontSize: 11 }}
              formatter={(value) => money(Number(value))}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
            <Area
              type="monotone"
              dataKey="collected"
              name="Collected"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#collectedFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-input border border-line bg-line sm:grid-cols-4">
        {[
          { label: "Revenue", value: money(model.revenue.value) },
          { label: "Collected", value: money(model.collected.value) },
          {
            label: "Collection rate",
            value: model.collectionRate === null ? "n/a" : `${model.collectionRate.toFixed(0)}%`,
          },
          { label: "Invoices", value: String(model.invoicesInRange) },
        ].map((cell) => (
          <div key={cell.label} className="bg-surface px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{cell.label}</dt>
            <dd className="numeric mt-1 text-[15px] text-ink">{cell.value}</dd>
          </div>
        ))}
      </dl>

      {model.invoicesInRange === 0 ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
          No invoices are dated in this period yet. Widen the window or raise your first invoice to
          see the trend.
        </p>
      ) : null}
    </Card>
  );
}
