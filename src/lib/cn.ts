export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

/**
 * Minimal class name joiner. No dependencies.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];

  for (const value of values) {
    if (!value) continue;

    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
      continue;
    }

    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
      continue;
    }

    if (typeof value === "object") {
      for (const [key, enabled] of Object.entries(value)) {
        if (enabled) out.push(key);
      }
    }
  }

  return out.join(" ");
}
