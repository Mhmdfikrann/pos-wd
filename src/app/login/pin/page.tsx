import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { loginPathWithNext, resolvePostLoginPath } from "@/lib/auth-redirect";

export default async function PinLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getAppSession();

  if (session) redirect(resolvePostLoginPath(session.roleId, next));

  redirect(loginPathWithNext(next));
}
