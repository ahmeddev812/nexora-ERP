"use client";

import { useMemo, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { CustomerForm } from "@/components/customers/CustomerForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { invoiceBalance, isActiveSale, round2 } from "@/lib/calculations";
import { formatDate, isOverdue, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Payment, SalesInvoice, SalesOrder } from "@/types/erp";

const ORDER_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  pending: "warning",
  approved: "primary",
  fulfilled: "success",
  cancelled: "destructive",
};

const INVOICE_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  issued: "primary",
  partial: "warning",
  paid: "success",
  overdue: "destructive",
  void: "neutral",
  refunded: "info",
};

const money = (value: number) => formatMoney(value, "", 0);

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-[11.5px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] text-ink">
        {value && value.trim() ? value : <span className="text-ink-faint">Not set</span>}
      </dd>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [tab, setTab] = useState("orders");
  const [formOpen, setFormOpen] = useState(false);

  const id = params.id;
  const customer = data.customers.find((entry) => entry.id === id);

  const orders = useMemo(
    () => data.salesOrders.filter((order) => order.customerId === id),
    [data.salesOrders, id],
  );
  const invoices = useMemo(
    () => data.salesInvoices.filter((invoice) => invoice.customerId === id),
    [data.salesInvoices, id],
  );
  const payments = useMemo(
    () => data.payments.filter((payment) => payment.partyType === "customer" && payment.partyId === id),
    [data.payments, id],
  );

  const totals = useMemo(() => {
    const active = invoices.filter((invoice) => isActiveSale(invoice));
    const invoiced = round2(active.reduce((acc, invoice) => acc + invoice.total, 0));
    const paid = round2(active.reduce((acc, invoice) => acc + invoice.paidAmount, 0));
    const outstanding = round2(active.reduce((acc, invoice) => acc + invoiceBalance(invoice), 0));
    const today = todayKey();
    const overdue = active.filter(
      (invoice) => invoiceBalance(invoice) > 0 && isOverdue(invoice.dueDate, today),
    ).length;
    return { invoiced, paid, outstanding, overdue, orders: orders.length };
  }, [invoices, orders.length]);

  if (!customer) notFound();

  const toggleStatus = () => {
    const next = customer.status === "active" ? "archived" : "active";
    actions.updateRecord("customers", customer.id, { status: next }, {
      summary: `${next === "archived" ? "Archived" : "Reactivated"} customer ${customer.name}`,
    });
    toast.success(
      next === "archived" ? "Customer archived" : "Customer reactivated",
      customer.name,
    );
  };

  const orderColumns: Array<DataTableColumn<SalesOrder>> = [
    { key: "number", header: "Order", value: (row) => row.number, mono: true },
    { key: "date", header: "Date", value: (row) => row.date, render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span> },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={ORDER_TONE[row.status] ?? "neutral"}>{row.status}</Badge>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: (row) => row.total,
      render: (row) => <span className="numeric text-[13px] text-ink">{money(row.total)}</span>,
      mono: true,
    },
  ];

  const invoiceColumns: Array<DataTableColumn<SalesInvoice>> = [
    { key: "number", header: "Invoice", value: (row) => row.number, mono: true },
    { key: "date", header: "Issued", value: (row) => row.date, render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>, hideBelow: "md" },
    { key: "dueDate", header: "Due", value: (row) => row.dueDate, render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.dueDate, "us")}</span>, hideBelow: "md" },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={INVOICE_TONE[row.status] ?? "neutral"}>{row.status}</Badge>,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      value: (row) => invoiceBalance(row),
      render: (row) => (
        <span className="numeric text-[13px] text-ink">{money(invoiceBalance(row))}</span>
      ),
      mono: true,
    },
  ];

  const paymentColumns: Array<DataTableColumn<Payment>> = [
    { key: "number", header: "Receipt", value: (row) => row.number, mono: true },
    { key: "date", header: "Date", value: (row) => row.date, render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span> },
    { key: "method", header: "Method", value: (row) => row.method, render: (row) => <span className="text-[13px] capitalize text-ink-muted">{row.method.replace("_", " ")}</span>, hideBelow: "md" },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => (
        <Badge tone={row.status === "cleared" ? "success" : row.status === "void" ? "destructive" : "warning"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      value: (row) => row.amount,
      render: (row) => <span className="numeric text-[13px] text-ink">{money(row.amount)}</span>,
      mono: true,
    },
  ];

  const creditUsed =
    customer.creditLimit > 0 ? Math.min(100, (totals.outstanding / customer.creditLimit) * 100) : 0;

  return (
    <AppShell>
      <PageHeader
        title={customer.name}
        description={`${customer.code} · ${customer.status === "active" ? "Active account" : "Archived account"}${customer.tags.length > 0 ? ` · ${customer.tags.join(", ")}` : ""}`}
        breadcrumbs={[{ label: "Customers", href: "/customers" }, { label: customer.name }]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={toggleStatus}>
              {customer.status === "active" ? "Archive" : "Reactivate"}
            </Button>
            <Button size="sm" iconLeft={<Pencil size={14} strokeWidth={1.5} />} onClick={() => setFormOpen(true)}>
              Edit
            </Button>
          </>
        }
      />

      <SummaryStrip
        items={[
          { label: "Orders", value: String(totals.orders) },
          { label: "Invoiced", value: money(totals.invoiced) },
          { label: "Collected", value: money(totals.paid), tone: "success" },
          {
            label: "Outstanding",
            value: money(totals.outstanding),
            tone: totals.outstanding > 0 ? "accent" : "default",
            hint: totals.overdue > 0 ? `${totals.overdue} overdue` : "Nothing overdue",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="min-w-0 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-ink">Document history</h2>
            <Tabs
              tabs={[
                { id: "orders", label: "Orders", count: orders.length },
                { id: "invoices", label: "Invoices", count: invoices.length },
                { id: "payments", label: "Payments", count: payments.length },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>

          {tab === "orders" ? (
            <DataTable
              columns={orderColumns}
              rows={orders}
              rowKey={(row) => row.id}
              onRowClick={() => router.push("/sales/orders")}
              emptyTitle="No orders yet"
              emptyDescription="Sales orders raised for this customer will appear here."
              pageSize={8}
              exportName="customer-orders"
              caption="Sales orders"
            />
          ) : null}

          {tab === "invoices" ? (
            <DataTable
              columns={invoiceColumns}
              rows={invoices}
              rowKey={(row) => row.id}
              onRowClick={() => router.push("/sales/invoices")}
              emptyTitle="No invoices yet"
              emptyDescription="Invoices issued to this customer will appear here."
              pageSize={8}
              exportName="customer-invoices"
              caption="Invoices"
            />
          ) : null}

          {tab === "payments" ? (
            <DataTable
              columns={paymentColumns}
              rows={payments}
              rowKey={(row) => row.id}
              emptyTitle="No payments yet"
              emptyDescription="Receipts recorded against this customer will appear here."
              pageSize={8}
              exportName="customer-payments"
              caption="Payments received"
            />
          ) : null}
        </section>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <Card>
            <CardHeader title="Credit position" description="Exposure against the configured limit." />
            <ProgressBar
              value={creditUsed}
              max={100}
              tone={creditUsed >= 100 ? "destructive" : creditUsed >= 80 ? "warning" : "primary"}
              label="Credit used"
              hint={
                customer.creditLimit > 0
                  ? `${money(totals.outstanding)} of ${money(customer.creditLimit)}`
                  : "No limit set"
              }
            />
            <dl className="mt-4 divide-y divide-line border-t border-line">
              <DetailRow label="Payment terms" value={customer.paymentTerms > 0 ? `${customer.paymentTerms} days` : "Due on receipt"} />
              <DetailRow label="Currency" value={customer.currency} />
              <DetailRow label="Opening balance" value={money(customer.openingBalance)} />
              <DetailRow label="Lifetime invoiced" value={money(totals.invoiced)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Profile" description="Details printed on documents." />
            <dl className="divide-y divide-line">
              <DetailRow label="Contact" value={customer.contactName} />
              <DetailRow label="Email" value={customer.email} />
              <DetailRow label="Phone" value={customer.phone} />
              <DetailRow label="Address" value={customer.address} />
              <DetailRow
                label="City"
                value={[customer.city, customer.country].filter(Boolean).join(", ")}
              />
              <DetailRow label="Tax ID" value={customer.taxId} />
              <DetailRow label="Website" value={customer.website} />
            </dl>
            {customer.notes ? (
              <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-muted">
                {customer.notes}
              </p>
            ) : null}
          </Card>
        </aside>
      </div>

      {formOpen ? <CustomerForm customer={customer} onClose={() => setFormOpen(false)} /> : null}
    </AppShell>
  );
}
