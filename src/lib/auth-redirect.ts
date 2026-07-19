import { ROUTE_ROLES, homeForRole, isRoleId, type RoleId } from "@/lib/rbac";

const AUTH_PATHS = new Set(["/login", "/login/pin"]);

export function safeInternalNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;

  const pathname = next.split(/[?#]/, 1)[0] || "/";
  if (AUTH_PATHS.has(pathname)) return null;

  return next;
}

function protectedRouteForPath(pathname: string): keyof typeof ROUTE_ROLES | null {
  const routes = Object.keys(ROUTE_ROLES) as Array<keyof typeof ROUTE_ROLES>;
  return routes.find((route) => pathname === route || pathname.startsWith(`${route}/`)) ?? null;
}

function canRoleOpenNextPath(roleId: RoleId, next: string): boolean {
  const pathname = next.split(/[?#]/, 1)[0] || "/";
  const protectedRoute = protectedRouteForPath(pathname);
  if (!protectedRoute) return true;

  return ROUTE_ROLES[protectedRoute].includes(roleId);
}

export function resolveAuthEntryPath(roleId: string | null | undefined): string {
  if (!roleId) return "/login";
  return isRoleId(roleId) ? homeForRole(roleId) : "/login";
}

export function resolvePostLoginPath(roleId: string | null | undefined, next: string | null | undefined): string {
  const safeNext = safeInternalNextPath(next);
  if (safeNext && isRoleId(roleId) && canRoleOpenNextPath(roleId, safeNext)) return safeNext;

  return resolveAuthEntryPath(roleId);
}

export function loginPathWithNext(next: string | null | undefined): string {
  const safeNext = safeInternalNextPath(next);
  return safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login";
}
