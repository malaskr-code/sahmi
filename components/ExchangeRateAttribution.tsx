import { useStore } from "@/lib/store";

export function ExchangeRateAttribution() {
  const { lang } = useStore();
  return (
    <a
      href="https://www.exchangerate-api.com"
      target="_blank"
      rel="noreferrer"
      className="inline-block text-[10px] text-[var(--muted)] underline underline-offset-2 hover:text-[var(--gold-dark)]"
    >
      {lang === "ar" ? "أسعار الصرف من ExchangeRate" : "Exchange rates by ExchangeRate"}
    </a>
  );
}
