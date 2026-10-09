"use client";

import Link from "next/link";

import { auditSentence } from "@/lib/audit";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { relativeLabel } from "@/lib/dates";
import type { DashboardModel } from "@/hooks/useDashboardModel";

const ENTITY_ICONS: Record<string, IconName> = {
  workspace: "dashboard",
  sales_invoice: "invoices",
  invoices: "invoices",
  sales_quotation: "quotations",
  quotations: "quotations",
  sales_order: "orders",
  orders: "orders",
  delivery: "deliveries",
  deliveries: "deliveries",
  sales_return: "salesReturns",
  purchase_order: "purchaseOrders",
  purchaseOrders: "purchaseOrders",
  purchase_request: "purchaseRequests",
  purchaseRequests: "purchaseRequests",
  supplier_bill: "bills",
  bills: "bills",
  receipt: "receipts",
  payment: "payments",
  payments: "payments",
  journal_entry: "journal",
  accounts: "accounts",
  account: "accounts",
  stock_movement: "inventory",
  stock_adjustment: "adjustments",
  stock_transfer: "transfers",
  product: "products",
  products: "products",
  customer: "customers",
  customers: "customers",
  supplier: "suppliers",
  suppliers: "suppliers",
  employee: "employees",
  employees: "employees",
  user: "users",
  users: "users",
  session: "users",
  approval: "approvals",
  approvals: "approvals",
  leave_request: "leaves",
  leaves: "leaves",
};

function entityIcon(entity: string): IconName {
  return ENTITY_ICONS[entity] ?? "audit";
}

interface ActivityPanelProps {
  model: DashboardModel;
}

export function ActivityPanel({ model }: ActivityPanelProps) {
  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader
        title="Latest activity"
        description="Every mutation is written to the append-only trail."
        actions={
          <Link
            href="/settings/audit"
            className="focus-ring-visible inline-flex items-center gap-1.5 rounded-tag text-[12.5px] font-medium text-primary transition-colors hover:text-primary-strong"
          >
            View all
            <Icon name="pulse" size={13} strokeWidth={1.5} />
          </Link>
        }
      />

      {model.activity.length === 0 ? (
        <EmptyState
          compact
          icon={<Icon name="audit" size={18} strokeWidth={1.5} />}
          title="No activity yet"
          description="Actions you take across the workspace will appear here, newest first."
        />
      ) : (
        <ul className="flex flex-1 flex-col gap-3.5">
          {model.activity.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-tag border border-line bg-surface-2 text-ink-muted">
                <Icon name={entityIcon(entry.entity)} size={14} strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-snug text-ink">{auditSentence(entry)}</span>
                <span className="numeric block text-[11.5px] text-ink-faint">
                  {entry.actorName} · {relativeLabel(entry.at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
