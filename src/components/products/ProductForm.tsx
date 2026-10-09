"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastContext } from "@/context/ToastContext";
import { useERPActions, useERPData } from "@/hooks/useERPData";
import type { Product } from "@/types/erp";

interface FormState {
  sku: string;
  name: string;
  barcode: string;
  categoryId: string;
  unitId: string;
  supplierId: string;
  costPrice: string;
  sellPrice: string;
  taxRate: string;
  reorderLevel: string;
  trackStock: boolean;
  status: string;
  description: string;
}

function fromProduct(product: Product): FormState {
  return {
    sku: product.sku,
    name: product.name,
    barcode: product.barcode ?? "",
    categoryId: product.categoryId ?? "",
    unitId: product.unitId ?? "",
    supplierId: product.supplierId ?? "",
    costPrice: String(product.costPrice),
    sellPrice: String(product.sellPrice),
    taxRate: String(product.taxRate),
    reorderLevel: String(product.reorderLevel),
    trackStock: product.trackStock,
    status: product.status,
    description: product.description ?? "",
  };
}

function blank(existingSkus: Set<string>): FormState {
  let index = 1;
  let sku = `SKU-${String(index).padStart(4, "0")}`;
  while (existingSkus.has(sku)) {
    index += 1;
    sku = `SKU-${String(index).padStart(4, "0")}`;
  }

  return {
    sku,
    name: "",
    barcode: "",
    categoryId: "",
    unitId: "",
    supplierId: "",
    costPrice: "0",
    sellPrice: "0",
    taxRate: "0",
    reorderLevel: "0",
    trackStock: true,
    status: "active",
    description: "",
  };
}

interface ProductFormProps {
  /** null opens a blank record. */
  product: Product | null;
  onClose: () => void;
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const data = useERPData();
  const actions = useERPActions();
  const toast = useToastContext();

  const [state, setState] = useState<FormState>(() =>
    product ? fromProduct(product) : blank(new Set(data.products.map((entry) => entry.sku))),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const numberField = (key: keyof FormState) => (event: { target: { value: string } }) =>
    set(key, event.target.value);

  const save = () => {
    const nextErrors: Record<string, string> = {};
    if (!state.sku.trim()) nextErrors.sku = "SKU is required.";
    if (!state.name.trim()) nextErrors.name = "Name is required.";
    if (!Number.isFinite(Number(state.costPrice)) || Number(state.costPrice) < 0) {
      nextErrors.costPrice = "Cost must be zero or more.";
    }
    if (!Number.isFinite(Number(state.sellPrice)) || Number(state.sellPrice) < 0) {
      nextErrors.sellPrice = "Price must be zero or more.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      sku: state.sku.trim(),
      name: state.name.trim(),
      barcode: state.barcode.trim() || undefined,
      categoryId: state.categoryId || null,
      unitId: state.unitId || null,
      supplierId: state.supplierId || null,
      costPrice: Number(state.costPrice),
      sellPrice: Number(state.sellPrice),
      taxRate: Number(state.taxRate),
      reorderLevel: Number(state.reorderLevel),
      trackStock: state.trackStock,
      status: state.status === "draft" ? ("draft" as const) : state.status === "archived" ? ("archived" as const) : ("active" as const),
      description: state.description.trim() || undefined,
    };

    if (product) {
      actions.updateRecord("products", product.id, payload, {
        summary: `Updated product ${payload.name}`,
      });
      toast.success("Product updated", payload.name);
    } else {
      actions.createRecord("products", payload as unknown as Product, {
        summary: `Created product ${payload.name}`,
      });
      toast.success("Product created", payload.name);
    }

    onClose();
  };

  const margin =
    Number(state.sellPrice) > 0 && Number(state.sellPrice) >= Number(state.costPrice)
      ? Math.round(((Number(state.sellPrice) - Number(state.costPrice)) / Number(state.sellPrice)) * 100)
      : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? "Edit product" : "New product"}
      description={
        product
          ? "Update catalogue details, pricing and stock behaviour."
          : "Items you buy, stock and sell. Prices here do not rewrite history."
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            {product ? "Save changes" : "Create product"}
          </Button>
        </div>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Input
          label="SKU"
          required
          mono
          hint="Unique stock code."
          error={errors.sku}
          value={state.sku}
          onChange={(event) => set("sku", event.target.value)}
        />
        <Input
          label="Name"
          required
          error={errors.name}
          placeholder="What it is"
          value={state.name}
          onChange={(event) => set("name", event.target.value)}
        />
        <Input
          label="Barcode"
          mono
          placeholder="EAN or UPC"
          value={state.barcode}
          onChange={(event) => set("barcode", event.target.value)}
        />
        <Select
          label="Supplier"
          hint="Default source for purchasing."
          options={[
            { value: "", label: "No supplier" },
            ...data.suppliers
              .filter((supplier) => supplier.status !== "archived")
              .map((supplier) => ({ value: supplier.id, label: supplier.name })),
          ]}
          value={state.supplierId}
          onChange={(event) => set("supplierId", event.target.value)}
        />
        <Select
          label="Category"
          options={[
            { value: "", label: "Uncategorised" },
            ...data.categories
              .filter((category) => category.status !== "archived")
              .map((category) => ({ value: category.id, label: category.name })),
          ]}
          value={state.categoryId}
          onChange={(event) => set("categoryId", event.target.value)}
        />
        <Select
          label="Unit"
          options={[
            { value: "", label: "No unit" },
            ...data.units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` })),
          ]}
          value={state.unitId}
          onChange={(event) => set("unitId", event.target.value)}
        />
        <Input
          label="Cost price"
          type="number"
          mono
          error={errors.costPrice}
          value={state.costPrice}
          onChange={numberField("costPrice")}
        />
        <Input
          label="Sell price"
          type="number"
          mono
          error={errors.sellPrice}
          hint={margin !== null ? `Margin ${margin}%` : "Below cost or zero"}
          value={state.sellPrice}
          onChange={numberField("sellPrice")}
        />
        <Input
          label="Tax rate (%)"
          type="number"
          mono
          value={state.taxRate}
          onChange={numberField("taxRate")}
        />
        <Input
          label="Reorder level"
          type="number"
          mono
          hint="Alert once available stock drops below this."
          value={state.reorderLevel}
          onChange={numberField("reorderLevel")}
        />
        <Select
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ]}
          value={state.status}
          onChange={(event) => set("status", event.target.value)}
        />
        <div className="flex items-end pb-1">
          <Checkbox
            label="Track stock"
            hint="Quantities move with receipts and deliveries."
            checked={state.trackStock}
            onChange={(checked) => setState((current) => ({ ...current, trackStock: checked }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            rows={3}
            placeholder="Specs, notes for staff."
            value={state.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
