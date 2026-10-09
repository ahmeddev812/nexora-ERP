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
import type { StockTransfer, StockTransferLine } from "@/types/erp";

interface FormState {
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  notes: string;
}

interface TransferFormProps {
  onClose: () => void;
}

export function TransferForm({ onClose }: TransferFormProps) {
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
    fromWarehouseId: activeWarehouses[0]?.id ?? "",
    toWarehouseId: activeWarehouses[1]?.id ?? "",
    notes: "",
  });
  const [lines, setLines] = useState<EditableLine[]>(() => [makeLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fromName =
    data.warehouses.find((warehouse) => warehouse.id === state.fromWarehouseId)?.name ?? "source";

  const availableAt = (productId: string): number => {
    const balance = data.stockBalances.find(
      (entry) => entry.productId === productId && entry.warehouseId === state.fromWarehouseId,
    );
    if (!balance) return 0;
    return round2(balance.onHand - balance.reserved);
  };

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.fromWarehouseId) nextErrors.fromWarehouseId = "Source warehouse is required.";
    if (!state.toWarehouseId) nextErrors.toWarehouseId = "Destination warehouse is required.";
    if (state.fromWarehouseId === state.toWarehouseId) {
      nextErrors.toWarehouseId = "Pick two different warehouses.";
    }

    const built: StockTransferLine[] = [];
    for (const [index, line] of lines.entries()) {
      if (!line.productId) {
        nextErrors.lines = `Line ${index + 1} has no product.`;
        continue;
      }
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        nextErrors.lines = `Line ${index + 1} needs a quantity above zero.`;
        continue;
      }
      const product = data.products.find((entry) => entry.id === line.productId);
      if (product && product.trackStock && availableAt(line.productId) < quantity) {
        nextErrors.lines = `${product.sku} only has ${availableAt(line.productId)} available in ${fromName}.`;
        continue;
      }
      built.push({
        id: `trl_${Math.random().toString(36).slice(2, 10)}`,
        productId: line.productId,
        quantity: round2(quantity),
        receivedQuantity: 0,
      });
    }

    if (built.length === 0 && !nextErrors.lines) {
      nextErrors.lines = "Add at least one line.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const number = actions.nextNumber("TRF");
    actions.createRecord(
      "stockTransfers",
      {
        number,
        date: state.date,
        fromWarehouseId: state.fromWarehouseId,
        toWarehouseId: state.toWarehouseId,
        status: "draft",
        lines: built,
        notes: state.notes.trim() || undefined,
        createdBy: user?.id ?? "system",
      } as unknown as StockTransfer,
      { summary: `Created transfer ${number}`, number },
    );
    toast.success("Transfer created", `${number} saved as draft`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New stock transfer"
      description="Move stock between warehouses. Nothing leaves the source until you send it."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Create transfer
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
          label="From warehouse"
          required
          error={errors.fromWarehouseId}
          options={activeWarehouses.map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
          }))}
          value={state.fromWarehouseId}
          onChange={(event) => set("fromWarehouseId", event.target.value)}
        />
        <Select
          label="To warehouse"
          required
          error={errors.toWarehouseId}
          options={activeWarehouses.map((warehouse) => ({
            value: warehouse.id,
            label: warehouse.name,
            disabled: warehouse.id === state.fromWarehouseId,
          }))}
          value={state.toWarehouseId}
          onChange={(event) => set("toWarehouseId", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            rows={2}
            placeholder="Why is this stock moving?"
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
          mode="transfer"
          availability={(productId) => `${availableAt(productId)} available in ${fromName}`}
        />
        {errors.lines ? <p className="mt-2 text-[12.5px] text-destructive">{errors.lines}</p> : null}
      </div>
    </Modal>
  );
}
