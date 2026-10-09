import type { ReactNode } from "react";

/**
 * NEXORA primary icon set.
 *
 * Hand-drawn 24x24 line icons at 1.5px stroke for navigation and module
 * identity. Common utility actions (close, chevrons, search) use lucide.
 */

export type IconName =
  | "dashboard"
  | "analytics"
  | "reports"
  | "customers"
  | "suppliers"
  | "products"
  | "categories"
  | "units"
  | "warehouses"
  | "branches"
  | "inventory"
  | "quotations"
  | "orders"
  | "deliveries"
  | "invoices"
  | "salesReturns"
  | "purchaseRequests"
  | "purchaseOrders"
  | "receipts"
  | "bills"
  | "purchaseReturns"
  | "payments"
  | "accounts"
  | "journal"
  | "ledger"
  | "receivables"
  | "payables"
  | "statements"
  | "employees"
  | "departments"
  | "attendance"
  | "leaves"
  | "payroll"
  | "users"
  | "settings"
  | "audit"
  | "approvals"
  | "transfers"
  | "adjustments"
  | "alerts"
  | "pulse";

const PATHS: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  analytics: (
    <>
      <path d="M3 17.5 9 11l3.5 3.5L21 6.5" />
      <path d="M15.5 6.5H21V12" />
    </>
  ),
  reports: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12.5h5M9.5 16h5" />
    </>
  ),
  customers: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  suppliers: (
    <>
      <path d="M3 20V9.5l5.5 3.5V9.5l5.5 3.5V6.5l6.5 3.5V20z" />
      <path d="M3 20h18" />
      <path d="M7.5 16.5h2M13 16.5h2M18 16.5h1.5" />
    </>
  ),
  products: (
    <>
      <path d="M12 3 21 7.5v9L12 21l-9-4.5v-9z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </>
  ),
  categories: (
    <>
      <path d="M12 3.5 20.5 8 12 12.5 3.5 8z" />
      <path d="m3.5 13 8.5 4.5 8.5-4.5" />
    </>
  ),
  units: (
    <>
      <path d="M3 15.5 15.5 3 21 8.5 8.5 21z" />
      <path d="m7.5 11 2 2M10.5 8l2 2M13.5 5l2 2" />
    </>
  ),
  warehouses: (
    <>
      <path d="M3 10.5 12 5l9 5.5V20H3z" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  branches: (
    <>
      <path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </>
  ),
  inventory: (
    <>
      <rect x="4" y="4" width="16" height="4.5" rx="1.2" />
      <rect x="4" y="10" width="16" height="4.5" rx="1.2" />
      <rect x="4" y="16" width="16" height="4.5" rx="1.2" />
    </>
  ),
  quotations: (
    <>
      <path d="M6.5 3.5h8L19 8v12.5H6.5z" />
      <path d="M14 3.5V8H19" />
      <path d="m10 16 4.5-5M10.5 11.2h.01M14 14.8h.01" />
    </>
  ),
  orders: (
    <>
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11.5h6M9 15.5h4" />
    </>
  ),
  deliveries: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h3.6L21 13v3h-7" />
      <circle cx="7" cy="18.5" r="1.7" />
      <circle cx="17.5" cy="18.5" r="1.7" />
    </>
  ),
  invoices: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3" />
    </>
  ),
  salesReturns: (
    <>
      <path d="M9 5 4 10l5 5" />
      <path d="M4 10h10a6 6 0 0 1 6 6v3" />
    </>
  ),
  purchaseRequests: (
    <>
      <path d="M5.5 5h13l1.5 8.5V19H4v-5.5z" />
      <path d="M4 13.5h4.5l1.5 3h4l1.5-3H20" />
    </>
  ),
  purchaseOrders: (
    <>
      <path d="M3 4h2.2l2.3 10.5h10.6L21 7.5H6.2" />
      <circle cx="9.5" cy="19" r="1.6" />
      <circle cx="17.5" cy="19" r="1.6" />
    </>
  ),
  receipts: (
    <>
      <path d="M20.5 12V7.5L12 3 3.5 7.5v9L12 21l3-1.6" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
      <path d="m8.8 16.4 2.4 2.4 4.4-4.6" />
    </>
  ),
  bills: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M12 9.5v6" />
      <path d="M13.6 11a1.5 1.5 0 0 0-1.6-1c-.9 0-1.6.5-1.6 1.2 0 1.6 3.2.8 3.2 2.4 0 .7-.7 1.2-1.6 1.2a1.5 1.5 0 0 1-1.6-1" />
    </>
  ),
  purchaseReturns: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
      <path d="M4 6.5V11h4.5" />
    </>
  ),
  payments: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14.5h3" />
    </>
  ),
  accounts: (
    <>
      <path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
      <path d="M8 4.5V20" />
      <path d="M11.5 9.5h4M11.5 13h4" />
    </>
  ),
  journal: (
    <>
      <path d="M12 6.5S10 4.5 5.5 4.5v13S10 19.5 12 19.5s2-2 6.5-2v-13S14 6.5 12 6.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  ledger: (
    <>
      <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </>
  ),
  receivables: (
    <>
      <path d="M18 6 6.5 17.5" />
      <path d="M6.5 9.5v8h8" />
    </>
  ),
  payables: (
    <>
      <path d="M6 18 17.5 6.5" />
      <path d="M9.5 6.5h8v8" />
    </>
  ),
  statements: (
    <>
      <path d="M5 20V11M12 20V4M19 20v-6" />
      <path d="M3 20.5h18" />
    </>
  ),
  employees: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <circle cx="10" cy="10.5" r="2.2" />
      <path d="M6.9 16.8a3.6 3.6 0 0 1 6.2 0" />
      <path d="M15.5 9.5h2.5M15.5 13h2.5" />
    </>
  ),
  departments: (
    <>
      <rect x="9" y="3.5" width="6" height="5" rx="1" />
      <rect x="3" y="15.5" width="6" height="5" rx="1" />
      <rect x="15" y="15.5" width="6" height="5" rx="1" />
      <path d="M12 8.5v3.5M6 15.5v-3.5h12v3.5" />
    </>
  ),
  attendance: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  leaves: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10.5h16" />
      <path d="m10 14.5 4 4M14 14.5l-4 4" />
    </>
  ),
  payroll: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6.5 10.5h.01M17.5 13.5h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.3a3.2 3.2 0 0 1 0 5.4" />
      <path d="M17.6 14.6A6 6 0 0 1 21 20" />
    </>
  ),
  settings: (
    <>
      <path d="M4 8h9M18.5 8H20M4 16h3.5M13 16h7" />
      <circle cx="15.5" cy="8" r="2.2" />
      <circle cx="10" cy="16" r="2.2" />
    </>
  ),
  audit: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" />
      <path d="M4 6.5V11h4.5" />
      <path d="M12 8.5V12l2.6 1.6" />
    </>
  ),
  approvals: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  transfers: (
    <>
      <path d="M4 9h13l-3.5-3.5" />
      <path d="M20 15H7l3.5 3.5" />
    </>
  ),
  adjustments: (
    <>
      <path d="M6 6.5v11M12 4.5v15M18 8.5v11" />
      <circle cx="6" cy="9.5" r="1.8" />
      <circle cx="12" cy="15" r="1.8" />
      <circle cx="18" cy="12" r="1.8" />
    </>
  ),
  alerts: (
    <>
      <path d="M18 16.5v-5a6 6 0 1 0-12 0v5l-1.8 2.5h15.6z" />
      <path d="M10 22h4" />
    </>
  ),
  pulse: (
    <>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.5,
  className,
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
