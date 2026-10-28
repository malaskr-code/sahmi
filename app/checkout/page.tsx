import { requireUser } from "@/lib/auth";
import CheckoutClient from "@/components/commerce/CheckoutClient";
import { CARD_THEME_IDS, type CardThemeId } from "@/data/cardThemes";
import { quantityToMilli } from "@/lib/metal-units";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawProductId = typeof params.buyNow === "string" ? params.buyNow : "";
  const rawShares = typeof params.shares === "string" ? Number(params.shares) : 0;
  const rawTheme = typeof params.theme === "string" ? params.theme : "general";
  const buyNow = /^[a-zA-Z0-9_-]{1,100}$/.test(rawProductId)
    && quantityToMilli(rawShares) !== null
    && CARD_THEME_IDS.includes(rawTheme as CardThemeId)
    ? { productId: rawProductId, shares: rawShares, theme: rawTheme as CardThemeId }
    : null;
  const returnTo = buyNow
    ? `/checkout?buyNow=${encodeURIComponent(buyNow.productId)}&shares=${buyNow.shares}&theme=${encodeURIComponent(buyNow.theme)}`
    : "/checkout";
  await requireUser(returnTo);
  return <CheckoutClient buyNow={buyNow} />;
}
