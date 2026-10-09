"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

interface TooltipProps {
  label: string;
  children: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({
  label,
  children,
  placement = "top",
  className,
}: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 200);
  };

  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => {
    const pending = timer.current;
    return () => window.clearTimeout(pending);
  }, []);

  const trigger = cloneElement(children as ReactElement<Record<string, unknown>>, {
    "aria-describedby": open ? id : undefined,
  });

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "glass absolute z-40 w-max max-w-[220px] rounded-tag border border-line px-2.5 py-1.5 text-xs leading-snug text-ink shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
            placement === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
            placement === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
            placement === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
            placement === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
