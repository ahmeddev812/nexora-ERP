"use client";

import { useMemo, useState } from "react";

import {
  draftsToLines,
  linesToDrafts,
  makeSaleLine,
  SalesLinesEditor,
  type SaleLineDraft,
} from "@/components/sales/SalesLinesEditor";
import { TotalsBlock } from "@/components/sales/TotalsBlock";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { computeTotals } from "@/lib/calculations";
import { addDays, todayKey } from "@/lib/dates";
import type { PurchaseOrder, PurchaseRequest } from "@/types/erp";

interface FormState {
  date: string;
  expectedDate: string;
  supplierId: string;
  warehouseId: string;
  notes: string;
}

interface PurchaseOrderFormProps {
  /** null opens a blank record. */
  order: PurchaseOrder | null;
  /** Preloads lines from an approved purchase request. */
  request: PurchaseRequest | null;
  onClose: () => void;
}

export function PurchaseOrderForm({ order, request, onClose }: PurchaseOrderFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const activeSuppliers = useMemo(
    () => data.suppliers.filter((supplier) => supplier.status === "active"),
    [data.suppliers],
  );
  const defaultWarehouse = useMemo(
    () => data.warehouses.find((warehouse) => warehouse.isDefault) ?? data.warehouses[0],
    [data.warehouses],
  );
  const buyable = useMemo(
    () => data.products.filter((product) => product.status !== "archived"),
    [data.products],
  );

  const [state, setState] = useState<FormState>({
    date: order?.date ?? todayKey(),
    expectedDate: order?.expectedDate ?? addDays(todayKey(), 7),
    supplierId: order?.supplierId ?? activeSuppliers[0]?.id ?? "",
    warehouseId: order?.warehouseId ?? request?.warehouseId ?? defaultWarehouse?.id ?? "",
    notes: order?.notes ?? "",
  });
  const [lines, setLines] = useState<SaleLineDraft[]>(() => {
    if (order) return linesToDrafts(order.lines);
    if (request) return linesToDrafts(request.lines);
    return [makeSaleLine(undefined, "costPrice")];
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const documentLines = useMemo(() => draftsToLines(lines, data.products), [lines, data.products]);
  const totals = useMemo(() => computeTotals(documentLines), [documentLines]);

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.supplierId) nextErrors.supplierId = "Supplier is required.";
    if (!state.warehouseId) nextErrors.warehouseId = "Warehouse is required.";
    if (documentLines.length === 0) nextErrors.lines = "Add at least one line.";
    if (documentLines.some((line) => line.quantity <= 0)) {
      nextErrors.lines = "Every line needs a quantity above zero.";
    }
    if (state.expectedDate < state.date) {
      nextErrors.expectedDate = "Expected date cannot be before the order date.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      date: state.date,
      expectedDate: state.expectedDate,
      supplierId: state.supplierId,
      warehouseId: state.warehouseId,
      requestId: order?.requestId ?? request?.id ?? null,
      lines: documentLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      currency: data.business?.currency ?? "USD",
      notes: state.notes.trim() || undefined,
    };

    if (order) {
      actions.updateRecord("purchaseOrders", order.id, payload, {
        summary: `Updated purchase order ${order.number}`,
      });
      toast.success("Purchase order updated", order.number);
    } else {
      const number = actions.nextNumber("PO");
      const created = actions.createRecord(
        "purchaseOrders",
        {
          number,
          status: "draft",
          ...payload,
        } as unknown as PurchaseOrder,
        { summary: `Created purchase order ${number}`, number },
      );
      toast.success("Purchase order created", number);
      if (request) {
        actions.updateRecord(
          "purchaseRequests",
          request.id,
          { status: "converted", convertedToOrderId: created.id },
          { summary: `Converted request ${request.number} into ${number}` },
        );
      }
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={order ? `Edit ${order.number}` : "New purchase order"}
      description="Buy at cost. Receipts against this order push stock in and post inventory value."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {order ? "Save changes" : "Create order"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Supplier"
          required
          error={errors.supplierId}
          options={activeSuppliers.map((supplier) => ({
            value: supplier.id,
            label: `${supplier.code} · ${supplier.name}`,
          }))}
          value={state.supplierId}
          onChange={(event) => set("supplierId", event.target.value)}
        />
        <Select
          label="Warehouse"
          required
          error={errors.warehouseId}
          options={data.warehouses
            .filter((warehouse) => warehouse.status === "active")
            .map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
          value={state.warehouseId}
          onChange={(event) => set("warehouseId", event.target.value)}
        />
        <Input
          label="Order date"
          type="date"
          mono
          value={state.date}
          onChange={(event) => set("date", event.target.value)}
        />
        <Input
          label="Expected date"
          type="date"
          mono
          error={errors.expectedDate}
          value={state.expectedDate}
          onChange={(event) => set("expectedDate", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            rows={2}
            placeholder="Delivery window, Incoterms, reference."
            value={state.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint">
          Lines <span className="text-destructive">*</span>
        </p>
        <SalesLinesEditor
          lines={lines}
          onChange={setLines}
          products={buyable}
          priceField="costPrice"
        />
        {errors.lines ? <p className="mt-2 text-[12.5px] text-destructive">{errors.lines}</p> : null}
      </div>

      <div className="mt-4 flex justify-end">
        <TotalsBlock totals={totals} currency={data.business?.currency ?? "USD"} />
      </div>
    </Modal>
  );
}
