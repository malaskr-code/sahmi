import { requireUser } from "@/lib/auth";
import { AccountEmpty } from "@/components/AccountEmpty";

export default async function PortfolioPage() {
  await requireUser("/portfolio");
  return <AccountEmpty kind="portfolio" />;
}
