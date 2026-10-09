"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { lineTotalOf } from "@/lib/calculations";
import { formatMoney } from "@/lib/id";
import type { DocumentLine, Product } from "@/types/erp";

export interface SaleLineDraft {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
}

let saleLineSeq = 0;

export function makeSaleLine(
  product?: Product,
  priceField: "costPrice" | "sellPrice" = "sellPrice",
): SaleLineDraft {
  saleLineSeq += 1;
  return {
    key: `sl_${saleLineSeq}`,
    productId: product?.id ?? "",
    quantity: "1",
    unitPrice: product ? String(product[priceField]) : "0",
    discountPercent: "0",
    taxRate: product ? String(product.taxRate) : "0",
  };
}

/** Prices, discounts and tax rates are captured here and never recalculated later. */
export function draftsToLines(
  drafts: readonly SaleLineDraft[],
  products: readonly Product[],
): DocumentLine[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return drafts
    .filter((draft) => draft.productId)
    .map((draft) => {
      const line: DocumentLine = {
        id: `dl_${Math.random().toString(36).slice(2, 10)}`,
        productId: draft.productId,
        description: byId.get(draft.productId)?.name ?? draft.productId,
        quantity: Number(draft.quantity) || 0,
        unitPrice: Number(draft.unitPrice) || 0,
        discountPercent: Number(draft.discountPercent) || 0,
        taxRate: Number(draft.taxRate) || 0,
        lineTotal: 0,
      };
      line.lineTotal = lineTotalOf(line);
      return line;
    });
}

/** Reverse of draftsToLines, used when opening an existing document for edit. */
export function linesToDrafts(lines: readonly DocumentLine[]): SaleLineDraft[] {
  saleLineSeq += 1;
  return lines.map((line, index) => ({
    key: `sl_${saleLineSeq}_${index}`,
    productId: line.productId,
    quantity: String(line.quantity),
    unitPrice: String(line.unitPrice),
    discountPercent: String(line.discountPercent ?? 0),
    taxRate: String(line.taxRate ?? 0),
  }));
}

interface SalesLinesEditorProps {
  lines: SaleLineDraft[];
  onChange: (next: SaleLineDraft[]) => void;
  products: readonly Product[];
  /** Which catalogue price is prefilled when a product is picked. */
  priceField?: "costPrice" | "sellPrice";
}

const COLUMNS = "minmax(160px,1fr) 90px 110px 80px 80px 110px 32px";

export function SalesLinesEditor({
  lines,
  onChange,
  products,
  priceField = "sellPrice",
}: SalesLinesEditorProps) {
  const used = new Set(lines.map((line) => line.productId).filter(Boolean));

  const update = (key: string, patch: Partial<SaleLineDraft>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const pickProduct = (key: string, productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    onChange(
      lines.map((line) =>
        line.key === key
          ? {
              ...line,
              productId,
              unitPrice: product ? String(product[priceField]) : line.unitPrice,
              taxRate: product ? String(product.taxRate) : line.taxRate,
            }
          : line,
      ),
    );
  };

  const remove = (key: string) => onChange(lines.filter((line) => line.key !== key));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px] space-y-2">
        <div
          className="grid gap-2 px-1 text-[11px] uppercase tracking-[0.12em] text-ink-faint"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <span>Product</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit price</span>
          <span className="text-right">Disc %</span>
          <span className="text-right">Tax %</span>
          <span className="text-right">Line total</span>
          <span />
        </div>

        {lines.map((line) => {
          const preview: DocumentLine = {
            id: line.key,
            productId: line.productId,
            description: "",
            quantity: Number(line.quantity) || 0,
            unitPrice: Number(line.unitPrice) || 0,
            discountPercent: Number(line.discountPercent) || 0,
            taxRate: Number(line.taxRate) || 0,
            lineTotal: 0,
          };
          const total = lineTotalOf(preview);
          return (
            <div
              key={line.key}
              className="grid items-start gap-2"
              style={{ gridTemplateColumns: COLUMNS }}
            >
              <Select
                aria-label="Product"
                className="min-w-0"
                placeholder="Select product"
                options={products.map((product) => ({
                  value: product.id,
                  label: `${product.sku} · ${product.name}`,
                  disabled: used.has(product.id) && line.productId !== product.id,
                }))}
                value={line.productId}
                onChange={(event) => pickProduct(line.key, event.target.value)}
              />
              <Input
                aria-label="Quantity"
                type="number"
                mono
                value={line.quantity}
                onChange={(event) => update(line.key, { quantity: event.target.value })}
              />
              <Input
                aria-label="Unit price"
                type="number"
                mono
                value={line.unitPrice}
                onChange={(event) => update(line.key, { unitPrice: event.target.value })}
              />
              <Input
                aria-label="Discount percent"
                type="number"
                mono
                value={line.discountPercent}
                onChange={(event) => update(line.key, { discountPercent: event.target.value })}
              />
              <Input
                aria-label="Tax rate percent"
                type="number"
                mono
                value={line.taxRate}
                onChange={(event) => update(line.key, { taxRate: event.target.value })}
              />
              <span className="numeric flex h-10 items-center justify-end rounded-input border border-line bg-surface-2 px-3 text-[13px] text-ink">
                {formatMoney(total, "", 2)}
              </span>
              <button
                type="button"
                aria-label="Remove line"
                onClick={() => remove(line.key)}
                className="focus-ring-visible mt-1 flex size-8 items-center justify-center rounded-tag border border-line bg-surface text-ink-muted transition-colors hover:border-destructive hover:text-destructive"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={13} strokeWidth={1.5} />}
          onClick={() => onChange([...lines, makeSaleLine()])}
        >
          Add line
        </Button>
      </div>
    </div>
  );
}
