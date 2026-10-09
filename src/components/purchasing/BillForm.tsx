"use client";

import { useMemo, useState } from "react";

import { TotalsBlock } from "@/components/sales/TotalsBlock";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { computeTotals, lineTotalOf } from "@/lib/calculations";
import { addDays, todayKey } from "@/lib/dates";
import type { DocumentLine, SupplierBill } from "@/types/erp";

type SourceKind = "receipt" | "order";

interface BillFormProps {
  onClose: () => void;
}

export function BillForm({ onClose }: BillFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const billedReceiptIds = useMemo(
    () =>
      new Set(
        data.supplierBills
          .filter((bill) => bill.receiptId && bill.status !== "void")
          .map((bill) => bill.receiptId as string),
      ),
    [data.supplierBills],
  );
  const billedOrderIds = useMemo(
    () =>
      new Set(
        data.supplierBills
          .filter((bill) => bill.orderId && bill.status !== "void")
          .map((bill) => bill.orderId as string),
      ),
    [data.supplierBills],
  );

  const receipts = useMemo(
    () =>
      data.goodsReceipts
        .filter((receipt) => !billedReceiptIds.has(receipt.id))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.goodsReceipts, billedReceiptIds],
  );
  const orders = useMemo(
    () =>
      data.purchaseOrders.filter(
        (order) =>
          !billedOrderIds.has(order.id) &&
          (order.status === "sent" ||
            order.status === "partially_received" ||
            order.status === "received"),
      ),
    [data.purchaseOrders, billedOrderIds],
  );

  const [kind, setKind] = useState<SourceKind>(receipts.length > 0 ? "receipt" : "order");
  const [sourceId, setSourceId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [dueDate, setDueDate] = useState(addDays(todayKey(), 30));
  const [error, setError] = useState("");

  const receipt = kind === "receipt" ? receipts.find((entry) => entry.id === sourceId) : undefined;
  const order = kind === "order" ? orders.find((entry) => entry.id === sourceId) : undefined;
  const selectedOrder = receipt
    ? data.purchaseOrders.find((entry) => entry.id === receipt.orderId)
    : order;

  const supplier = data.suppliers.find((entry) => entry.id === selectedOrder?.supplierId);

  const sourceOptions =
    kind === "receipt"
      ? receipts.map((entry) => ({
          value: entry.id,
          label: `${entry.number} · ${entry.lines.length} lines · ${entry.date}`,
        }))
      : orders.map((entry) => ({
          value: entry.id,
          label: `${entry.number} · ${entry.total.toFixed(2)} · ${entry.status}`,
        }));

  const lines: DocumentLine[] = useMemo(() => {
    if (kind === "receipt" && receipt) {
      return receipt.lines.map((line) => {
        const source = selectedOrder?.lines.find((entry) => entry.productId === line.productId);
        const draft: DocumentLine = {
          id: `bl_${line.id}`,
          productId: line.productId,
          description: source?.description ?? "",
          quantity: line.receivedQuantity,
          unitPrice: source?.unitPrice ?? line.unitCost,
          discountPercent: source?.discountPercent ?? 0,
          taxRate: source?.taxRate ?? 0,
          lineTotal: 0,
        };
        draft.lineTotal = lineTotalOf(draft);
        return draft;
      });
    }
    if (kind === "order" && order) {
      return order.lines.map((line) => ({ ...line, id: `bl_${line.id}` }));
    }
    return [];
  }, [kind, receipt, order, selectedOrder]);

  const totals = useMemo(() => computeTotals(lines), [lines]);

  const pickSource = (nextId: string) => {
    setSourceId(nextId);
    setError("");
    const sourceOrderId =
      kind === "receipt"
        ? receipts.find((entry) => entry.id === nextId)?.orderId
        : orders.find((entry) => entry.id === nextId)?.id;
    const sourceOrder = data.purchaseOrders.find((entry) => entry.id === sourceOrderId);
    const terms = data.suppliers.find((entry) => entry.id === sourceOrder?.supplierId)
      ?.paymentTerms;
    if (terms !== undefined) setDueDate(addDays(date, terms));
  };

  const save = () => {
    if (!selectedOrder) {
      setError("Pick a receipt or order to bill first.");
      return;
    }
    if (lines.length === 0) {
      setError("This source has no billable lines.");
      return;
    }
    if (dueDate < date) {
      setError("Due date cannot be before the bill date.");
      return;
    }

    const number = actions.nextNumber("BIL");
    actions.createRecord(
      "supplierBills",
      {
        number,
        date,
        dueDate,
        supplierId: selectedOrder.supplierId,
        orderId: selectedOrder.id,
        receiptId: receipt?.id ?? null,
        status: "issued",
        lines,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paidAmount: 0,
        currency: data.business?.currency ?? "USD",
        notes: undefined,
      } as unknown as SupplierBill,
      { summary: `Issued supplier bill ${number} from ${selectedOrder.number}`, number },
    );

    const entryLines = [] as { accountId: string; debit: number; credit: number }[];
    const inventory = data.accounts.find((account) => account.code === "1200");
    const payable = data.accounts.find((account) => account.code === "2000");
    const taxReceivable = data.accounts.find((account) => account.code === "1150");

    // Receipts already valued inventory against payables, bills raised straight
    // from an order still owe the goods value as well as the tax.
    const receipted = data.goodsReceipts.some((entry) => entry.orderId === selectedOrder.id);
    if (!receipted && inventory && payable && totals.subtotal > 0) {
      entryLines.push({ accountId: inventory.id, debit: totals.subtotal, credit: 0 });
      entryLines.push({ accountId: payable.id, debit: 0, credit: totals.subtotal });
    }
    if (taxReceivable && payable && totals.taxTotal > 0) {
      entryLines.push({ accountId: taxReceivable.id, debit: totals.taxTotal, credit: 0 });
      entryLines.push({ accountId: payable.id, debit: 0, credit: totals.taxTotal });
    }

    if (entryLines.length >= 2) {
      actions.postJournal({
        date,
        memo: `Supplier bill ${number} from ${supplier?.name ?? "supplier"}`,
        refType: "supplier_bill",
        refId: null,
        refNumber: number,
        lines: entryLines,
      });
    } else {
      toast.warning(
        "No payables entry posted",
        "The chart of accounts is missing account 1150, 1200 or 2000.",
      );
    }

    toast.success("Bill issued", `${number} for ${formatTotal()}`);
    onClose();
  };

  const formatTotal = (): string =>
    `${totals.total.toFixed(2)} ${data.business?.currency ?? "USD"}`;

  const sourceLabel = selectedOrder
    ? `${selectedOrder.number} · ${lines.length} line${lines.length === 1 ? "" : "s"}`
    : "none";

  return (
    <Modal
      open
      onClose={onClose}
      title="New supplier bill"
      description="Bill against a posted receipt or an open order. Payments land on the bills list."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Issue bill
          </Button>
        </div>
      }
    >
      {receipts.length === 0 && orders.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nothing to bill yet. Send a purchase order or post a goods receipt first.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Bill from"
              options={[
                { value: "receipt", label: "Goods receipt", disabled: receipts.length === 0 },
                { value: "order", label: "Purchase order", disabled: orders.length === 0 },
              ]}
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as SourceKind);
                setSourceId("");
                setError("");
              }}
            />
            <Select
              label="Source document"
              required
              options={[{ value: "", label: "Select a document" }, ...sourceOptions]}
              value={sourceId}
              onChange={(event) => pickSource(event.target.value)}
            />
            <Input
              label="Bill date"
              type="date"
              mono
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Input
              label="Due date"
              type="date"
              mono
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <div className="mt-4 rounded-card border border-line bg-surface p-4">
            <p className="text-[13.5px] text-ink">
              {supplier ? `${supplier.code} · ${supplier.name}` : "Pick a source document"}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Source: {sourceLabel}
              {supplier ? ` · Terms ${supplier.paymentTerms} days` : ""}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Unit price</th>
                  <th className="px-3 py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 text-ink">{line.description || line.productId}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">{line.quantity}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">
                      {line.unitPrice.toFixed(2)}
                    </td>
                    <td className="numeric px-3 py-2 text-right text-ink">
                      {lineTotalOf(line).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error ? <p className="mt-3 text-[12.5px] text-destructive">{error}</p> : null}

          <div className="mt-4 flex justify-end">
            <TotalsBlock totals={totals} currency={data.business?.currency ?? "USD"} />
          </div>
        </>
      )}
    </Modal>
  );
}
