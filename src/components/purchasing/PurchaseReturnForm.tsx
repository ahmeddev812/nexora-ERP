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
import { todayKey } from "@/lib/dates";
import type { PurchaseReturn } from "@/types/erp";

interface FormState {
  date: string;
  supplierId: string;
  warehouseId: string;
  reason: string;
}

interface PurchaseReturnFormProps {
  /** null opens a blank record. */
  record: PurchaseReturn | null;
  onClose: () => void;
}

export function PurchaseReturnForm({ record, onClose }: PurchaseReturnFormProps) {
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
    date: record?.date ?? todayKey(),
    supplierId: record?.supplierId ?? activeSuppliers[0]?.id ?? "",
    warehouseId: record?.warehouseId ?? defaultWarehouse?.id ?? "",
    reason: record?.reason ?? "",
  });
  const [lines, setLines] = useState<SaleLineDraft[]>(() =>
    record ? linesToDrafts(record.lines) : [makeSaleLine(undefined, "costPrice")],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const documentLines = useMemo(() => draftsToLines(lines, data.products), [lines, data.products]);
  const totals = useMemo(() => computeTotals(documentLines), [documentLines]);

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.supplierId) nextErrors.supplierId = "Supplier is required.";
    if (!state.warehouseId) nextErrors.warehouseId = "Warehouse is required.";
    if (state.reason.trim().length < 3) {
      nextErrors.reason = "A short reason is required.";
    }
    if (documentLines.length === 0) nextErrors.lines = "Add at least one line.";
    if (documentLines.some((line) => line.quantity <= 0)) {
      nextErrors.lines = "Every line needs a quantity above zero.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      date: state.date,
      supplierId: state.supplierId,
      warehouseId: state.warehouseId,
      reason: state.reason.trim(),
      lines: documentLines,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
    };

    if (record) {
      actions.updateRecord("purchaseReturns", record.id, payload, {
        summary: `Updated supplier return ${record.number}`,
      });
      toast.success("Return updated", record.number);
    } else {
      const number = actions.nextNumber("PRT");
      actions.createRecord(
        "purchaseReturns",
        {
          number,
          status: "pending",
          receiptId: null,
          ...payload,
        } as unknown as PurchaseReturn,
        { summary: `Created supplier return ${number}`, number },
      );
      toast.success("Return drafted", `${number} awaiting approval`);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={record ? `Edit ${record.number}` : "New supplier return"}
      description="Send bad stock back. Stock leaves the warehouse when the return ships."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {record ? "Save changes" : "Create return"}
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
          label="Return date"
          type="date"
          mono
          value={state.date}
          onChange={(event) => set("date", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Reason"
            required
            rows={2}
            placeholder="Damaged stock, wrong item, over shipment."
            value={state.reason}
            onChange={(event) => {
              set("reason", event.target.value);
              setErrors((current) => ({ ...current, reason: "" }));
            }}
            error={errors.reason}
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
