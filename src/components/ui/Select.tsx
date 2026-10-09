"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { FieldShell } from "./Input";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  selectClassName?: string;
  className?: string;
  children?: ReactNode;
}

export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  selectClassName,
  className,
  id,
  required,
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const describedBy = error || hint ? `${selectId}-described` : undefined;

  return (
    <FieldShell
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full appearance-none rounded-input border bg-surface pl-3 pr-9 text-sm text-ink",
            "transition-[border-color] duration-150",
            "focus-ring-visible hover:border-line-strong focus:border-primary/60",
            error ? "border-destructive" : "border-line",
            !options && !children && "text-ink-faint",
            selectClassName,
          )}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          size={15}
          strokeWidth={1.5}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        {describedBy ? (
          <span id={describedBy} className="sr-only">
            {error ?? hint}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}
