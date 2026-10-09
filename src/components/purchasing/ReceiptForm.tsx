"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import { formatMoney } from "@/lib/id";
import type { DocumentLine, GoodsReceipt, GoodsReceiptLine, PurchaseOrder } from "@/types/erp";

interface ReceiptFormProps {
  /** Preselects an order, otherwise one is chosen in the form. */
  order: PurchaseOrder | null;
  onClose: () => void;
}

export function ReceiptForm({ order, onClose }: ReceiptFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const candidates = useMemo(() => {
    const covered = (purchase: PurchaseOrder, line: DocumentLine): number =>
      round2(
        data.goodsReceipts
          .filter((entry) => entry.orderId === purchase.id)
          .reduce(
            (acc, receipt) =>
              acc +
              receipt.lines
                .filter((entry) => entry.productId === line.productId)
                .reduce((sum, entry) => sum + entry.receivedQuantity, 0),
            0,
          ),
      );
    return data.purchaseOrders.filter(
      (purchase) =>
        (purchase.status === "sent" || purchase.status === "partially_received") &&
        purchase.lines.some((line) => line.quantity > covered(purchase, line)),
    );
  }, [data.purchaseOrders, data.goodsReceipts]);

  const [orderId, setOrderId] = useState(order?.id ?? candidates[0]?.id ?? "");
  const [date, setDate] = useState(todayKey());
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const selected = order ?? candidates.find((entry) => entry.id === orderId) ?? null;

  const receivedSoFar = (line: DocumentLine): number => {
    if (!selected) return 0;
    return round2(
      data.goodsReceipts
        .filter((entry) => entry.orderId === selected.id)
        .reduce(
          (acc, receipt) =>
            acc +
            receipt.lines
              .filter((entry) => entry.productId === line.productId)
              .reduce((sum, entry) => sum + entry.receivedQuantity, 0),
          0,
        ),
    );
  };

  const remainingOf = (line: DocumentLine): number => round2(line.quantity - receivedSoFar(line));

  const quantityFor = (line: DocumentLine): string =>
    quantities[line.id] ?? String(Math.max(0, remainingOf(line)));

  const costFor = (line: DocumentLine): string => costs[line.id] ?? String(line.unitPrice);

  const save = () => {
    if (!selected) {
      setError("Pick a sent purchase order first.");
      return;
    }

    const lines: GoodsReceiptLine[] = [];
    for (const line of selected.lines) {
      const quantity = Number(quantityFor(line));
      const unitCost = Number(costFor(line));
      const remaining = remainingOf(line);
      if (!Number.isFinite(quantity) || quantity < 0) {
        setError("Every quantity must be zero or more.");
        return;
      }
      if (quantity > remaining) {
        const product = productById.get(line.productId);
        setError(`${product?.sku ?? "A line"} only has ${remaining} left to receive.`);
        return;
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setError("Unit cost must be zero or more.");
        return;
      }
      if (quantity > 0) {
        lines.push({
          id: `grl_${Math.random().toString(36).slice(2, 10)}`,
          productId: line.productId,
          orderedQuantity: line.quantity,
          receivedQuantity: quantity,
          unitCost: round2(unitCost),
        });
      }
    }

    if (lines.length === 0) {
      setError("Set a quantity above zero on at least one line.");
      return;
    }

    const coveredAfter = (line: DocumentLine): number =>
      round2(receivedSoFar(line) + lines.filter((entry) => entry.productId === line.productId).reduce((sum, entry) => sum + entry.receivedQuantity, 0));
    const fullyCovered = selected.lines.every((line) => coveredAfter(line) >= line.quantity);

    const number = actions.nextNumber("GRN");
    const receipt = actions.createRecord(
      "goodsReceipts",
      {
        number,
        date,
        orderId: selected.id,
        supplierId: selected.supplierId,
        warehouseId: selected.warehouseId,
        status: fullyCovered ? "posted" : "partial",
        lines,
        notes: notes.trim() || undefined,
        postedAt: new Date().toISOString(),
        createdBy: user?.id ?? "system",
      } as unknown as GoodsReceipt,
      { summary: `Posted goods receipt ${number} for ${selected.number}`, number },
    );

    for (const line of lines) {
      const product = productById.get(line.productId);
      if (!product?.trackStock) continue;
      actions.applyStockMovement({
        productId: line.productId,
        warehouseId: selected.warehouseId,
        quantity: line.receivedQuantity,
        type: "receipt",
        refType: "goods_receipt",
        refId: receipt.id,
        refNumber: number,
        date,
        unitCost: line.unitCost,
        notes: selected.number,
      });
    }

    const discountByProduct = new Map(
      selected.lines.map((line) => [line.productId, line.discountPercent]),
    );
    const receivedValue = round2(
      lines.reduce((sum, line) => {
        const discount = discountByProduct.get(line.productId) ?? 0;
        return sum + line.receivedQuantity * line.unitCost * (1 - discount / 100);
      }, 0),
    );
    if (receivedValue > 0) {
      const inventory = data.accounts.find((account) => account.code === "1200");
      const payable = data.accounts.find((account) => account.code === "2000");
      if (inventory && payable) {
        actions.postJournal({
          date,
          memo: `Goods receipt ${number} from ${selected.number}`,
          refType: "goods_receipt",
          refId: receipt.id,
          refNumber: number,
          lines: [
            { accountId: inventory.id, debit: receivedValue, credit: 0 },
            { accountId: payable.id, debit: 0, credit: receivedValue },
          ],
        });
      } else {
        toast.warning(
          "No inventory entry posted",
          "The chart of accounts is missing account 1200 or 2000.",
        );
      }
    }

    actions.updateRecord(
      "purchaseOrders",
      selected.id,
      { status: fullyCovered ? "received" : "partially_received" },
      { summary: `Receipt ${number} posted against ${selected.number}` },
    );

    toast.success(
      "Goods received",
      `${number} · ${formatMoney(receivedValue, "", 2)} of stock value`,
    );
    onClose();
  };

  const header = selected ? (
    <div className="mb-4 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-medium text-ink">
          {selected.number} · {selected.lines.length} ordered line
          {selected.lines.length === 1 ? "" : "s"}
        </p>
        <p className="numeric text-[13px] text-ink-muted">
          {formatMoney(selected.total, selected.currency, 2)} total
        </p>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-muted">
        Quantities default to what is still outstanding. Posting increases stock and values
        inventory.
      </p>
    </div>
  ) : null;

  return (
    <Modal
      open
      onClose={onClose}
      title="New goods receipt"
      description="Receive part or all of a sent purchase order. Partial receipts stay open on the order."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!selected}>
            Post receipt
          </Button>
        </div>
      }
    >
      {candidates.length === 0 && !order ? (
        <p className="text-sm text-ink-muted">
          No purchase orders are waiting for receipt. Send a purchase order first.
        </p>
      ) : (
        <>
          {!order ? (
            <Select
              label="Purchase order"
              options={candidates.map((entry) => ({
                value: entry.id,
                label: `${entry.number} · ${entry.lines.length} lines`,
              }))}
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value);
                setQuantities({});
                setCosts({});
                setError("");
              }}
            />
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Receipt date"
              type="date"
              mono
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Input
              label="Packing note"
              placeholder="Container, seal, driver reference"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {header}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2 text-right font-medium">Received</th>
                  <th className="px-3 py-2 text-right font-medium">This receipt</th>
                  <th className="px-3 py-2 text-right font-medium">Unit cost</th>
                </tr>
              </thead>
              <tbody>
                {selected?.lines.map((line) => {
                  const product = productById.get(line.productId);
                  const remaining = Math.max(0, remainingOf(line));
                  return (
                    <tr key={line.id} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-2">
                        <span className="block text-ink">{product?.name ?? line.description}</span>
                        <span className="numeric block text-[11.5px] text-ink-faint">
                          {product?.sku ?? "-"}
                        </span>
                      </td>
                      <td className="numeric px-3 py-2 text-right text-ink-muted">{line.quantity}</td>
                      <td className="numeric px-3 py-2 text-right text-ink-muted">
                        {receivedSoFar(line)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="ml-auto w-24">
                          <Input
                            aria-label={`Quantity for ${product?.sku ?? line.productId}`}
                            type="number"
                            mono
                            value={quantityFor(line)}
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            inputClassName={remaining === 0 ? "text-ink-faint" : undefined}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="ml-auto w-24">
                          <Input
                            aria-label={`Unit cost for ${product?.sku ?? line.productId}`}
                            type="number"
                            mono
                            value={costFor(line)}
                            onChange={(event) =>
                              setCosts((current) => ({ ...current, [line.id]: event.target.value }))
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error ? <p className="mt-3 text-[12.5px] text-destructive">{error}</p> : null}
        </>
      )}
    </Modal>
  );
}
