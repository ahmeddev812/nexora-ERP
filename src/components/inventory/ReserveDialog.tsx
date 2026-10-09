"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import type { StockReservation } from "@/types/erp";

interface ReserveDialogProps {
  onClose: () => void;
}

export function ReserveDialog({ onClose }: ReserveDialogProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const orders = useMemo(
    () => data.salesOrders.filter((order) => order.status === "approved"),
    [data.salesOrders],
  );
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");

  const order = orders.find((entry) => entry.id === orderId) ?? null;

  const productById = useMemo(
    () => new Map(data.products.map((product) => [product.id, product])),
    [data.products],
  );

  const activeReserved = (productId: string): number =>
    round2(
      data.stockReservations
        .filter(
          (entry) =>
            entry.refId === order?.id && entry.productId === productId && entry.status === "active",
        )
        .reduce((acc, entry) => acc + entry.quantity, 0),
    );

  const availableAt = (productId: string, warehouseId: string): number => {
    const balance = data.stockBalances.find(
      (entry) => entry.productId === productId && entry.warehouseId === warehouseId,
    );
    return balance ? round2(balance.onHand - balance.reserved) : 0;
  };

  const preview = order
    ? order.lines.map((line) => {
        const product = productById.get(line.productId);
        const already = activeReserved(line.productId);
        const need = round2(Math.max(0, line.quantity - already));
        const available = availableAt(line.productId, order.warehouseId);
        const reserve = round2(Math.min(need, available));
        return { line, product, already, need, available, reserve };
      })
    : [];

  const reservable = preview.filter((row) => row.product?.trackStock && row.reserve > 0).length;
  const short = preview.filter((row) => row.product?.trackStock && row.need > row.available).length;

  const reserve = () => {
    if (!order) return;
    let applied = 0;
    let skipped = 0;

    for (const row of preview) {
      if (!row.product?.trackStock || row.reserve <= 0) {
        if (row.product?.trackStock && row.need > 0) skipped += 1;
        continue;
      }

      actions.createRecord(
        "stockReservations",
        {
          refType: "sales_order",
          refId: order.id,
          refNumber: order.number,
          productId: row.product.id,
          warehouseId: order.warehouseId,
          quantity: row.reserve,
          status: "active",
        } as unknown as StockReservation,
        {
          summary: `Reserved ${row.reserve} of ${row.product.sku} for ${order.number}`,
        },
      );

      actions.applyStockMovement({
        productId: row.product.id,
        warehouseId: order.warehouseId,
        quantity: row.reserve,
        bucket: "reserved",
        type: "reservation",
        refType: "sales_order",
        refId: order.id,
        refNumber: order.number,
        date: todayKey(),
        unitCost: row.product.costPrice,
      });
      applied += 1;
    }

    if (applied === 0) {
      toast.warning("Nothing reserved", "Every line is already reserved or short on stock.");
      return;
    }
    toast.success(
      `Reserved ${applied} line${applied === 1 ? "" : "s"}`,
      skipped > 0 ? `${skipped} line${skipped === 1 ? "" : "s"} skipped for insufficient stock` : order.number,
    );
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Reserve stock for an order"
      description="Holds available quantities for an approved sales order until it ships."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={reservable === 0} onClick={reserve}>
            Reserve {reservable} line{reservable === 1 ? "" : "s"}
          </Button>
        </div>
      }
    >
      {orders.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No approved sales orders yet. Approve an order first, then reserve stock for it here.
        </p>
      ) : (
        <>
          <Select
            label="Sales order"
            options={orders.map((entry) => ({
              value: entry.id,
              label: `${entry.number} · ${entry.lines.length} lines`,
            }))}
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          />

          <div className="mt-4 overflow-hidden rounded-card border border-line">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2 text-right font-medium">Reserved</th>
                  <th className="px-3 py-2 text-right font-medium">Available</th>
                  <th className="px-3 py-2 text-right font-medium">To reserve</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.line.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2">
                      <span className="block text-ink">{row.product?.name ?? "Unknown product"}</span>
                      <span className="numeric block text-[11.5px] text-ink-faint">
                        {row.product?.sku ?? "-"}
                      </span>
                    </td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">{row.line.quantity}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">{row.already}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-muted">{row.available}</td>
                    <td
                      className={
                        row.reserve > 0
                          ? "numeric px-3 py-2 text-right text-ink"
                          : "numeric px-3 py-2 text-right text-ink-faint"
                      }
                    >
                      {row.reserve}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[12.5px] text-ink-muted">
            {short > 0
              ? `${short} line${short === 1 ? "" : "s"} will reserve only what is currently available.`
              : "Quantities are reserved from the order warehouse."}
          </p>
        </>
      )}
    </Modal>
  );
}
