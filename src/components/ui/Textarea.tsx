"use client";

import { useId, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { FieldShell } from "./Input";

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  textareaClassName?: string;
  className?: string;
}

export function Textarea({
  label,
  hint,
  error,
  mono,
  textareaClassName,
  className,
  id,
  required,
  rows = 4,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const areaId = id ?? generatedId;
  const describedBy = error || hint ? `${areaId}-described` : undefined;

  return (
    <FieldShell
      id={areaId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <textarea
        id={areaId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full resize-y rounded-input border bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink",
          "placeholder:text-ink-faint transition-[border-color] duration-150",
          "focus-ring-visible hover:border-line-strong focus:border-primary/60",
          error ? "border-destructive" : "border-line",
          mono && "numeric",
          textareaClassName,
        )}
        {...rest}
      />
      {describedBy ? (
        <span id={describedBy} className="sr-only">
          {error ?? hint}
        </span>
      ) : null}
    </FieldShell>
  );
}
