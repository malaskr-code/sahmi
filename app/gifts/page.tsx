import { requireUser } from "@/lib/auth";
import GiftsClient from "@/components/commerce/GiftsClient";

export default async function GiftsPage() {
  await requireUser("/gifts");
  return <GiftsClient />;
}
