"use client";

import { useMemo, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { SummaryStrip } from "@/components/masterData/SummaryStrip";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { invoiceBalance, isActiveBill, round2 } from "@/lib/calculations";
import { formatDate, isOverdue, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { Payment, PurchaseOrder, SupplierBill } from "@/types/erp";

const ORDER_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  sent: "primary",
  partially_received: "warning",
  received: "success",
  cancelled: "destructive",
};

const BILL_TONE: Record<string, BadgeTone> = {
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

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [tab, setTab] = useState("orders");
  const [formOpen, setFormOpen] = useState(false);

  const id = params.id;
  const supplier = data.suppliers.find((entry) => entry.id === id);

  const orders = useMemo(
    () => data.purchaseOrders.filter((order) => order.supplierId === id),
    [data.purchaseOrders, id],
  );
  const bills = useMemo(
    () => data.supplierBills.filter((bill) => bill.supplierId === id),
    [data.supplierBills, id],
  );
  const payments = useMemo(
    () => data.payments.filter((payment) => payment.partyType === "supplier" && payment.partyId === id),
    [data.payments, id],
  );

  const totals = useMemo(() => {
    const active = bills.filter((bill) => isActiveBill(bill));
    const billed = round2(active.reduce((acc, bill) => acc + bill.total, 0));
    const paid = round2(active.reduce((acc, bill) => acc + bill.paidAmount, 0));
    const owed = round2(active.reduce((acc, bill) => acc + invoiceBalance(bill), 0));
    const today = todayKey();
    const overdue = active.filter(
      (bill) => invoiceBalance(bill) > 0 && isOverdue(bill.dueDate, today),
    ).length;
    return { billed, paid, owed, overdue, orders: orders.length };
  }, [bills, orders.length]);

  if (!supplier) notFound();

  const toggleStatus = () => {
    const next = supplier.status === "active" ? "archived" : "active";
    actions.updateRecord("suppliers", supplier.id, { status: next }, {
      summary: `${next === "archived" ? "Archived" : "Reactivated"} supplier ${supplier.name}`,
    });
    toast.success(
      next === "archived" ? "Supplier archived" : "Supplier reactivated",
      supplier.name,
    );
  };

  const orderColumns: Array<DataTableColumn<PurchaseOrder>> = [
    { key: "number", header: "Order", value: (row) => row.number, mono: true },
    {
      key: "date",
      header: "Date",
      value: (row) => row.date,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>,
    },
    {
      key: "expectedDate",
      header: "Expected",
      value: (row) => row.expectedDate,
      render: (row) => (
        <span className="numeric text-[13px] text-ink-muted">{formatDate(row.expectedDate, "us")}</span>
      ),
      hideBelow: "md",
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => (
        <Badge tone={ORDER_TONE[row.status] ?? "neutral"}>{row.status.replace("_", " ")}</Badge>
      ),
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

  const billColumns: Array<DataTableColumn<SupplierBill>> = [
    { key: "number", header: "Bill", value: (row) => row.number, mono: true },
    {
      key: "date",
      header: "Issued",
      value: (row) => row.date,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>,
      hideBelow: "md",
    },
    {
      key: "dueDate",
      header: "Due",
      value: (row) => row.dueDate,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.dueDate, "us")}</span>,
      hideBelow: "md",
    },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => <Badge tone={BILL_TONE[row.status] ?? "neutral"}>{row.status}</Badge>,
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      value: (row) => invoiceBalance(row),
      render: (row) => <span className="numeric text-[13px] text-ink">{money(invoiceBalance(row))}</span>,
      mono: true,
    },
  ];

  const paymentColumns: Array<DataTableColumn<Payment>> = [
    { key: "number", header: "Payment", value: (row) => row.number, mono: true },
    {
      key: "date",
      header: "Date",
      value: (row) => row.date,
      render: (row) => <span className="numeric text-[13px] text-ink-muted">{formatDate(row.date, "us")}</span>,
    },
    {
      key: "method",
      header: "Method",
      value: (row) => row.method,
      render: (row) => <span className="text-[13px] capitalize text-ink-muted">{row.method.replace("_", " ")}</span>,
      hideBelow: "md",
    },
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

  return (
    <AppShell>
      <PageHeader
        title={supplier.name}
        description={`${supplier.code} · ${supplier.status === "active" ? "Active vendor" : "Archived vendor"}${supplier.tags.length > 0 ? ` · ${supplier.tags.join(", ")}` : ""}`}
        breadcrumbs={[{ label: "Suppliers", href: "/suppliers" }, { label: supplier.name }]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={toggleStatus}>
              {supplier.status === "active" ? "Archive" : "Reactivate"}
            </Button>
            <Button size="sm" iconLeft={<Pencil size={14} strokeWidth={1.5} />} onClick={() => setFormOpen(true)}>
              Edit
            </Button>
          </>
        }
      />

      <SummaryStrip
        items={[
          { label: "Purchase orders", value: String(totals.orders) },
          { label: "Billed", value: money(totals.billed) },
          { label: "Paid", value: money(totals.paid), tone: "success" },
          {
            label: "Owed",
            value: money(totals.owed),
            tone: totals.owed > 0 ? "accent" : "default",
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
                { id: "bills", label: "Bills", count: bills.length },
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
              onRowClick={() => router.push("/purchasing/orders")}
              emptyTitle="No purchase orders yet"
              emptyDescription="Purchase orders raised against this supplier will appear here."
              pageSize={8}
              exportName="supplier-orders"
              caption="Purchase orders"
            />
          ) : null}

          {tab === "bills" ? (
            <DataTable
              columns={billColumns}
              rows={bills}
              rowKey={(row) => row.id}
              onRowClick={() => router.push("/purchasing/bills")}
              emptyTitle="No bills yet"
              emptyDescription="Supplier bills recorded against this vendor will appear here."
              pageSize={8}
              exportName="supplier-bills"
              caption="Supplier bills"
            />
          ) : null}

          {tab === "payments" ? (
            <DataTable
              columns={paymentColumns}
              rows={payments}
              rowKey={(row) => row.id}
              emptyTitle="No payments yet"
              emptyDescription="Outgoing payments recorded to this supplier will appear here."
              pageSize={8}
              exportName="supplier-payments"
              caption="Payments made"
            />
          ) : null}
        </section>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <Card>
            <CardHeader title="Payable position" description="What is currently owed to them." />
            <dl className="divide-y divide-line border-t border-line">
              <DetailRow label="Payment terms" value={supplier.paymentTerms > 0 ? `${supplier.paymentTerms} days` : "Due on receipt"} />
              <DetailRow label="Currency" value={supplier.currency} />
              <DetailRow label="Opening balance" value={money(supplier.openingBalance)} />
              <DetailRow label="Lifetime billed" value={money(totals.billed)} />
              <DetailRow label="Outstanding" value={money(totals.owed)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Profile" description="Details printed on purchase documents." />
            <dl className="divide-y divide-line">
              <DetailRow label="Contact" value={supplier.contactName} />
              <DetailRow label="Email" value={supplier.email} />
              <DetailRow label="Phone" value={supplier.phone} />
              <DetailRow label="Address" value={supplier.address} />
              <DetailRow
                label="City"
                value={[supplier.city, supplier.country].filter(Boolean).join(", ")}
              />
              <DetailRow label="Tax ID" value={supplier.taxId} />
              <DetailRow label="Website" value={supplier.website} />
            </dl>
            {supplier.notes ? (
              <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-muted">
                {supplier.notes}
              </p>
            ) : null}
          </Card>
        </aside>
      </div>

      {formOpen ? <SupplierForm supplier={supplier} onClose={() => setFormOpen(false)} /> : null}
    </AppShell>
  );
}
