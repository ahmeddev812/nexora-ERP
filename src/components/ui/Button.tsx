import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "accent";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
}

export interface ButtonProps
  extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  href?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary text-on-primary hover:bg-primary-strong hover:border-primary-strong",
  secondary:
    "border-line bg-surface text-ink hover:border-line-strong hover:text-ink",
  ghost:
    "border-transparent bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
  destructive:
    "border-destructive bg-destructive text-on-primary hover:border-destructive hover:brightness-110",
  accent: "border-accent bg-accent text-ink hover:bg-accent-strong",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0">
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.25"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function classesFor(
  variant: ButtonVariant,
  size: ButtonSize,
  block: boolean,
  loading: boolean,
  disabled: boolean | undefined,
  className: string | undefined,
): string {
  return cn(
    "group relative inline-flex items-center justify-center gap-2 rounded-input border font-medium",
    "transition-[box-shadow,border-color,background-color,color] duration-150",
    "focus-ring-visible",
    "hover:card-hover active:card-rest",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    disabled || loading ? "pointer-events-none opacity-55" : "cursor-pointer",
    className,
  );
}

function Content({
  loading,
  iconLeft,
  iconRight,
  children,
}: {
  loading: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 transition-transform duration-150 ease-out group-hover:translate-x-px">
      {loading ? <Spinner /> : iconLeft}
      <span className="truncate">{children}</span>
      {!loading && iconRight}
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  href,
  type,
  ...rest
}: ButtonProps) {
  const classes = classesFor(variant, size, block, loading, disabled, className);
  const content = (
    <Content loading={loading} iconLeft={iconLeft} iconRight={iconRight}>
      {children}
    </Content>
  );

  if (href !== undefined && !disabled && !loading) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
