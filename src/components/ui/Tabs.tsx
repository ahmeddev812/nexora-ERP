"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  className,
}: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState<string>(
    defaultValue ?? tabs[0]?.id ?? "",
  );
  const active = value ?? internal;
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === active),
  );

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (tabs.length === 0) return;
    let nextIndex = activeIndex;

    if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const next = tabs[nextIndex];
    if (!next) return;
    select(next.id);
    const element = document.getElementById(`${baseId}-tab-${next.id}`);
    element?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Sections"
      onKeyDown={onKeyDown}
      className={cn(
        "scroll-thin flex items-center gap-1 overflow-x-auto border-b border-line",
        className,
      )}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`${baseId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(tab.id)}
            className={cn(
              "focus-ring-visible -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
              selected
                ? "border-primary text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "numeric rounded-tag border px-1.5 py-0.5 text-[11px]",
                  selected
                    ? "border-primary/25 bg-primary-soft text-primary"
                    : "border-line bg-surface-2 text-ink-muted",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Matches the id Tabs passes through aria-controls. */
export function tabPanelId(baseId: string, tabId: string): string {
  return `${baseId}-panel-${tabId}`;
}
