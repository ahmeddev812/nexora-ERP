"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useERPData } from "@/hooks/useERPData";
import { can } from "@/lib/permissions";
import { readRaw, StorageKeys } from "@/lib/storage";
import type { Action, Resource, Role } from "@/types/erp";

interface AuthGuardProps {
  children: ReactNode;
  /** Restrict to specific roles. */
  roles?: Role[];
  /** Restrict to a resource, using the shared permission matrix. */
  resource?: Resource;
  action?: Action;
  /** Shown while auth and data hydrate. */
  fallback?: ReactNode;
}

function GuardSkeleton() {
  return (
    <div className="min-h-screen bg-bg" aria-busy="true" aria-live="polite">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-16">
        <div className="h-8 w-56 animate-pulse rounded-tag bg-surface-2" />
        <div className="h-3 w-72 animate-pulse rounded-tag bg-surface-2" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-card bg-surface-2" />
          <div className="h-28 animate-pulse rounded-card bg-surface-2" />
          <div className="h-28 animate-pulse rounded-card bg-surface-2" />
        </div>
        <div className="h-72 animate-pulse rounded-card bg-surface-2" />
      </div>
    </div>
  );
}

export function AuthGuard({
  children,
  roles,
  resource,
  action = "view",
  fallback,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated: authHydrated } = useAuth();
  const { hydrated: dataHydrated, business } = useERPData();

  const ready = authHydrated && dataHydrated;
  const allowed =
    user !== null &&
    (roles === undefined || roles.includes(user.role)) &&
    (resource === undefined || can(user, action, resource));

  useEffect(() => {
    if (!authHydrated) return;

    // One microtask so navigation decisions never run inside the render pass,
    // and so a pending demo seed gets applied before onboarding is judged.
    queueMicrotask(() => {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!dataHydrated) return;
      if (readRaw(StorageKeys.seedRequest) !== null) return;

      const onboardingDone = business?.onboardingDone === true;
      if (!onboardingDone && pathname !== "/onboarding") {
        router.replace("/onboarding");
      } else if (onboardingDone && pathname === "/onboarding") {
        router.replace("/dashboard");
      }
    });
  }, [authHydrated, dataHydrated, user, business, pathname, router]);

  if (!ready) return <>{fallback ?? <GuardSkeleton />}</>;

  if (!user) return <>{fallback ?? <GuardSkeleton />}</>;

  if (!allowed) {
    return (
      <div className="grain flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">
            Restricted
          </p>
          <h1 className="serif mt-4 text-4xl text-ink">No access here</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Your role ({user.role}) does not include permission for this area.
            Ask an owner or admin to change your role.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="focus-ring-visible mt-6 rounded-input border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-shadow card-rest hover:card-hover"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
