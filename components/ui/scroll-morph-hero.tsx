"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/product-types";
import { formatKwd } from "@/lib/products";

type ScrollMorphHeroProps = {
  lang: "en" | "ar";
  dark: boolean;
};

const MIN_CARDS = 12;
const CARD_COUNT = 12;

export default function ScrollMorphHero({ lang, dark }: ScrollMorphHeroProps) {
  const isArabic = lang === "ar";
  const reduceMotion = useReducedMotion() ?? false;
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/products", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Products request failed");
        const rows = await response.json() as Product[];
        setProducts(rows.filter(product => product.type === "share" && product.id && product.ticker));
        setLoadState("loaded");
      })
      .catch(error => {
        if (!controller.signal.aborted) setLoadState("error");
      });
    return () => controller.abort();
  }, []);

  const cardProducts = useMemo(() => {
    const activeCompanies = products.slice(0, CARD_COUNT);
    if (!activeCompanies.length) return [];
    return Array.from({ length: MIN_CARDS }, (_, index) => activeCompanies[index % activeCompanies.length]);
  }, [products]);

  if (loadState === "error" || (loadState === "loaded" && !cardProducts.length)) return null;

  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-visible"
      dir={isArabic ? "rtl" : "ltr"}
      role="group"
      aria-label={isArabic ? "شعارات الشركات وأسعارها" : "Company logos and prices"}
    >
      {loadState === "loading" ? (
        <div
          className="pointer-events-none grid w-max grid-cols-4 gap-3.5 opacity-30 md:gap-5"
          aria-hidden="true"
        >
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <span key={index} className="h-[52px] w-[52px] rounded-xl border border-[#C9A227] bg-[#FBF8F1] md:h-16 md:w-16" />
          ))}
        </div>
      ) : null}
      {loadState === "loaded" ? (
        <div className="grid w-max grid-cols-4 gap-3.5 md:gap-5">
        {cardProducts.map((product, index) => {
          const name = (isArabic ? product.nameAr : product.name) || product.ticker;
          const cardShadow = dark
            ? "0 8px 20px rgba(201, 162, 39, 0.26)"
            : "0 8px 18px rgba(27, 42, 68, 0.16)";
          const changeColor = product.change >= 0 ? "#36C77B" : "#F06B72";
          const seed = index + 1;
          return (
            <motion.div
              key={`${product.id}-${index}`}
              className="relative h-[52px] w-[52px] [perspective:800px] md:h-16 md:w-16"
              initial={reduceMotion ? false : { x: ((seed * 47) % 81) - 40, y: ((seed * 73) % 81) - 40, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 150, damping: 19, delay: index * 0.035 }}
            >
              <Link
                href={`/products/${encodeURIComponent(product.id)}`}
                className="block h-full w-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2"
                aria-label={`${name} (${product.ticker})`}
              >
                <motion.span
                  className="relative block h-full w-full rounded-xl"
                  whileHover={{ rotateY: 180, scale: 1.06 }}
                  whileFocus={{ rotateY: 180, scale: 1.06 }}
                  transition={{ duration: 0.55, ease: [0.22, 0.7, 0.2, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <span
                    className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl border border-[#C9A227] bg-[#FBF8F1] p-1.5"
                    style={{ backfaceVisibility: "hidden", boxShadow: cardShadow }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={name}
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <span className="font-display text-xs font-bold text-[#C9A227]">{product.ticker}</span>
                    )}
                  </span>
                  <span
                    className="font-display absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border border-[#C9A227] bg-[#1B2A44] px-1 text-center text-[#D8B84A]"
                    style={{ backfaceVisibility: "hidden", boxShadow: cardShadow, transform: "rotateY(180deg)" }}
                    aria-hidden="true"
                  >
                    <span className="line-clamp-2 w-full text-[7px] font-semibold leading-[1.1]">{name}</span>
                    <span dir="ltr" className="mt-0.5 text-[7px] font-bold tracking-wide">{product.ticker}</span>
                    <span dir="ltr" className="mt-0.5 whitespace-nowrap text-[6px] leading-none">{formatKwd(product.price, lang)}</span>
                    <span dir="ltr" className="mt-0.5 text-[7px] font-semibold leading-none" style={{ color: changeColor }}>
                      {product.change >= 0 ? "+" : ""}{product.change.toFixed(2)}%
                    </span>
                  </span>
                </motion.span>
              </Link>
            </motion.div>
          );
        })}
        </div>
      ) : null}
    </div>
  );
}
