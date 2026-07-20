import { redirect } from "next/navigation";
import { DEFAULT_OWNER_PATH } from "@/components/owner/nav";

export default async function OwnerPage() {
  redirect(DEFAULT_OWNER_PATH);
}
