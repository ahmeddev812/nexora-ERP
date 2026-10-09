"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { DashboardModel } from "@/hooks/useDashboardModel";

const STATUS_TONE = {
  out_of_stock: "destructive",
  low_stock: "warning",
  in_stock: "success",
} as const;

const STATUS_LABEL = {
  out_of_stock: "Out of stock",
  low_stock: "Low stock",
  in_stock: "In stock",
} as const;

const APPROVAL_HREF: Record<string, string> = {
  sales_order: "/sales/orders",
  purchase_request: "/purchasing/requests",
  sales_invoice: "/sales/invoices",
  purchase_order: "/purchasing/orders",
};

function SectionLabel({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {children}
      </p>
      {count !== undefined && count > 0 ? (
        <span className="numeric rounded-tag border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
          {count}
        </span>
      ) : null}
    </div>
  );
}

interface AttentionPanelProps {
  model: DashboardModel;
}

export function AttentionPanel({ model }: AttentionPanelProps) {
  const alerts = model.alerts.filter((alert) => alert.status !== "in_stock").slice(0, 4);
  const overdue = model.overdueInvoices.slice(0, 3);
  const approvals = model.pendingApprovals.slice(0, 3);
  const empty =
    alerts.length === 0 && overdue.length === 0 && approvals.length === 0 && model.pendingLeaves === 0;

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader
        title="Needs attention"
        description="Stock, cash and approvals waiting on someone."
      />

      {empty ? (
        <EmptyState
          compact
          icon={<Icon name="alerts" size={18} strokeWidth={1.5} />}
          title="Nothing is waiting"
          description="Stock levels are healthy, no invoice is past due and the approval queue is clear."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {alerts.length > 0 ? (
            <section>
              <SectionLabel count={model.outOfStock + model.lowStock}>Stock</SectionLabel>
              <ul className="mt-2 flex flex-col gap-1.5">
                {alerts.map((alert) => (
                  <li key={alert.product.id}>
                    <Link
                      href="/inventory"
                      className="focus-ring-visible flex items-center gap-3 rounded-input border border-line bg-surface-2/60 px-3 py-2 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2"
                    >
                      <Icon name="products" size={15} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {alert.product.name}
                        </span>
                        <span className="numeric block text-[11px] text-ink-faint">
                          {alert.product.sku} · {alert.available} available
                        </span>
                      </span>
                      <Badge tone={STATUS_TONE[alert.status]}>{STATUS_LABEL[alert.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {overdue.length > 0 ? (
            <section>
              <SectionLabel count={model.overdueInvoices.length}>Overdue invoices</SectionLabel>
              <p className="numeric mt-1 text-[19px] text-ink">{formatMoney(model.overdueAmount, "", 0)}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {overdue.map((row) => (
                  <li key={row.invoice.id}>
                    <Link
                      href="/sales/invoices"
                      className="focus-ring-visible flex items-center gap-3 rounded-input border border-line bg-surface-2/60 px-3 py-2 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2"
                    >
                      <Icon name="invoices" size={15} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {row.customerName}
                        </span>
                        <span className="numeric block text-[11px] text-ink-faint">
                          {row.invoice.number} · due {formatDate(row.invoice.dueDate, "us")}
                        </span>
                      </span>
                      <span className="numeric shrink-0 text-right text-[13px] text-destructive">
                        {row.daysOverdue}d
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {approvals.length > 0 || model.pendingLeaves > 0 ? (
            <section>
              <SectionLabel count={model.pendingApprovals.length + model.pendingLeaves}>
                Approvals
              </SectionLabel>
              <ul className="mt-2 flex flex-col gap-1.5">
                {approvals.map((approval) => (
                  <li key={approval.id}>
                    <Link
                      href={APPROVAL_HREF[approval.refType] ?? "/dashboard"}
                      className="focus-ring-visible flex items-center gap-3 rounded-input border border-line bg-surface-2/60 px-3 py-2 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2"
                    >
                      <Icon name="approvals" size={15} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {approval.refType.replace(/_/g, " ")}
                        </span>
                        <span className="numeric block text-[11px] text-ink-faint">
                          {approval.refNumber} · waiting since {formatDate(approval.requestedAt, "us")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {model.pendingLeaves > 0 ? (
                  <li>
                    <Link
                      href="/hr/leaves"
                      className="focus-ring-visible flex items-center gap-3 rounded-input border border-line bg-surface-2/60 px-3 py-2 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2"
                    >
                      <Icon name="leaves" size={15} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          Leave requests
                        </span>
                        <span className="block text-[11px] text-ink-faint">
                          {model.pendingLeaves} awaiting review
                        </span>
                      </span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <div className="mt-auto pt-5">
        <Link
          href="/settings/audit"
          className="focus-ring-visible inline-flex items-center gap-1.5 rounded-tag text-[12.5px] font-medium text-primary transition-colors hover:text-primary-strong"
        >
          Open the audit trail
          <Icon name="pulse" size={13} strokeWidth={1.5} />
        </Link>
      </div>
    </Card>
  );
}
