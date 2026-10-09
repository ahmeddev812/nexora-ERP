"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  indeterminate = false,
  disabled = false,
  className,
}: CheckboxProps) {
  const id = useId();

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          ref={(node) => {
            if (node) node.indeterminate = indeterminate && !checked;
          }}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
          className={cn(
            "focus-ring-visible size-4 cursor-pointer appearance-none rounded-[4px] border bg-surface transition-colors",
            "checked:border-primary checked:bg-primary",
            disabled && "cursor-not-allowed opacity-50",
            !checked && indeterminate && "border-primary bg-primary",
            !checked && !indeterminate && "border-line-strong hover:border-line-strong",
          )}
        />
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute size-3 text-on-primary transition-opacity",
            checked || indeterminate ? "opacity-100" : "opacity-0",
          )}
        >
          {checked ? (
            <path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path d="M4 8h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </span>

      {label && !hint ? (
        <label htmlFor={id} className="cursor-pointer text-[13px] text-ink">
          {label}
        </label>
      ) : null}

      {label && hint ? (
        <span className="min-w-0">
          <label htmlFor={id} className="cursor-pointer text-[13px] text-ink">
            {label}
          </label>
          <span className="block text-[11.5px] leading-relaxed text-ink-faint">{hint}</span>
        </span>
      ) : null}
    </div>
  );
}
