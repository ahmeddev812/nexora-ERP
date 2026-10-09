"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState } from "react";
import { ChevronsLeft, ChevronsRight, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { can } from "@/lib/permissions";
import { getJSON, setJSON, StorageKeys } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { NAV_GROUPS, type NavItem } from "./nav";

interface UiPrefs {
  sidebarCollapsed?: boolean;
}

const listeners = new Set<() => void>();

function subscribeUi(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function readCollapsed(): boolean {
  return getJSON<UiPrefs>(StorageKeys.ui)?.sidebarCollapsed === true;
}

function writeCollapsed(next: boolean): void {
  const prefs = getJSON<UiPrefs>(StorageKeys.ui) ?? {};
  setJSON(StorageKeys.ui, { ...prefs, sidebarCollapsed: next });
  for (const callback of listeners) callback();
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href;
}

function NavEntry({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring-visible group flex items-center gap-2.5 rounded-input px-2.5 py-2 text-sm transition-[background-color,color] duration-150",
        active
          ? "bg-primary-soft font-medium text-ink"
          : "text-ink-muted hover:bg-surface-2 hover:text-ink",
        collapsed && "justify-center px-0",
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-primary" : "text-ink-faint group-hover:text-ink-muted",
        )}
      >
        <Icon name={item.icon} size={17} />
      </span>
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip label={item.label} placement="right">
        {link}
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const collapsed = useSyncExternalStore(subscribeUi, readCollapsed, () => false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((group) => [group.id, true])),
  );

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(user, "view", item.resource)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-[260px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-line",
          collapsed ? "justify-center px-3" : "justify-between px-4",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="NEXORA home"
          className="focus-ring-visible rounded-tag"
        >
          <Logo size={28} withWordmark={!collapsed} />
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => writeCollapsed(true)}
            aria-label="Collapse sidebar"
            className="focus-ring-visible rounded-tag p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronsLeft size={16} strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      <nav
        aria-label="Modules"
        className="scroll-thin flex-1 space-y-4 overflow-y-auto px-3 py-4"
      >
        {collapsed ? (
          <ul className="space-y-1">
            {groups.flatMap((group) =>
              group.items.map((item) => (
                <li key={item.href}>
                  <NavEntry
                    item={item}
                    active={isActive(pathname, item.href)}
                    collapsed
                  />
                </li>
              )),
            )}
          </ul>
        ) : (
          groups.map((group) => {
            const open = openGroups[group.id] !== false;
            return (
              <div key={group.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() =>
                    setOpenGroups((current) => ({
                      ...current,
                      [group.id]: !open,
                    }))
                  }
                  className="focus-ring-visible flex w-full items-center justify-between rounded-tag px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-muted"
                >
                  {group.label}
                  <ChevronDown
                    size={13}
                    strokeWidth={1.5}
                    className={cn(
                      "transition-transform duration-150",
                      !open && "-rotate-90",
                    )}
                  />
                </button>
                {open ? (
                  <ul className="mt-1 space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavEntry
                          item={item}
                          active={isActive(pathname, item.href)}
                          collapsed={false}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })
        )}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-line px-3 py-3",
          collapsed && "px-2",
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={() => writeCollapsed(false)}
            aria-label="Expand sidebar"
            className="focus-ring-visible flex w-full items-center justify-center rounded-tag p-2 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronsRight size={16} strokeWidth={1.5} />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-[11px] leading-tight text-ink-faint">
              Local workspace
              <br />
              <span className="numeric">v1.0 · {user?.role ?? "guest"}</span>
            </p>
            <button
              type="button"
              onClick={() => writeCollapsed(false)}
              aria-label="Expand sidebar"
              className="focus-ring-visible rounded-tag p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ChevronsRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
