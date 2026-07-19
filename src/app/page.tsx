import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { resolveAuthEntryPath } from "@/lib/auth-redirect";

export default async function Home() {
  const session = await getAppSession();
  redirect(resolveAuthEntryPath(session?.roleId));
}
