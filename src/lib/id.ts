const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function generateId(prefix = "id"): string {
  let random = "";
  const cryptoApi =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(10);
    cryptoApi.getRandomValues(bytes);
    for (const byte of bytes) {
      random += ALPHABET[byte % ALPHABET.length];
    }
  } else {
    for (let i = 0; i < 10; i += 1) {
      random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }

  return `${prefix}_${random}`;
}

export interface DocumentNumberPolicy {
  next: number;
  padding?: number;
}

/**
 * Builds the next human readable document number.
 * Sequence bookkeeping (increment + persist) is handled by the caller.
 */
export function nextDocNumber(
  prefix: string,
  policy: DocumentNumberPolicy,
): string {
  const padding = policy.padding ?? 4;
  const counter = Number.isFinite(policy.next) ? policy.next : 1;
  return `${prefix}-${String(Math.max(1, Math.floor(counter))).padStart(
    padding,
    "0",
  )}`;
}

export function formatMoney(
  amount: number,
  currency = "",
  decimals = 2,
): string {
  const value = amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return currency ? `${currency} ${value}` : value;
}
