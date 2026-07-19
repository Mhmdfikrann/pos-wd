/**
 * Role-based access control constants and helpers (PRD §6).
 *
 * The hand-rolled RBAC layer is the source of truth for authorization — NOT the
 * better-auth admin plugin. Role ids match the seed (src/db/seed.ts) and the
 * `roles.id` column. Authorization is always resolved server-side off
 * `users.roleId`; nothing here should run based on client-supplied role claims.
 */

/** Canonical role ids — must match seeded `roles.id`. */
export const ROLE = {
  OWNER: "role_owner",
  MANAGER: "role_manager",
  KASIR: "role_kasir",
  KITCHEN: "role_kitchen",
  INVENTORY: "role_inventory",
} as const;

export type RoleId = (typeof ROLE)[keyof typeof ROLE];

/** Landing route for each role after login (also the guard's redirect target). */
export const ROLE_HOME: Record<RoleId, string> = {
  [ROLE.OWNER]: "/owner",
  [ROLE.MANAGER]: "/manager",
  [ROLE.KASIR]: "/kasir",
  [ROLE.KITCHEN]: "/kitchen",
  [ROLE.INVENTORY]: "/inventory",
};

/** Human labels (Indonesian) for UI. */
export const ROLE_LABEL: Record<RoleId, string> = {
  [ROLE.OWNER]: "Owner",
  [ROLE.MANAGER]: "Manager Outlet",
  [ROLE.KASIR]: "Kasir",
  [ROLE.KITCHEN]: "Tim Dapur",
  [ROLE.INVENTORY]: "Staf Inventory",
};

/**
 * Which roles may access each role-shell route. Owner can see everything;
 * Manager oversees the operational floor (kasir/kitchen/inventory) plus its own
 * shell. Each screen still enforces this server-side (see requireRole).
 */
export const ROUTE_ROLES: Record<string, RoleId[]> = {
  "/owner": [ROLE.OWNER],
  "/manager": [ROLE.OWNER, ROLE.MANAGER],
  "/kasir": [ROLE.OWNER, ROLE.MANAGER, ROLE.KASIR],
  "/kitchen": [ROLE.OWNER, ROLE.MANAGER, ROLE.KITCHEN],
  "/inventory": [ROLE.OWNER, ROLE.MANAGER, ROLE.INVENTORY],
};

export function isRoleId(value: string | null | undefined): value is RoleId {
  return value != null && Object.values(ROLE).includes(value as RoleId);
}

/** Safe home path for a (possibly unknown) role id; falls back to root auth routing. */
export function homeForRole(roleId: string | null | undefined): string {
  return isRoleId(roleId) ? ROLE_HOME[roleId] : "/";
}
