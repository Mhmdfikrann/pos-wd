/**
 * Login route (PRD §8.1, FR-001). Server component: if already authenticated,
 * bounce to the role's home. Otherwise render the client form.
 */
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { homeForRole } from "@/lib/rbac";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAppSession();
  if (session) redirect(homeForRole(session.roleId));

  const { next } = await searchParams;
  return <LoginForm next={next} />;
}
