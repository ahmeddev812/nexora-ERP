import type { IconName } from "@/components/ui/Icon";
import type { Resource } from "@/types/erp";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  resource: Resource;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard", resource: "dashboard" },
      { label: "Analytics", href: "/analytics", icon: "analytics", resource: "analytics" },
      { label: "Reports", href: "/reports", icon: "reports", resource: "reports" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { label: "Customers", href: "/customers", icon: "customers", resource: "customers" },
      { label: "Quotations", href: "/sales/quotations", icon: "quotations", resource: "sales" },
      { label: "Sales orders", href: "/sales/orders", icon: "orders", resource: "sales" },
      { label: "Deliveries", href: "/sales/deliveries", icon: "deliveries", resource: "sales" },
      { label: "Invoices", href: "/sales/invoices", icon: "invoices", resource: "sales" },
      { label: "Returns", href: "/sales/returns", icon: "salesReturns", resource: "sales" },
    ],
  },
  {
    id: "purchasing",
    label: "Purchasing",
    items: [
      { label: "Suppliers", href: "/suppliers", icon: "suppliers", resource: "suppliers" },
      { label: "Requests", href: "/purchasing/requests", icon: "purchaseRequests", resource: "purchasing" },
      { label: "Purchase orders", href: "/purchasing/orders", icon: "purchaseOrders", resource: "purchasing" },
      { label: "Receipts", href: "/purchasing/receipts", icon: "receipts", resource: "purchasing" },
      { label: "Supplier bills", href: "/purchasing/bills", icon: "bills", resource: "purchasing" },
      { label: "Returns", href: "/purchasing/returns", icon: "purchaseReturns", resource: "purchasing" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    items: [
      { label: "Products", href: "/products", icon: "products", resource: "products" },
      { label: "Stock", href: "/inventory", icon: "inventory", resource: "inventory" },
      { label: "Movements", href: "/inventory/movements", icon: "inventory", resource: "inventory" },
      { label: "Transfers", href: "/inventory/transfers", icon: "deliveries", resource: "inventory" },
      { label: "Adjustments", href: "/inventory/adjustments", icon: "reports", resource: "inventory" },
      { label: "Reservations", href: "/inventory/reservations", icon: "orders", resource: "inventory" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { label: "Chart of accounts", href: "/finance/accounts", icon: "accounts", resource: "finance" },
      { label: "Journal", href: "/finance/journal", icon: "journal", resource: "finance" },
      { label: "General ledger", href: "/finance/ledger", icon: "ledger", resource: "finance" },
      { label: "Receivables", href: "/finance/receivables", icon: "receivables", resource: "finance" },
      { label: "Payables", href: "/finance/payables", icon: "payables", resource: "finance" },
      { label: "Payments", href: "/finance/payments", icon: "payments", resource: "finance" },
      { label: "Statements", href: "/finance/statements", icon: "statements", resource: "finance" },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { label: "Employees", href: "/hr/employees", icon: "employees", resource: "hr" },
      { label: "Departments", href: "/hr/departments", icon: "departments", resource: "hr" },
      { label: "Attendance", href: "/hr/attendance", icon: "attendance", resource: "hr" },
      { label: "Leave requests", href: "/hr/leaves", icon: "leaves", resource: "hr" },
      { label: "Payroll", href: "/hr/payroll", icon: "payroll", resource: "hr" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { label: "Users", href: "/users", icon: "users", resource: "users" },
      { label: "Settings", href: "/settings", icon: "settings", resource: "settings" },
      { label: "Audit trail", href: "/settings/audit", icon: "audit", resource: "audit" },
    ],
  },
];
