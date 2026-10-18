import RedeemClient from "@/components/commerce/RedeemClient";

export default async function GiftRedeemPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RedeemClient code={code} />;
}
