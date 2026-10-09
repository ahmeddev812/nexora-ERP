/**
 * NEXORA role and permission matrix.
 *
 * Roles: owner · admin · manager · cashier · accountant · viewer
 * `can()` is the single source of truth. The UI hides or disables what it
 * denies, and the action layer calls the exact same check before mutating.
 */

import type { Action, Permission, Resource, Role } from "@/types/erp";
import { generateId } from "./id";

export const ROLES: Role[] = [
  "owner",
  "admin",
  "manager",
  "cashier",
  "accountant",
  "viewer",
];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  accountant: "Accountant",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full control of the workspace, including users, settings and data reset.",
  admin: "Everything except ownership transfer and destructive reset.",
  manager: "Runs sales, purchasing and inventory. Read-only on finance and HR.",
  cashier: "Day-to-day counter work: sales documents, customers and stock lookups.",
  accountant: "Books, journals, payments, statements and payroll. No operational deletes.",
  viewer: "Read-only access across every module. No exports, no edits.",
};

export const RESOURCES: Resource[] = [
  "dashboard",
  "analytics",
  "customers",
  "suppliers",
  "products",
  "categories",
  "units",
  "warehouses",
  "branches",
  "inventory",
  "sales",
  "purchasing",
  "finance",
  "hr",
  "reports",
  "search",
  "users",
  "settings",
  "audit",
];

export const ACTIONS: Action[] = [
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "manage",
];

type Grant = "all" | Action[];
type RoleMatrix = Partial<Record<Resource, Grant>>;

const VIEW_ALL: RoleMatrix = Object.fromEntries(
  RESOURCES.map((resource) => [resource, ["view"] as Action[]]),
) as RoleMatrix;

const OPERATIONAL_FULL: Resource[] = [
  "customers",
  "suppliers",
  "products",
  "categories",
  "units",
  "warehouses",
  "branches",
  "inventory",
  "sales",
  "purchasing",
];

function matrixFrom(entries: Array<[Resource, Grant]>): RoleMatrix {
  return Object.fromEntries(entries) as RoleMatrix;
}

const OWNER_MATRIX: RoleMatrix = Object.fromEntries(
  RESOURCES.map((resource) => [resource, "all" as Grant]),
) as RoleMatrix;

const ADMIN_MATRIX: RoleMatrix = OWNER_MATRIX;

const MANAGER_MATRIX: RoleMatrix = matrixFrom([
  ["dashboard", ["view"]],
  ["analytics", ["view"]],
  ["search", ["view"]],
  ["customers", ["view", "create", "update", "delete", "export"]],
  ["suppliers", ["view", "create", "update", "delete", "export"]],
  ["products", ["view", "create", "update", "delete", "export"]],
  ["categories", ["view", "create", "update", "delete"]],
  ["units", ["view", "create", "update", "delete"]],
  ["warehouses", ["view", "create", "update"]],
  ["branches", ["view", "create", "update"]],
  ["inventory", ["view", "create", "update", "approve", "export"]],
  ["sales", ["view", "create", "update", "delete", "approve", "export"]],
  ["purchasing", ["view", "create", "update", "delete", "approve", "export"]],
  ["finance", ["view", "export"]],
  ["hr", ["view", "export"]],
  ["reports", ["view", "export"]],
  ["users", ["view"]],
  ["settings", ["view"]],
  ["audit", ["view"]],
]);

const CASHIER_MATRIX: RoleMatrix = matrixFrom([
  ["dashboard", ["view"]],
  ["search", ["view"]],
  ["customers", ["view", "create", "update"]],
  ["suppliers", ["view"]],
  ["products", ["view"]],
  ["categories", ["view"]],
  ["units", ["view"]],
  ["warehouses", ["view"]],
  ["branches", ["view"]],
  ["inventory", ["view"]],
  ["sales", ["view", "create", "update"]],
  ["purchasing", ["view"]],
  ["finance", ["view"]],
  ["reports", ["view"]],
]);

const ACCOUNTANT_MATRIX: RoleMatrix = matrixFrom([
  ["dashboard", ["view"]],
  ["analytics", ["view"]],
  ["search", ["view"]],
  ["customers", ["view", "create", "update", "export"]],
  ["suppliers", ["view", "create", "update", "export"]],
  ["products", ["view", "create", "update", "export"]],
  ["categories", ["view"]],
  ["units", ["view"]],
  ["warehouses", ["view"]],
  ["branches", ["view"]],
  ["inventory", ["view", "export"]],
  ["sales", ["view", "create", "update", "export"]],
  ["purchasing", ["view", "create", "update", "export"]],
  ["finance", ["view", "create", "update", "approve", "export"]],
  ["hr", ["view", "create", "update", "approve", "export"]],
  ["reports", ["view", "export"]],
  ["users", ["view"]],
  ["settings", ["view"]],
  ["audit", ["view"]],
]);

const VIEWER_MATRIX: RoleMatrix = VIEW_ALL;

export const ROLE_MATRIX: Record<Role, RoleMatrix> = {
  owner: OWNER_MATRIX,
  admin: ADMIN_MATRIX,
  manager: MANAGER_MATRIX,
  cashier: CASHIER_MATRIX,
  accountant: ACCOUNTANT_MATRIX,
  viewer: VIEWER_MATRIX,
};

/** Exportable operational resources (used by CSV export guards). */
export const OPERATIONAL_RESOURCES: Resource[] = OPERATIONAL_FULL;

type ActorLike = Role | { role: Role } | null | undefined;

function roleOf(actor: ActorLike): Role | null {
  if (!actor) return null;
  if (typeof actor === "string") return actor;
  return actor.role ?? null;
}

export function can(
  actor: ActorLike,
  action: Action,
  resource: Resource,
): boolean {
  const role = roleOf(actor);
  if (!role) return false;

  const grant = ROLE_MATRIX[role]?.[resource];
  if (!grant) return false;
  if (grant === "all") return true;
  return grant.includes(action);
}

export function canAll(
  actor: ActorLike,
  actions: readonly Action[],
  resource: Resource,
): boolean {
  return actions.every((action) => can(actor, action, resource));
}

export function canAny(
  actor: ActorLike,
  actions: readonly Action[],
  resource: Resource,
): boolean {
  return actions.some((action) => can(actor, action, resource));
}

export function resourcesForRole(role: Role): Resource[] {
  return RESOURCES.filter((resource) => can(role, "view", resource));
}

export function actionsForRole(role: Role, resource: Resource): Action[] {
  const grant = ROLE_MATRIX[role]?.[resource];
  if (!grant) return [];
  if (grant === "all") return [...ACTIONS];
  return grant.filter((action) => ACTIONS.includes(action));
}

/** Materializes the matrix into Permission records (persisted reference data). */
export function permissionsForRole(role: Role): Permission[] {
  return RESOURCES.map((resource) => ({
    id: generateId("perm"),
    resource,
    actions: actionsForRole(role, resource),
    roles: [role],
  })).filter((permission) => permission.actions.length > 0);
}

export function isRestrictedPayrollRole(role: Role): boolean {
  return role === "owner" || role === "admin" || role === "accountant";
}
