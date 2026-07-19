/**
 * Server-side session + authorization helpers.
 *
 * This is the AUTHORITATIVE identity check (PRD FR-002, BR-010, §20.4).
 * Middleware only does a cheap cookie-existence redirect; every server
 * component / action / route that trusts identity or role MUST call one of
 * these, because they re-validate the session against the DB via better-auth
 * and load the canonical roleId + outlet scope from our own tables.
 *
 * `cookies()`/`headers()` are async in Next 16 — always await them.
 */
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, userOutlets, rolePermissions, permissions } from "@/db/schema";
import { ROUTE_ROLES, homeForRole, type RoleId } from "@/lib/rbac";

export interface AppSession {
  userId: string;
  name: string;
  username: string | null;
  email: string;
  roleId: RoleId;
  /** outlet ids this user may access (BR-010) */
  outletIds: string[];
}

/**
 * Resolve the current session or null. Re-validates server-side via better-auth,
 * then loads roleId + outlet scope from our canonical tables. Never trusts a
 * client-supplied role.
 */
export async function getAppSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const row = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      roleId: users.roleId,
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();

  // User deleted or deactivated after the cookie was issued — treat as no session.
  if (!row || !row.active) return null;

  const outlets = await db
    .select({ outletId: userOutlets.outletId })
    .from(userOutlets)
    .where(eq(userOutlets.userId, row.id))
    .all();

  return {
    userId: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    roleId: row.roleId as RoleId,
    outletIds: outlets.map((o) => o.outletId),
  };
}

/** Require any authenticated session; redirect to /login otherwise. */
export async function requireSession(returnTo?: string): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }
  return session;
}

/**
 * Require a session whose role is allowed on `route` (per ROUTE_ROLES).
 * Unauthenticated → /login; wrong role → that role's own home (not a 403 dead
 * end, so a mis-navigated user lands somewhere useful).
 */
export async function requireRoute(route: keyof typeof ROUTE_ROLES): Promise<AppSession> {
  const session = await requireSession(route);
  const allowed = ROUTE_ROLES[route];
  if (!allowed.includes(session.roleId)) {
    redirect(homeForRole(session.roleId));
  }
  return session;
}

// ===== Permission checks (RBAC, FR-002) =====
//
// Permissions live in the hand-rolled roles/permissions/rolePermissions tables
// (AGENTS.md), keyed off the session's roleId. Loaded on demand — a session
// doesn't carry its permission set, so callers that gate on a permission query
// for it explicitly. A server action/mutation is the authoritative gate; the UI
// hiding a button is only cosmetic.

/** All permission keys granted to `roleId` (via rolePermissions). */
export async function loadPermissions(roleId: string): Promise<string[]> {
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId))
    .all();
  return rows.map((r) => r.key);
}

/** Thrown when an authenticated user lacks a required permission. */
export class PermissionError extends Error {
  constructor(public readonly permission: string) {
    super(`Akses ditolak: butuh izin "${permission}".`);
    this.name = "PermissionError";
  }
}

/** True if the current session's role holds `permission`. */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getAppSession();
  if (!session) return false;
  const keys = await loadPermissions(session.roleId);
  return keys.includes(permission);
}

/**
 * Require the current session to hold `permission`, else throw. Use at the top
 * of every catalog/admin server action — this is the real enforcement point,
 * not the UI. Returns the session so callers can reuse identity/outlet scope.
 */
export async function requirePermission(permission: string): Promise<AppSession> {
  const session = await requireSession();
  const keys = await loadPermissions(session.roleId);
  if (!keys.includes(permission)) {
    throw new PermissionError(permission);
  }
  return session;
}

// ===== Outlet-scope enforcement (BR-010, §20.4) =====
//
// The pure primitives live in `outlet-scope.ts` (no server-only import, so they
// are unit-testable). Re-exported here so callers get one import surface: an
// AppSession satisfies the `OutletScoped` shape they expect. These are the choke
// point Phase 3+ queries call before reading/writing any outlet-scoped row.
export {
  OutletScopeError,
  canAccessOutlet,
  assertOutletAccess,
  scopedOutletIds,
} from "@/lib/outlet-scope";
