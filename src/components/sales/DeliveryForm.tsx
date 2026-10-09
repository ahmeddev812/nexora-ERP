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
import type { Delivery, DocumentLine, SalesOrder } from "@/types/erp";

interface DeliveryFormProps {
  /** Preselects an order, otherwise one is chosen in the form. */
  order: SalesOrder | null;
  onClose: () => void;
}

export function DeliveryForm({ order, onClose }: DeliveryFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const candidates = useMemo(
    () => data.salesOrders.filter((entry) => entry.status === "approved"),
    [data.salesOrders],
  );
  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const [orderId, setOrderId] = useState(order?.id ?? candidates[0]?.id ?? "");
  const [date, setDate] = useState(todayKey());
  const [driverNote, setDriverNote] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const selected = order ?? candidates.find((entry) => entry.id === orderId) ?? null;

  const deliveredSoFar = (line: DocumentLine): number => {
    if (!selected) return 0;
    return round2(
      data.deliveries
        .filter((entry) => entry.orderId === selected.id && entry.status !== "cancelled")
        .reduce(
          (acc, delivery) =>
            acc +
            delivery.lines
              .filter((entry) => entry.productId === line.productId)
              .reduce((sum, entry) => sum + entry.quantity, 0),
          0,
        ),
    );
  };

  const remainingOf = (line: DocumentLine): number =>
    round2(line.quantity - deliveredSoFar(line));

  const quantityFor = (line: DocumentLine): string =>
    quantities[line.id] ?? String(Math.max(0, remainingOf(line)));

  const save = () => {
    if (!selected) {
      setError("Pick an approved sales order first.");
      return;
    }

    const lines: DocumentLine[] = [];
    for (const line of selected.lines) {
      const raw = quantityFor(line);
      const quantity = Number(raw);
      const remaining = remainingOf(line);
      if (!Number.isFinite(quantity) || quantity < 0) {
        setError("Every quantity must be zero or more.");
        return;
      }
      if (quantity > remaining) {
        const product = productById.get(line.productId);
        setError(`${product?.sku ?? "A line"} only has ${remaining} left to deliver.`);
        return;
      }
      if (quantity > 0) {
        lines.push({ ...line, id: `dl_${Math.random().toString(36).slice(2, 10)}`, quantity });
      }
    }

    if (lines.length === 0) {
      setError("Set a quantity above zero on at least one line.");
      return;
    }

    const number = actions.nextNumber("DLV");
    actions.createRecord(
      "deliveries",
      {
        number,
        date,
        orderId: selected.id,
        customerId: selected.customerId,
        warehouseId: selected.warehouseId,
        status: "draft",
        lines,
        driverNote: driverNote.trim() || undefined,
        createdBy: user?.id ?? "system",
      } as unknown as Delivery,
      { summary: `Created delivery ${number} for ${selected.number}`, number },
    );
    toast.success("Delivery created", `${number} for ${selected.number}`);
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
        Quantities default to what is still undelivered. Set a line to zero to skip it.
      </p>
    </div>
  ) : null;

  return (
    <Modal
      open
      onClose={onClose}
      title="New delivery"
      description="Pick an approved order and ship part or all of it. Stock moves on delivery."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!selected}>
            Create delivery
          </Button>
        </div>
      }
    >
      {candidates.length === 0 && !order ? (
        <p className="text-sm text-ink-muted">
          No approved sales orders are waiting for delivery. Approve an order first.
        </p>
      ) : (
        <>
          {!order ? (
            <Select
              label="Sales order"
              options={candidates.map((entry) => ({
                value: entry.id,
                label: `${entry.number} · ${entry.lines.length} lines`,
              }))}
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value);
                setQuantities({});
                setError("");
              }}
            />
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Delivery date"
              type="date"
              mono
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Input
              label="Driver note"
              placeholder="Vehicle, contact, reference"
              value={driverNote}
              onChange={(event) => setDriverNote(event.target.value)}
            />
          </div>

          {header}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2 text-right font-medium">Delivered</th>
                  <th className="px-3 py-2 text-right font-medium">This delivery</th>
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
                        {deliveredSoFar(line)}
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
