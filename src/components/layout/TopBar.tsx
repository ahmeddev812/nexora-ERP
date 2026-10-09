"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { todayKey, relativeLabel } from "@/lib/dates";
import { useAuth } from "@/hooks/useAuth";
import { useERPData } from "@/hooks/useERPData";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";
import { ROLE_LABELS } from "@/lib/permissions";

interface TopBarProps {
  onMenu: () => void;
}

const subscribeNothing = () => () => {};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return letters || "?";
}

export function TopBar({ onMenu }: TopBarProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { auditLog } = useERPData();

  const dark = resolvedTheme === "dark";
  const isMac = useSyncExternalStore(
    subscribeNothing,
    () =>
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );

  const recent = [...auditLog]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, 6);

  const todayCount = auditLog.filter((entry) => entry.at.slice(0, 10) === todayKey())
    .length;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="focus-ring-visible rounded-input border border-line bg-surface p-2 text-ink-muted transition-colors hover:text-ink lg:hidden"
      >
        <Menu size={17} strokeWidth={1.5} />
      </button>

      <button
        type="button"
        onClick={() => router.push("/search")}
        className="focus-ring-visible group hidden h-9 w-full max-w-md items-center gap-2.5 rounded-input border border-line bg-surface px-3 text-left text-[13px] text-ink-faint transition-[border-color,color] hover:border-line-strong hover:text-ink-muted sm:flex"
      >
        <Search size={15} strokeWidth={1.5} className="shrink-0" />
        <span className="truncate">Search customers, invoices, SKUs</span>
        <kbd className="numeric ml-auto shrink-0 rounded-tag border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => router.push("/search")}
          aria-label="Search"
          className="focus-ring-visible rounded-input p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink sm:hidden"
        >
          <Search size={17} strokeWidth={1.5} />
        </button>

        <Dropdown
          ariaLabel="Notifications"
          triggerClassName="rounded-input p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          panelClassName="w-[320px] p-0"
          trigger={
            <span className="relative block">
              <Bell size={17} strokeWidth={1.5} />
              {todayCount > 0 ? (
                <span className="numeric absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-ink">
                  {todayCount > 9 ? "9+" : todayCount}
                </span>
              ) : null}
            </span>
          }
        >
          <div className="border-b border-line px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Activity today
            </p>
          </div>
          <ul className="max-h-[300px] overflow-y-auto scroll-thin p-1.5">
            {recent.length === 0 ? (
              <li className="px-3 py-4 text-center text-[13px] text-ink-muted">
                Nothing has happened yet.
              </li>
            ) : (
              recent.map((entry) => (
                <li key={entry.id} className="rounded-tag px-3 py-2 hover:bg-surface-2">
                  <p className="truncate text-[13px] text-ink">{entry.summary}</p>
                  <p className="numeric mt-0.5 text-[11px] text-ink-faint">
                    {entry.actorName} · {relativeLabel(entry.at)}
                  </p>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-line p-1.5">
            <DropdownItem href="/settings/audit">View audit trail</DropdownItem>
          </div>
        </Dropdown>

        <button
          type="button"
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          className="focus-ring-visible rounded-input p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {dark ? (
            <Moon size={17} strokeWidth={1.5} />
          ) : (
            <Sun size={17} strokeWidth={1.5} />
          )}
        </button>

        <Dropdown
          ariaLabel="Account menu"
          triggerClassName="rounded-input p-1"
          panelClassName="w-[236px]"
          trigger={
            <span className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full border border-primary/25 bg-primary-soft text-[12px] font-semibold text-primary">
                {user ? initials(user.name) : "?"}
              </span>
            </span>
          }
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink">
              {user?.name ?? "Signed out"}
            </p>
            <p className="truncate text-[12px] text-ink-muted">{user?.email}</p>
            <p className="mt-1.5 inline-flex rounded-tag border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
              {user ? ROLE_LABELS[user.role] : ""}
            </p>
          </div>
          <DropdownSeparator />
          <DropdownItem href="/settings">Settings</DropdownItem>
          <DropdownItem href="/users">Users</DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            danger
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut size={14} strokeWidth={1.5} />
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
