/**
 * PIN fast-login route (PRD §8.1). Server shell: bounce authenticated users to
 * their role home, else render the PIN pad form.
 */
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { homeForRole } from "@/lib/rbac";
import { PinForm } from "./PinForm";

export default async function PinLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAppSession();
  if (session) redirect(homeForRole(session.roleId));

  const { next } = await searchParams;
  return <PinForm next={next} />;
}
