import { requireUser } from "@/lib/auth";
import PortfolioClient from "@/components/commerce/PortfolioClient";

export default async function PortfolioPage() {
  await requireUser("/portfolio");
  return <PortfolioClient />;
}
