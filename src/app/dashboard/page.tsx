"use client";

import { Download, Plus } from "lucide-react";

import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { AgingPanel } from "@/components/dashboard/AgingPanel";
import { AttentionPanel } from "@/components/dashboard/AttentionPanel";
import { MetricStrip } from "@/components/dashboard/MetricStrip";
import { PipelinePanel } from "@/components/dashboard/PipelinePanel";
import { RevenuePanel } from "@/components/dashboard/RevenuePanel";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useDashboardModel } from "@/hooks/useDashboardModel";
import { useERPData } from "@/hooks/useERPData";
import { formatDate } from "@/lib/dates";
import { exportCSV } from "@/lib/export";
import { inRange } from "@/lib/calculations";

export default function DashboardPage() {
  const model = useDashboardModel();
  const { business, customers, salesInvoices } = useERPData();

  const exportPeriod = () => {
    const nameById = new Map(customers.map((customer) => [customer.id, customer.name]));
    const rows = salesInvoices
      .filter((invoice) => inRange(invoice.date, model.range))
      .map((invoice) => ({
        invoice: invoice.number,
        customer: nameById.get(invoice.customerId) ?? "",
        date: invoice.date,
        due: invoice.dueDate,
        total: invoice.total,
        paid: invoice.paidAmount,
        status: invoice.status,
      }));
    exportCSV(
      "period-invoices",
      rows,
      ["invoice", "customer", "date", "due", "total", "paid", "status"],
    );
  };

  const description = business
    ? `${business.name} · ${formatDate(model.range.from, "us")} to ${formatDate(model.range.to, "us")}`
    : `${formatDate(model.range.from, "us")} to ${formatDate(model.range.to, "us")}`;

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description={description}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} strokeWidth={1.5} />}
              onClick={exportPeriod}
            >
              Export period
            </Button>
            <Button size="sm" iconLeft={<Plus size={14} strokeWidth={1.5} />} href="/sales/invoices">
              New invoice
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <MetricStrip model={model} />

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <RevenuePanel model={model} />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <AttentionPanel model={model} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <PipelinePanel model={model} />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <ActivityPanel model={model} />
          </div>
        </div>

        <section className="mt-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="serif text-2xl leading-tight text-ink">Where the money sits</h2>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
                Aging buckets, open payables and the invoices that have already missed their due
                date.
              </p>
            </div>
          </div>
          <AgingPanel model={model} />
        </section>
      </div>
    </AppShell>
  );
}
