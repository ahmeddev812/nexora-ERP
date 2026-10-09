"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import { NAV_GROUPS } from "./nav";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [activeGroup, setActiveGroup] = useState<string>("overview");

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(user, "view", item.resource)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        aria-label="Modules"
        className="glass slide-in absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col border-r border-line"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <Link
            href="/dashboard"
            onClick={onClose}
            aria-label="NEXORA home"
            className="focus-ring-visible rounded-tag"
          >
            <Logo size={26} withWordmark />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="focus-ring-visible rounded-tag p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X size={17} strokeWidth={1.5} />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            const expanded = activeGroup === group.id;
            return (
              <div key={group.id} className="mb-3">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setActiveGroup(expanded ? "" : group.id)}
                  className="focus-ring-visible flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                >
                  {group.label}
                </button>
                {expanded ? (
                  <ul className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "focus-ring-visible flex items-center gap-2.5 rounded-input px-2.5 py-2 text-sm",
                              active
                                ? "bg-primary-soft font-medium text-ink"
                                : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                            )}
                          >
                            <span className={active ? "text-primary" : "text-ink-faint"}>
                              <Icon name={item.icon} size={17} />
                            </span>
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-line px-4 py-3.5">
          <p className="truncate text-sm font-medium text-ink">
            {user?.name ?? "Signed out"}
          </p>
          <p className="text-[12px] text-ink-muted">
            {user ? `${ROLE_LABELS[user.role]} · local workspace` : "local workspace"}
          </p>
        </div>
      </nav>
    </div>
  );
}
