"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/product-types";
import { formatKwd } from "@/lib/products";

type ScrollMorphHeroProps = {
  lang: "en" | "ar";
  dark: boolean;
};

const MIN_CARDS = 12;
const MAX_CARDS = 20;
const CARD_SIZE = 64;

export default function ScrollMorphHero({ lang, dark }: ScrollMorphHeroProps) {
  const isArabic = lang === "ar";
  const reduceMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [introComplete, setIntroComplete] = useState(reduceMotion);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => setSize(Math.min(node.clientWidth, node.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) setIntroComplete(true);
  }, [reduceMotion]);

  const cardProducts = useMemo(() => {
    const activeCompanies = products.slice(0, MAX_CARDS);
    if (!activeCompanies.length) return [];
    const cardCount = Math.max(MIN_CARDS, activeCompanies.length);
    return Array.from({ length: Math.min(MAX_CARDS, cardCount) }, (_, index) => activeCompanies[index % activeCompanies.length]);
  }, [products]);

  useEffect(() => {
    if (reduceMotion || !size || !cardProducts.length) return;
    const timer = window.setTimeout(() => setIntroComplete(true), 3000);
    return () => window.clearTimeout(timer);
  }, [cardProducts.length, reduceMotion, size]);

  const positions = useMemo(() => {
    if (!size || !cardProducts.length) return [];
    const center = size / 2;
    const radius = size * 0.35;
    const lineSpacing = cardProducts.length > 1 ? (size - CARD_SIZE) / (cardProducts.length - 1) : 0;
    return cardProducts.map((_, index) => {
      const angle = (index / cardProducts.length) * Math.PI * 2 - Math.PI / 2;
      const seed = index + 1;
      const scatterX = ((seed * 47) % 181) - 90;
      const scatterY = ((seed * 73) % 181) - 90;
      return {
        circle: {
          x: center + Math.cos(angle) * radius - CARD_SIZE / 2,
          y: center + Math.sin(angle) * radius - CARD_SIZE / 2,
        },
        line: {
          x: center + (index - (cardProducts.length - 1) / 2) * lineSpacing - CARD_SIZE / 2,
          y: center - CARD_SIZE / 2,
        },
        scatter: { x: center + scatterX - CARD_SIZE / 2, y: center + scatterY - CARD_SIZE / 2 },
      };
    });
  }, [cardProducts, size]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: Math.max(-20, Math.min(20, (event.clientX - bounds.left - bounds.width / 2) / bounds.width * 40)),
      y: Math.max(-20, Math.min(20, (event.clientY - bounds.top - bounds.height / 2) / bounds.height * 40)),
    });
  };

  const handlePointerLeave = () => {
    setPointer({ x: 0, y: 0 });
  };

  if (loadState === "error" || (loadState === "loaded" && !cardProducts.length)) return null;

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full overflow-visible"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      dir={isArabic ? "rtl" : "ltr"}
      role="group"
      aria-label={isArabic ? "شعارات الشركات وأسعارها" : "Company logos and prices"}
    >
      {loadState === "loading" ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C9A227]/25"
          aria-hidden="true"
        />
      ) : null}
      <motion.div
        className="absolute inset-0"
        animate={{
          x: reduceMotion ? 0 : pointer.x,
          y: reduceMotion ? 0 : pointer.y,
          rotate: reduceMotion || !introComplete ? 0 : 360,
        }}
        transition={{
          x: { type: "spring", stiffness: 45, damping: 18 },
          y: { type: "spring", stiffness: 45, damping: 18 },
          rotate: introComplete && !reduceMotion
            ? { duration: 40, ease: "linear", repeat: Infinity }
            : { duration: 0 },
        }}
        style={{ transformOrigin: "50% 50%" }}
      >
        {positions.map((position, index) => {
          const started = reduceMotion || introComplete;
          const product = cardProducts[index];
          const name = (isArabic ? product.nameAr : product.name) || product.ticker;
          const cardShadow = dark
            ? "0 8px 20px rgba(201, 162, 39, 0.26)"
            : "0 8px 18px rgba(27, 42, 68, 0.16)";
          const changeColor = product.change >= 0 ? "#36C77B" : "#F06B72";
          const rotation = reduceMotion || !introComplete ? 0 : -360;
          return (
            <motion.div
              key={`${product.id}-${index}`}
              className="absolute h-16 w-16 [perspective:800px]"
              style={{ left: 0, top: 0 }}
              initial={reduceMotion ? { ...position.circle, opacity: 1 } : { ...position.scatter, opacity: 0 }}
              animate={started
                ? { ...position.circle, opacity: 1, rotate: rotation }
                : { ...position.line, opacity: 1, rotate: 0 }}
              transition={reduceMotion
                ? { duration: 0 }
                : started
                  ? {
                      x: { type: "spring", stiffness: 72, damping: 18, delay: index * 0.045 },
                      y: { type: "spring", stiffness: 72, damping: 18, delay: index * 0.045 },
                      opacity: { duration: 0.4, delay: index * 0.045 },
                      rotate: introComplete
                        ? { duration: 40, ease: "linear", repeat: Infinity }
                        : { duration: 0 },
                    }
                  : { type: "spring", stiffness: 68, damping: 16, delay: index * 0.055 }}
              onAnimationComplete={() => {
                if (index === positions.length - 1 && !reduceMotion) setIntroComplete(true);
              }}
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
                    className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl border border-[#C9A227] bg-[#FBF8F1] p-1"
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
      </motion.div>
    </div>
  );
}
