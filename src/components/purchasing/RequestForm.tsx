"use client";

import { useMemo, useState } from "react";

import { TotalsBlock } from "@/components/sales/TotalsBlock";
import {
  draftsToLines,
  linesToDrafts,
  makeSaleLine,
  SalesLinesEditor,
  type SaleLineDraft,
} from "@/components/sales/SalesLinesEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import { computeTotals } from "@/lib/calculations";
import { todayKey } from "@/lib/dates";
import type { PurchaseRequest } from "@/types/erp";

type Priority = PurchaseRequest["priority"];

interface FormState {
  date: string;
  warehouseId: string;
  departmentId: string;
  priority: Priority;
  reason: string;
}

interface RequestFormProps {
  /** null opens a blank record. */
  request: PurchaseRequest | null;
  onClose: () => void;
}

export function RequestForm({ request, onClose }: RequestFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();
  const { user } = useAuth();

  const defaultWarehouse = useMemo(
    () => data.warehouses.find((warehouse) => warehouse.isDefault) ?? data.warehouses[0],
    [data.warehouses],
  );
  const buyable = useMemo(
    () => data.products.filter((product) => product.status !== "archived"),
    [data.products],
  );

  const [state, setState] = useState<FormState>({
    date: request?.date ?? todayKey(),
    warehouseId: request?.warehouseId ?? defaultWarehouse?.id ?? "",
    departmentId: request?.departmentId ?? data.departments[0]?.id ?? "",
    priority: request?.priority ?? "normal",
    reason: request?.reason ?? "",
  });
  const [lines, setLines] = useState<SaleLineDraft[]>(() =>
    request ? linesToDrafts(request.lines) : [makeSaleLine(undefined, "costPrice")],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const documentLines = useMemo(() => draftsToLines(lines, data.products), [lines, data.products]);
  const totals = useMemo(() => computeTotals(documentLines), [documentLines]);

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.warehouseId) nextErrors.warehouseId = "Warehouse is required.";
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
      warehouseId: state.warehouseId,
      departmentId: state.departmentId || null,
      priority: state.priority,
      reason: state.reason.trim() || undefined,
      lines: documentLines,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
    };

    if (request) {
      actions.updateRecord("purchaseRequests", request.id, payload, {
        summary: `Updated request ${request.number}`,
      });
      toast.success("Request updated", request.number);
    } else {
      const number = actions.nextNumber("PRQ");
      actions.createRecord(
        "purchaseRequests",
        {
          number,
          status: "draft",
          requestedBy: user?.id ?? "system",
          ...payload,
        } as unknown as PurchaseRequest,
        { summary: `Created purchase request ${number}`, number },
      );
      toast.success("Request created", number);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={request ? `Edit ${request.number}` : "New purchase request"}
      description="Raise demand for stock. Approved requests convert straight into purchase orders."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {request ? "Save changes" : "Create request"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Request date"
          type="date"
          mono
          value={state.date}
          onChange={(event) => set("date", event.target.value)}
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
        <Select
          label="Department"
          options={[
            { value: "", label: "No department" },
            ...data.departments.map((department) => ({
              value: department.id,
              label: department.name,
            })),
          ]}
          value={state.departmentId}
          onChange={(event) => set("departmentId", event.target.value)}
        />
        <Select
          label="Priority"
          options={[
            { value: "low", label: "Low" },
            { value: "normal", label: "Normal" },
            { value: "high", label: "High" },
          ]}
          value={state.priority}
          onChange={(event) => set("priority", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Reason"
            rows={2}
            placeholder="Why do we need this stock?"
            value={state.reason}
            onChange={(event) => set("reason", event.target.value)}
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
