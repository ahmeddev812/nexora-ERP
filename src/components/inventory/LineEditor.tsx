"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { Product } from "@/types/erp";

export interface EditableLine {
  key: string;
  productId: string;
  quantity: string;
  unitCost: string;
}

let lineSeq = 0;

export function makeLine(productId = "", quantity = "1"): EditableLine {
  lineSeq += 1;
  return { key: `line_${lineSeq}`, productId, quantity, unitCost: "" };
}

interface LineEditorProps {
  lines: EditableLine[];
  onChange: (next: EditableLine[]) => void;
  products: Product[];
  mode: "transfer" | "adjustment";
  /** Hint text shown under the product select, usually availability. */
  availability?: (productId: string) => string | null;
}

export function LineEditor({
  lines,
  onChange,
  products,
  mode,
  availability,
}: LineEditorProps) {
  const columns = mode === "adjustment" ? "minmax(0,1fr) 110px 110px 32px" : "minmax(0,1fr) 130px 32px";
  const used = new Set(lines.map((line) => line.productId).filter(Boolean));

  const update = (key: string, patch: Partial<EditableLine>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const remove = (key: string) => onChange(lines.filter((line) => line.key !== key));

  return (
    <div className="space-y-2">
      <div
        className="grid gap-2 px-1 text-[11px] uppercase tracking-[0.12em] text-ink-faint"
        style={{ gridTemplateColumns: columns }}
      >
        <span>Product</span>
        <span>{mode === "adjustment" ? "Delta" : "Quantity"}</span>
        {mode === "adjustment" ? <span>Unit cost</span> : null}
        <span />
      </div>

      {lines.map((line) => {
        const hint = availability ? availability(line.productId) : null;
        return (
          <div
            key={line.key}
            className="grid items-start gap-2"
            style={{ gridTemplateColumns: columns }}
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
              hint={hint ?? undefined}
              onChange={(event) => update(line.key, { productId: event.target.value })}
            />
            <Input
              aria-label="Quantity"
              type="number"
              mono
              value={line.quantity}
              onChange={(event) => update(line.key, { quantity: event.target.value })}
            />
            {mode === "adjustment" ? (
              <Input
                aria-label="Unit cost"
                type="number"
                mono
                placeholder="Cost"
                value={line.unitCost}
                onChange={(event) => update(line.key, { unitCost: event.target.value })}
              />
            ) : null}
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
        onClick={() => onChange([...lines, makeLine()])}
        className={cn(lines.length === 0 && "mt-1")}
      >
        Add line
      </Button>
    </div>
  );
}
