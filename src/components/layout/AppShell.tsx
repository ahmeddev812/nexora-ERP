"use client";

import { useState, type ReactNode } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="grain grid-lines min-h-screen bg-bg">
        <a
          href="#main"
          className="focus-ring-visible sr-only z-[70] rounded-input bg-surface px-4 py-2 text-sm font-medium text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          Skip to content
        </a>

        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onMenu={() => setMobileOpen(true)} />
            <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="mx-auto w-full max-w-[1280px]">{children}</div>
            </main>
          </div>
        </div>

        <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
    </AuthGuard>
  );
}
