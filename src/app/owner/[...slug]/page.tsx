import { notFound } from "next/navigation";
import { ownerLabelForPath } from "@/components/owner/nav";
import { renderOwnerPage } from "../renderOwnerPage";

export default async function OwnerSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const pathname = `/owner/${slug.join("/")}`;
  const label = ownerLabelForPath(pathname);
  if (!label) notFound();
  return renderOwnerPage(label, pathname);
}
