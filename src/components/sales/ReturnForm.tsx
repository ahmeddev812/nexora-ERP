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
import { computeTotals, invoiceBalance, isActiveSale, lineTotalOf } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { CustomerReturn, DocumentLine } from "@/types/erp";

interface ReturnFormProps {
  onClose: () => void;
}

export function ReturnForm({ onClose }: ReturnFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const invoices = useMemo(
    () => data.salesInvoices.filter((invoice) => isActiveSale(invoice)),
    [data.salesInvoices],
  );
  const defaultWarehouse = useMemo(
    () => data.warehouses.find((warehouse) => warehouse.isDefault) ?? data.warehouses[0],
    [data.warehouses],
  );

  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? "");
  const [date, setDate] = useState(todayKey());
  const [warehouseId, setWarehouseId] = useState(defaultWarehouse?.id ?? "");
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<CustomerReturn["refundMethod"]>("credit_note");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const invoice = invoices.find((entry) => entry.id === invoiceId);
  const customer = invoice
    ? data.customers.find((entry) => entry.id === invoice.customerId)
    : undefined;

  const returnLines = useMemo(() => {
    if (!invoice) return [] as DocumentLine[];
    const out: DocumentLine[] = [];
    for (const line of invoice.lines) {
      const quantity = Number(quantities[line.id] ?? "0");
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const copy: DocumentLine = {
        ...line,
        id: `rt_${line.id}`,
        quantity: Math.min(quantity, line.quantity),
      };
      copy.lineTotal = lineTotalOf(copy);
      out.push(copy);
    }
    return out;
  }, [invoice, quantities]);

  const totals = useMemo(() => computeTotals(returnLines), [returnLines]);

  const save = () => {
    if (!invoice) {
      setError("Pick an invoice to return against.");
      return;
    }
    if (returnLines.length === 0) {
      setError("Set a return quantity on at least one line.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }

    const number = actions.nextNumber("CRT");
    actions.createRecord(
      "customerReturns",
      {
        number,
        date,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        warehouseId,
        status: "pending",
        lines: returnLines,
        reason: reason.trim(),
        refundMethod,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
      } as unknown as CustomerReturn,
      { summary: `Requested return ${number} against ${invoice.number}`, number },
    );
    toast.success("Return submitted", `${number} is awaiting approval`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New customer return"
      description="Quantities come from the invoice. Stock re-enters the warehouse on approval."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!invoice}>
            Submit return
          </Button>
        </div>
      }
    >
      {invoices.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No invoices available to return against. Issue an invoice first.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Invoice"
              options={invoices.map((entry) => ({
                value: entry.id,
                label: `${entry.number} · ${
                  data.customers.find((item) => item.id === entry.customerId)?.name ?? "Customer"
                } · ${formatMoney(entry.total, entry.currency, 2)}`,
              }))}
              value={invoiceId}
              onChange={(event) => {
                setInvoiceId(event.target.value);
                setQuantities({});
                setError("");
              }}
            />
            <Select
              label="Return to warehouse"
              options={data.warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              }))}
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
            />
            <Input
              label="Return date"
              type="date"
              mono
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Select
              label="Refund method"
              options={[
                { value: "credit_note", label: "Credit note" },
                { value: "cash_refund", label: "Cash refund" },
              ]}
              value={refundMethod}
              onChange={(event) =>
                setRefundMethod(event.target.value as CustomerReturn["refundMethod"])
              }
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Reason"
                required
                rows={2}
                placeholder="Why is the customer returning this?"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError("");
                }}
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Invoiced</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Return qty</th>
                </tr>
              </thead>
              <tbody>
                {invoice?.lines.map((line) => (
                  <tr key={line.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 text-ink">{line.description}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">{line.quantity}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">
                      {formatMoney(line.unitPrice, "", 2)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="ml-auto w-24">
                        <Input
                          aria-label={`Return quantity for ${line.description}`}
                          type="number"
                          mono
                          min={0}
                          max={line.quantity}
                          value={quantities[line.id] ?? "0"}
                          onChange={(event) => {
                            setQuantities((current) => ({
                              ...current,
                              [line.id]: event.target.value,
                            }));
                            setError("");
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-[12.5px] text-ink-muted">
              {invoice
                ? `${customer?.name ?? "Customer"} · ${formatMoney(invoiceBalance(invoice), invoice.currency, 2)} still outstanding on ${invoice.number}`
                : "Pick an invoice"}
            </p>
            <TotalsBlock totals={totals} currency={data.business?.currency ?? "USD"} />
          </div>

          {error ? <p className="mt-3 text-[12.5px] text-destructive">{error}</p> : null}
        </>
      )}
    </Modal>
  );
}
