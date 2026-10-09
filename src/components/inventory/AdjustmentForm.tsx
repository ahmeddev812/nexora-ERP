"use client";

import { useMemo, useState } from "react";

import { LineEditor, makeLine, type EditableLine } from "@/components/inventory/LineEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { round2 } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import type { StockAdjustment, StockAdjustmentLine } from "@/types/erp";

const REASON_LABEL: Record<StockAdjustment["reason"], string> = {
  count_correction: "Count correction",
  damage: "Damage",
  theft: "Theft",
  other: "Other",
};

interface FormState {
  date: string;
  warehouseId: string;
  reason: StockAdjustment["reason"];
  notes: string;
}

interface AdjustmentFormProps {
  onClose: () => void;
}

export function AdjustmentForm({ onClose }: AdjustmentFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const activeWarehouses = useMemo(
    () => data.warehouses.filter((warehouse) => warehouse.status === "active"),
    [data.warehouses],
  );
  const trackedProducts = useMemo(
    () => data.products.filter((product) => product.trackStock && product.status !== "archived"),
    [data.products],
  );

  const [state, setState] = useState<FormState>({
    date: todayKey(),
    warehouseId: activeWarehouses[0]?.id ?? "",
    reason: "count_correction",
    notes: "",
  });
  const [lines, setLines] = useState<EditableLine[]>(() => [makeLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const warehouseName =
    data.warehouses.find((warehouse) => warehouse.id === state.warehouseId)?.name ?? "this warehouse";

  const onHandAt = (productId: string): number => {
    const balance = data.stockBalances.find(
      (entry) => entry.productId === productId && entry.warehouseId === state.warehouseId,
    );
    return balance ? round2(balance.onHand) : 0;
  };

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.warehouseId) nextErrors.warehouseId = "Warehouse is required.";

    const built: StockAdjustmentLine[] = [];
    for (const [index, line] of lines.entries()) {
      if (!line.productId) {
        nextErrors.lines = `Line ${index + 1} has no product.`;
        continue;
      }
      const delta = Number(line.quantity);
      if (!Number.isFinite(delta) || delta === 0) {
        nextErrors.lines = `Line ${index + 1} needs a non-zero delta.`;
        continue;
      }
      const product = data.products.find((entry) => entry.id === line.productId);
      const current = onHandAt(line.productId);
      if (product && product.trackStock && current + delta < 0) {
        nextErrors.lines = `${product.sku} only has ${current} on hand in ${warehouseName}.`;
        continue;
      }
      const unitCost =
        line.unitCost.trim() !== "" && Number.isFinite(Number(line.unitCost))
          ? round2(Number(line.unitCost))
          : product?.costPrice ?? 0;
      built.push({
        id: `adl_${Math.random().toString(36).slice(2, 10)}`,
        productId: line.productId,
        quantityDelta: round2(delta),
        unitCost,
      });
    }

    if (built.length === 0 && !nextErrors.lines) {
      nextErrors.lines = "Add at least one line.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const number = actions.nextNumber("ADJ");
    actions.createRecord(
      "stockAdjustments",
      {
        number,
        date: state.date,
        warehouseId: state.warehouseId,
        reason: state.reason,
        status: "pending",
        lines: built,
        notes: state.notes.trim() || undefined,
        requestedBy: user?.id ?? "system",
      } as unknown as StockAdjustment,
      { summary: `Requested adjustment ${number}`, number },
    );
    toast.success("Adjustment submitted", `${number} is awaiting approval`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New stock adjustment"
      description="Deltas are applied only once the adjustment is approved."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Submit for approval
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Date"
          type="date"
          mono
          value={state.date}
          onChange={(event) => set("date", event.target.value)}
        />
        <Select
          label="Reason"
          required
          options={(Object.keys(REASON_LABEL) as Array<StockAdjustment["reason"]>).map((reason) => ({
            value: reason,
            label: REASON_LABEL[reason],
          }))}
          value={state.reason}
          onChange={(event) => set("reason", event.target.value)}
        />
        <Select
          label="Warehouse"
          required
          error={errors.warehouseId}
          options={activeWarehouses.map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
          }))}
          value={state.warehouseId}
          onChange={(event) => set("warehouseId", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            rows={2}
            placeholder="What caused the variance?"
            value={state.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint">
          Lines <span className="text-destructive">*</span>
        </p>
        <LineEditor
          lines={lines}
          onChange={setLines}
          products={trackedProducts}
          mode="adjustment"
          availability={(productId) => `${onHandAt(productId)} on hand in ${warehouseName}`}
        />
        {errors.lines ? <p className="mt-2 text-[12.5px] text-destructive">{errors.lines}</p> : null}
      </div>
    </Modal>
  );
}
