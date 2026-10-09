"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="text-[13px] font-medium text-ink-muted"
        >
          {label}
          {required ? (
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p role="alert" className="text-[12px] leading-snug text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] leading-snug text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  className?: string;
  inputClassName?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  mono,
  inputClassName,
  leading,
  trailing,
  id,
  required,
  className,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error || hint ? `${inputId}-described` : undefined;

  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-ink-faint">
            {leading}
          </span>
        ) : null}
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-10 w-full rounded-input border bg-surface px-3 text-sm text-ink",
            "placeholder:text-ink-faint transition-[border-color] duration-150",
            "focus-ring-visible hover:border-line-strong focus:border-primary/60",
            error ? "border-destructive" : "border-line",
            mono && "numeric",
            leading ? "pl-9" : undefined,
            trailing ? "pr-10" : undefined,
            inputClassName,
          )}
          {...rest}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-faint">
            {trailing}
          </span>
        ) : null}
        {describedBy ? (
          <span id={describedBy} className="sr-only">
            {error ?? hint}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}
