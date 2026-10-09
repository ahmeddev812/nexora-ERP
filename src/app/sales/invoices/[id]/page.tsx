"use client";

import { useMemo } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { useERPData } from "@/hooks/useERPData";
import { effectiveInvoiceStatus, invoiceBalance } from "@/lib/calculations";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { InvoiceStatus } from "@/types/erp";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  partial: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  refunded: "Refunded",
};

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: "neutral",
  issued: "info",
  partial: "warning",
  paid: "success",
  overdue: "destructive",
  void: "neutral",
  refunded: "accent",
};

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const data = useERPData();

  const invoice = data.salesInvoices.find((entry) => entry.id === params.id);
  const status = invoice ? effectiveInvoiceStatus(invoice) : "draft";
  const balance = invoice ? invoiceBalance(invoice) : 0;

  const business = data.business;
  const customer = invoice
    ? data.customers.find((entry) => entry.id === invoice.customerId)
    : undefined;
  const order = invoice?.orderId
    ? data.salesOrders.find((entry) => entry.id === invoice.orderId)
    : undefined;
  const delivery = invoice?.deliveryId
    ? data.deliveries.find((entry) => entry.id === invoice.deliveryId)
    : undefined;

  const totals = useMemo(
    () =>
      invoice
        ? {
            subtotal: invoice.subtotal,
            discount: invoice.discountTotal,
            tax: invoice.taxTotal,
            total: invoice.total,
            paid: invoice.paidAmount,
            balance,
          }
        : null,
    [invoice, balance],
  );

  if (!invoice || !totals) notFound();

  const line = "border-b border-line py-2";

  return (
    <main className="min-h-screen bg-page px-4 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ArrowLeft size={14} strokeWidth={1.5} />}
            onClick={() => router.push("/sales/invoices")}
          >
            Back to invoices
          </Button>
          <Button
            size="sm"
            iconLeft={<Printer size={14} strokeWidth={1.5} />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>

        <article className="rounded-card border border-line bg-card p-8 print:rounded-none print:border-0 print:p-0">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">
                {business?.name ?? "NEXORA"}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-muted">
                {[business?.address, business?.city, business?.country].filter(Boolean).join(", ") ||
                  "Address not set"}
              </p>
              <p className="numeric text-[12.5px] text-ink-muted">
                {business?.taxId ? `Tax ID ${business.taxId}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11.5px] uppercase tracking-[0.14em] text-ink-faint">Invoice</p>
              <p className="numeric text-xl font-medium text-ink">{invoice.number}</p>
              <div className="mt-2 flex justify-end">
                <Badge tone={STATUS_TONE[status]} dot>
                  {STATUS_LABEL[status]}
                </Badge>
              </div>
            </div>
          </header>

          <section className="grid gap-6 border-b border-line py-5 sm:grid-cols-2">
            <div>
              <p className="text-[11.5px] uppercase tracking-[0.14em] text-ink-faint">Billed to</p>
              <p className="mt-1.5 text-[14px] font-medium text-ink">
                {customer?.name ?? "Unknown customer"}
              </p>
              <p className="text-[12.5px] text-ink-muted">{customer?.contactName ?? ""}</p>
              <p className="text-[12.5px] text-ink-muted">
                {[customer?.address, customer?.city, customer?.country].filter(Boolean).join(", ")}
              </p>
              <p className="text-[12.5px] text-ink-muted">{customer?.email ?? ""}</p>
              {customer?.taxId ? (
                <p className="numeric text-[12.5px] text-ink-muted">Tax ID {customer.taxId}</p>
              ) : null}
            </div>
            <dl className="space-y-1.5 text-[13px] sm:text-right">
              <div className="flex justify-between gap-4 sm:justify-end">
                <dt className="text-ink-faint">Issued</dt>
                <dd className="numeric text-ink">{formatDate(invoice.date, "us")}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:justify-end">
                <dt className="text-ink-faint">Due</dt>
                <dd className="numeric text-ink">{formatDate(invoice.dueDate, "us")}</dd>
              </div>
              {order ? (
                <div className="flex justify-between gap-4 sm:justify-end">
                  <dt className="text-ink-faint">Order</dt>
                  <dd className="numeric text-ink">{order.number}</dd>
                </div>
              ) : null}
              {delivery ? (
                <div className="flex justify-between gap-4 sm:justify-end">
                  <dt className="text-ink-faint">Delivery</dt>
                  <dd className="numeric text-ink">{delivery.number}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 sm:justify-end">
                <dt className="text-ink-faint">Terms</dt>
                <dd className="numeric text-ink">{customer?.paymentTerms ?? 0} days</dd>
              </div>
            </dl>
          </section>

          <section className="py-5">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 text-right font-medium">Qty</th>
                  <th className="py-2 pr-3 text-right font-medium">Price</th>
                  <th className="py-2 pr-3 text-right font-medium">Disc</th>
                  <th className="py-2 pr-3 text-right font-medium">Tax</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((row) => (
                  <tr key={row.id} className={line}>
                    <td className="pr-3 text-ink">{row.description}</td>
                    <td className="numeric pr-3 text-right text-ink-muted">{row.quantity}</td>
                    <td className="numeric pr-3 text-right text-ink-muted">
                      {formatMoney(row.unitPrice, "", 2)}
                    </td>
                    <td className="numeric pr-3 text-right text-ink-muted">
                      {row.discountPercent ?? 0}%
                    </td>
                    <td className="numeric pr-3 text-right text-ink-muted">{row.taxRate ?? 0}%</td>
                    <td className="numeric text-right text-ink">
                      {formatMoney(row.lineTotal, invoice.currency, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <dl className="w-full max-w-xs space-y-1.5 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Subtotal</dt>
                  <dd className="numeric text-ink">
                    {formatMoney(totals.subtotal, invoice.currency, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Discount</dt>
                  <dd className="numeric text-ink">
                    {formatMoney(-totals.discount, invoice.currency, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Tax</dt>
                  <dd className="numeric text-ink">{formatMoney(totals.tax, invoice.currency, 2)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line pt-2">
                  <dt className="font-medium text-ink">Total</dt>
                  <dd className="numeric font-medium text-ink">
                    {formatMoney(totals.total, invoice.currency, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Paid</dt>
                  <dd className="numeric text-ink">
                    {formatMoney(totals.paid, invoice.currency, 2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-ink">Balance due</dt>
                  <dd className="numeric font-medium text-ink">
                    {formatMoney(totals.balance, invoice.currency, 2)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {invoice.notes ? (
            <section className="border-t border-line pt-4 text-[12.5px] text-ink-muted">
              <p className="text-[11.5px] uppercase tracking-[0.14em] text-ink-faint">Notes</p>
              <p className="mt-1">{invoice.notes}</p>
            </section>
          ) : null}

          <footer className="mt-6 border-t border-line pt-4 text-[12px] text-ink-faint">
            Thank you for your business. Payment is due by{" "}
            {formatDate(invoice.dueDate, "us")}.
          </footer>
        </article>
      </div>
    </main>
  );
}
