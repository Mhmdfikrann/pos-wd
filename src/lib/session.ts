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
import { users, userOutlets } from "@/db/schema";
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
