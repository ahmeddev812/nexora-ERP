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
import type { SalesOrder } from "@/types/erp";

interface FormState {
  customerId: string;
  date: string;
  warehouseId: string;
  paymentTerms: string;
  notes: string;
}

interface OrderFormProps {
  /** null opens a blank record. */
  order: SalesOrder | null;
  onClose: () => void;
}

export function OrderForm({ order, onClose }: OrderFormProps) {
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
  const initialCustomer = order?.customerId ?? activeCustomers[0]?.id ?? "";

  const [state, setState] = useState<FormState>({
    customerId: initialCustomer,
    date: order?.date ?? todayKey(),
    warehouseId: order?.warehouseId ?? defaultWarehouse?.id ?? "",
    paymentTerms: String(
      order?.paymentTerms ??
        data.customers.find((customer) => customer.id === initialCustomer)?.paymentTerms ??
        30,
    ),
    notes: order?.notes ?? "",
  });
  const [lines, setLines] = useState<SaleLineDraft[]>(() =>
    order ? linesToDrafts(order.lines) : [makeSaleLine()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const documentLines = useMemo(() => draftsToLines(lines, data.products), [lines, data.products]);
  const totals = useMemo(() => computeTotals(documentLines), [documentLines]);

  const pickCustomer = (customerId: string) => {
    const customer = data.customers.find((entry) => entry.id === customerId);
    setState((current) => ({
      ...current,
      customerId,
      paymentTerms: String(customer?.paymentTerms ?? current.paymentTerms),
    }));
  };

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.customerId) nextErrors.customerId = "Customer is required.";
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
      customerId: state.customerId,
      warehouseId: state.warehouseId,
      lines: documentLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      currency: data.business?.currency ?? "USD",
      paymentTerms: Number(state.paymentTerms) || 0,
      notes: state.notes.trim() || undefined,
    };

    if (order) {
      actions.updateRecord("salesOrders", order.id, payload, {
        summary: `Updated order ${order.number}`,
      });
      toast.success("Order updated", order.number);
    } else {
      const number = actions.nextNumber("SO");
      actions.createRecord(
        "salesOrders",
        {
          number,
          status: "draft",
          branchId: null,
          quotationId: null,
          ...payload,
        } as unknown as SalesOrder,
        { summary: `Created order ${number}`, number },
      );
      toast.success("Order created", number);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={order ? `Edit ${order.number}` : "New sales order"}
      description="Submit for approval to hold stock, then fulfil it with a delivery."
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
          label="Customer"
          required
          error={errors.customerId}
          options={activeCustomers.map((customer) => ({
            value: customer.id,
            label: `${customer.code} · ${customer.name}`,
          }))}
          value={state.customerId}
          onChange={(event) => pickCustomer(event.target.value)}
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
          label="Payment terms (days)"
          type="number"
          mono
          value={state.paymentTerms}
          onChange={(event) => set("paymentTerms", event.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Notes"
            rows={2}
            placeholder="Delivery instructions, reference numbers."
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
