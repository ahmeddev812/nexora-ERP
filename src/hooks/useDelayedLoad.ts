"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` until `delay` ms have elapsed after mount.
 * Used to show shape-matching skeletons instead of a flash of empty UI.
 * `delay` is read on mount; changing it later does not re-trigger loading.
 */
export function useDelayedLoad(delay = 450): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return loading;
}
