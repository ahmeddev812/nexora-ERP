"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  triggerClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  triggerClassName,
  panelClassName,
  ariaLabel = "Menu",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn("focus-ring-visible rounded-input", triggerClassName)}
      >
        {trigger}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "glass modal-shadow slide-in absolute z-50 mt-1.5 min-w-[200px] rounded-card border border-line p-1.5",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}

export function DropdownItem({
  children,
  onClick,
  href,
  danger = false,
  disabled = false,
}: DropdownItemProps) {
  const classes = cn(
    "focus-ring-visible flex w-full items-center gap-2 rounded-tag px-3 py-2 text-left text-[13px] font-medium transition-colors",
    danger
      ? "text-destructive hover:bg-destructive-soft"
      : "text-ink hover:bg-surface-2",
    disabled && "pointer-events-none opacity-50",
  );

  if (href) {
    return (
      <Link href={href} role="menuitem" className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-line" role="separator" />;
}
