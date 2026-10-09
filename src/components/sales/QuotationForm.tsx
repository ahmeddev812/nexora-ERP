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
import type { Quotation } from "@/types/erp";

interface FormState {
  customerId: string;
  date: string;
  validUntil: string;
  warehouseId: string;
  notes: string;
}

interface QuotationFormProps {
  /** null opens a blank record. */
  quotation: Quotation | null;
  onClose: () => void;
}

export function QuotationForm({ quotation, onClose }: QuotationFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const activeCustomers = useMemo(
    () => data.customers.filter((customer) => customer.status === "active"),
    [data.customers],
  );
  const sellable = useMemo(
    () => data.products.filter((product) => product.status === "active"),
    [data.products],
  );
  const defaultWarehouse = useMemo(
    () => data.warehouses.find((warehouse) => warehouse.isDefault) ?? data.warehouses[0],
    [data.warehouses],
  );

  const [state, setState] = useState<FormState>({
    customerId: quotation?.customerId ?? activeCustomers[0]?.id ?? "",
    date: quotation?.date ?? todayKey(),
    validUntil: quotation?.validUntil ?? addDays(todayKey(), 14),
    warehouseId: quotation?.warehouseId ?? defaultWarehouse?.id ?? "",
    notes: quotation?.notes ?? "",
  });
  const [lines, setLines] = useState<SaleLineDraft[]>(() =>
    quotation ? linesToDrafts(quotation.lines) : [makeSaleLine()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const documentLines = useMemo(
    () => draftsToLines(lines, data.products),
    [lines, data.products],
  );
  const totals = useMemo(() => computeTotals(documentLines), [documentLines]);

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.customerId) nextErrors.customerId = "Customer is required.";
    if (documentLines.length === 0) nextErrors.lines = "Add at least one line.";
    if (documentLines.some((line) => line.quantity <= 0)) {
      nextErrors.lines = "Every line needs a quantity above zero.";
    }
    if (state.validUntil < state.date) {
      nextErrors.validUntil = "Valid until cannot be before the quote date.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      date: state.date,
      validUntil: state.validUntil,
      customerId: state.customerId,
      branchId: quotation?.branchId ?? null,
      warehouseId: state.warehouseId || null,
      lines: documentLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      currency: data.business?.currency ?? "USD",
      notes: state.notes.trim() || undefined,
    };

    if (quotation) {
      actions.updateRecord("quotations", quotation.id, payload, {
        summary: `Updated quotation ${quotation.number}`,
      });
      toast.success("Quotation updated", quotation.number);
    } else {
      const number = actions.nextNumber("QT");
      actions.createRecord(
        "quotations",
        {
          number,
          status: "draft",
          ...payload,
        } as unknown as Quotation,
        { summary: `Created quotation ${number}`, number },
      );
      toast.success("Quotation created", number);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={quotation ? `Edit ${quotation.number}` : "New quotation"}
      description="Prices are captured on the document and stay frozen after it is sent."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {quotation ? "Save changes" : "Create quotation"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Customer"
          required
          error={errors.customerId}
          options={activeCustomers.map((customer) => ({
            value: customer.id,
            label: `${customer.code} · ${customer.name}`,
          }))}
          value={state.customerId}
          onChange={(event) => set("customerId", event.target.value)}
        />
        <Select
          label="Warehouse"
          options={[
            { value: "", label: "No warehouse" },
            ...data.warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
          ]}
          value={state.warehouseId}
          onChange={(event) => set("warehouseId", event.target.value)}
        />
        <Input
          label="Quote date"
          type="date"
          mono
          value={state.date}
          onChange={(event) => set("date", event.target.value)}
        />
        <Input
          label="Valid until"
          type="date"
          mono
          error={errors.validUntil}
          value={state.validUntil}
          onChange={(event) => set("validUntil", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            rows={2}
            placeholder="Payment terms, delivery promise."
            value={state.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11.5px] uppercase tracking-[0.12em] text-ink-faint">
          Lines <span className="text-destructive">*</span>
        </p>
        <SalesLinesEditor lines={lines} onChange={setLines} products={sellable} />
        {errors.lines ? <p className="mt-2 text-[12.5px] text-destructive">{errors.lines}</p> : null}
      </div>

      <div className="mt-4 flex justify-end">
        <TotalsBlock totals={totals} currency={data.business?.currency ?? "USD"} />
      </div>
    </Modal>
  );
}
