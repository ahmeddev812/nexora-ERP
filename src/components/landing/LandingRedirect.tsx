"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

/**
 * Signed in visitors land in the workspace instead of the marketing page.
 * Everything runs after auth hydration, so the first paint is untouched.
 */
export function LandingRedirect() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated || !user) return;
    queueMicrotask(() => router.replace("/dashboard"));
  }, [hydrated, user, router]);

  return null;
}
