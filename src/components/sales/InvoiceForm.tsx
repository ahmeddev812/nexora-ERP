"use client";

import { useMemo, useState } from "react";

import { TotalsBlock } from "@/components/sales/TotalsBlock";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { computeTotals, invoiceBalance, isActiveSale } from "@/lib/calculations";
import { addDays, todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { DocumentLine, SalesInvoice } from "@/types/erp";

type SourceKind = "order" | "delivery";

interface InvoiceFormProps {
  onClose: () => void;
}

export function InvoiceForm({ onClose }: InvoiceFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const openOrders = useMemo(
    () =>
      data.salesOrders.filter((order) => {
        if (order.status !== "approved" && order.status !== "fulfilled") return false;
        const invoiced = data.salesInvoices
          .filter((invoice) => invoice.orderId === order.id && isActiveSale(invoice))
          .reduce((acc, invoice) => acc + invoice.total, 0);
        return invoiceBalance({ total: order.total, paidAmount: invoiced }) > 0;
      }),
    [data.salesOrders, data.salesInvoices],
  );

  const openDeliveries = useMemo(
    () =>
      data.deliveries.filter(
        (delivery) =>
          delivery.status === "delivered" &&
          !data.salesInvoices.some((invoice) => invoice.deliveryId === delivery.id),
      ),
    [data.deliveries, data.salesInvoices],
  );

  const [kind, setKind] = useState<SourceKind>(openOrders.length > 0 ? "order" : "delivery");
  const [sourceId, setSourceId] = useState(
    openOrders[0]?.id ?? openDeliveries[0]?.id ?? "",
  );
  const [date, setDate] = useState(todayKey());
  const [dueDate, setDueDate] = useState(addDays(todayKey(), 30));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const source = useMemo(() => {
    if (kind === "order") {
      const order = openOrders.find((entry) => entry.id === sourceId);
      if (!order) return null;
      return {
        lines: order.lines,
        customerId: order.customerId,
        orderId: order.id,
        deliveryId: null as string | null,
        label: order.number,
      };
    }
    const delivery = openDeliveries.find((entry) => entry.id === sourceId);
    if (!delivery) return null;
    return {
      lines: delivery.lines,
      customerId: delivery.customerId,
      orderId: delivery.orderId,
      deliveryId: delivery.id,
      label: delivery.number,
    };
  }, [kind, sourceId, openOrders, openDeliveries]);

  const customer = source
    ? data.customers.find((entry) => entry.id === source.customerId)
    : undefined;

  const totals = useMemo(() => computeTotals(source?.lines ?? []), [source]);

  const pickKind = (next: SourceKind) => {
    setKind(next);
    const first = next === "order" ? openOrders[0]?.id : openDeliveries[0]?.id;
    setSourceId(first ?? "");
    setError("");
  };

  const pickSource = (id: string) => {
    setSourceId(id);
    setError("");
    const orderId = kind === "order" ? id : openDeliveries.find((entry) => entry.id === id)?.orderId;
    const order = orderId ? data.salesOrders.find((entry) => entry.id === orderId) : undefined;
    const terms = data.customers.find(
      (entry) => entry.id === (order?.customerId ?? customer?.id),
    )?.paymentTerms;
    if (terms !== undefined) setDueDate(addDays(date, terms));
  };

  const save = () => {
    if (!source) {
      setError("Pick an order or delivery to invoice.");
      return;
    }
    const lines: DocumentLine[] = source.lines;
    if (lines.length === 0) {
      setError("Nothing to invoice.");
      return;
    }
    if (dueDate < date) {
      setError("Due date cannot be before the invoice date.");
      return;
    }

    const number = actions.nextNumber("INV");
    const invoice = actions.createRecord(
      "salesInvoices",
      {
        number,
        date,
        dueDate,
        customerId: source.customerId,
        branchId: null,
        orderId: source.orderId,
        deliveryId: source.deliveryId,
        status: "issued",
        lines,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paidAmount: 0,
        currency: data.business?.currency ?? "USD",
        notes: notes.trim() || undefined,
      } as unknown as SalesInvoice,
      { summary: `Issued invoice ${number} from ${source.label}`, number },
    );

    if (totals.total > 0) {
      const receivable = data.accounts.find((account) => account.code === "1100");
      const revenue = data.accounts.find((account) => account.code === "4000");
      const tax = data.accounts.find((account) => account.code === "2100");
      if (receivable && revenue && tax) {
        actions.postJournal({
          date,
          memo: `Invoice ${number} for ${customer?.name ?? "customer"}`,
          refType: "sales_invoice",
          refId: invoice.id,
          refNumber: number,
          lines: [
            { accountId: receivable.id, debit: totals.total, credit: 0 },
            { accountId: revenue.id, debit: 0, credit: totals.subtotal },
            { accountId: tax.id, debit: 0, credit: totals.taxTotal },
          ],
        });
      } else {
        toast.warning(
          "No revenue entry posted",
          "The chart of accounts is missing account 1100, 4000 or 2100.",
        );
      }
    }

    toast.success("Invoice issued", number);
    onClose();
  };

  const options =
    kind === "order"
      ? openOrders.map((entry) => ({
          value: entry.id,
          label: `${entry.number} · ${formatMoney(entry.total, entry.currency, 2)}`,
        }))
      : openDeliveries.map((entry) => ({
          value: entry.id,
          label: `${entry.number} · ${entry.lines.length} lines`,
        }));

  const empty = openOrders.length === 0 && openDeliveries.length === 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="New invoice"
      description="Capture the prices on the source document, then collect in part or in full."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!source}>
            Issue invoice
          </Button>
        </div>
      }
    >
      {empty ? (
        <p className="text-sm text-ink-muted">
          Nothing to invoice yet. Approve an order or complete a delivery first.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Invoice from"
              options={[
                { value: "order", label: "Sales order" },
                { value: "delivery", label: "Delivery" },
              ]}
              value={kind}
              onChange={(event) => pickKind(event.target.value as SourceKind)}
            />
            <Select
              label="Document"
              options={options}
              value={sourceId}
              onChange={(event) => pickSource(event.target.value)}
            />
            <Input
              label="Invoice date"
              type="date"
              mono
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setDueDate(addDays(event.target.value, customer?.paymentTerms ?? 30));
              }}
            />
            <Input
              label="Due date"
              type="date"
              mono
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Notes"
                rows={2}
                placeholder="Reference number, PO number."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-card border border-line">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {(source?.lines ?? []).map((line) => (
                  <tr key={line.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 text-ink">{line.description}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">{line.quantity}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">
                      {formatMoney(line.unitPrice, "", 2)}
                    </td>
                    <td className="numeric px-3 py-2 text-right text-ink">
                      {formatMoney(line.lineTotal, "", 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-[12.5px] text-ink-muted">
              {customer ? `${customer.name} · net ${customer.paymentTerms} days` : "No customer"}
            </p>
            <TotalsBlock totals={totals} currency={data.business?.currency ?? "USD"} />
          </div>

          {error ? <p className="mt-3 text-[12.5px] text-destructive">{error}</p> : null}
        </>
      )}
    </Modal>
  );
}
