import { requireUser } from "@/lib/auth";
import { AccountEmpty } from "@/components/AccountEmpty";

export default async function GiftsPage() {
  await requireUser("/gifts");
  return <AccountEmpty kind="gifts" />;
}
