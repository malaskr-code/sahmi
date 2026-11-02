"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Gift } from "lucide-react";
import type { Product } from "@/lib/product-types";
import { formatKwd } from "@/lib/products";

type ScrollMorphHeroProps = {
  lang: "en" | "ar";
  dark: boolean;
};

const MIN_CARDS = 12;
const CARD_COUNT = 12;
const PHASE_DURATIONS = {
  grid: 10_000,
  stacking: 800,
  morphing: 600,
  gift: 3_000,
  fading: 500,
  returning: 600,
} as const;

type CyclePhase = keyof typeof PHASE_DURATIONS;
type StackOffset = { x: number; y: number };

export default function ScrollMorphHero({ lang, dark }: ScrollMorphHeroProps) {
  const isArabic = lang === "ar";
  const reduceMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const phaseRemaining = useRef<number | null>(null);
  const previousPhase = useRef<CyclePhase>("grid");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [phase, setPhase] = useState<CyclePhase>("grid");
  const [cycleCompanyIndex, setCycleCompanyIndex] = useState(0);
  const [gridIntroComplete, setGridIntroComplete] = useState(reduceMotion);
  const [gridHovered, setGridHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [stackOffsets, setStackOffsets] = useState<StackOffset[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/products", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Products request failed");
        const rows = await response.json() as Product[];
        setProducts(rows.filter(product => product.type === "share" && product.id && product.ticker));
        setLoadState("loaded");
      }).catch(() => {
        if (!controller.signal.aborted) setLoadState("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setPhase("grid");
      setGridIntroComplete(true);
    }
  }, [reduceMotion]);

  const cardProducts = useMemo(() => {
    const activeCompanies = products.slice(0, CARD_COUNT);
    if (!activeCompanies.length) return [];
    return Array.from({ length: MIN_CARDS }, (_, index) => activeCompanies[index % activeCompanies.length]);
  }, [products]);

  const prepareStackOffsets = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const centerX = container.getBoundingClientRect().left + container.getBoundingClientRect().width / 2;
    const centerY = container.getBoundingClientRect().top + container.getBoundingClientRect().height / 2;
    const offsets = cardProducts.map((_, index) => {
      const card = cardRefs.current[index];
      if (!card) return { x: 0, y: 0 };
      const bounds = card.getBoundingClientRect();
      return {
        x: centerX - (bounds.left + bounds.width / 2),
        y: centerY - (bounds.top + bounds.height / 2),
      };
    });
    setStackOffsets(offsets);
  }, [cardProducts]);

  useEffect(() => {
    if (previousPhase.current !== phase) {
      previousPhase.current = phase;
      phaseRemaining.current = null;
    }
    if (loadState !== "loaded" || !cardProducts.length || reduceMotion || !isVisible || (phase === "grid" && (gridHovered || !gridIntroComplete))) return;

    const duration = phaseRemaining.current ?? PHASE_DURATIONS[phase];
    const startedAt = performance.now();
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      phaseRemaining.current = null;
      switch (phase) {
        case "grid":
          prepareStackOffsets();
          setPhase("stacking");
          break;
        case "stacking":
          setPhase("morphing");
          break;
        case "morphing":
          setPhase("gift");
          break;
        case "gift":
          setPhase("fading");
          break;
        case "fading":
          setPhase("returning");
          break;
        case "returning":
          setCycleCompanyIndex(index => (index + 1) % cardProducts.length);
          setPhase("grid");
          break;
      }
    }, duration);

    return () => {
      window.clearTimeout(timer);
      if (!completed) {
        phaseRemaining.current = Math.max(0, duration - (performance.now() - startedAt));
      }
    };
  }, [cardProducts.length, gridHovered, gridIntroComplete, isVisible, loadState, phase, prepareStackOffsets, reduceMotion]);

  if (loadState === "error" || (loadState === "loaded" && !cardProducts.length)) return null;

  const giftCompany = cardProducts[cycleCompanyIndex];
  const giftCompanyName = giftCompany
    ? ((isArabic ? giftCompany.nameAr : giftCompany.name) || giftCompany.ticker)
    : "";
  const showGiftCard = phase === "morphing" || phase === "gift" || phase === "fading";
  const giftCardBackground = dark ? "#1B2A44" : "#FBF8F1";
  const giftCardText = dark ? "#D8B84A" : "#1B2A44";
  const gridUnavailable = phase !== "grid";
  const qrSquares = [0, 1, 2, 4, 5, 7, 8, 10, 12, 13, 15, 17, 18, 20, 21, 23, 24];

  return (
    <div
      ref={containerRef}
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
        <div
          ref={gridRef}
          className={`grid w-max grid-cols-4 gap-3.5 md:gap-5 ${gridUnavailable ? "pointer-events-none" : ""}`}
          onMouseEnter={() => setGridHovered(true)}
          onMouseLeave={() => setGridHovered(false)}
          aria-hidden={gridUnavailable}
        >
          {cardProducts.map((product, index) => {
            const name = (isArabic ? product.nameAr : product.name) || product.ticker;
            const cardShadow = dark
              ? "0 8px 20px rgba(201, 162, 39, 0.26)"
              : "0 8px 18px rgba(27, 42, 68, 0.16)";
            const changeColor = product.change >= 0 ? "#36C77B" : "#F06B72";
            const offset = stackOffsets[index] ?? { x: 0, y: 0 };
            const stacking = phase === "stacking" || phase === "morphing" || phase === "gift" || phase === "fading";
            const returning = phase === "returning";
            const cardOpacity = phase === "morphing" || phase === "gift" || phase === "fading" ? 0 : 1;
            const scatterSeed = index + 1;
            const cardTransition = reduceMotion
              ? { duration: 0 }
              : phase === "grid"
                ? { type: "spring" as const, stiffness: 150, damping: 19, delay: index * 0.035 }
                : phase === "stacking"
                  ? { duration: 0.8, ease: [0.22, 0.7, 0.2, 1] as [number, number, number, number] }
                  : phase === "morphing"
                    ? { duration: 0.6, ease: "easeInOut" as const }
                    : returning
                      ? { duration: 0.6, ease: "easeOut" as const, delay: index * 0.02 }
                      : { duration: 0 };

            return (
              <motion.div
                key={`${product.id}-${index}`}
                ref={element => { cardRefs.current[index] = element; }}
                className="relative h-[52px] w-[52px] [perspective:800px] md:h-16 md:w-16"
                initial={reduceMotion ? false : { x: ((scatterSeed * 47) % 81) - 40, y: ((scatterSeed * 73) % 81) - 40, opacity: 0 }}
                animate={{
                  x: phase === "grid" || returning ? 0 : offset.x,
                  y: phase === "grid" || returning ? 0 : offset.y,
                  rotate: stacking ? (index - (cardProducts.length - 1) / 2) * 2 : 0,
                  scale: phase === "morphing" ? 0.72 : 1,
                  opacity: cardOpacity,
                }}
                transition={cardTransition}
                style={{ zIndex: stacking ? index + 1 : "auto" }}
                onAnimationComplete={() => {
                  if (index === cardProducts.length - 1 && phase === "grid") setGridIntroComplete(true);
                }}
              >
                <Link
                  href={`/products/${encodeURIComponent(product.id)}`}
                  className="block h-full w-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2"
                  aria-label={`${name} (${product.ticker})`}
                  tabIndex={gridUnavailable ? -1 : 0}
                >
                  <motion.span
                    className="relative block h-full w-full rounded-xl"
                    whileHover={gridUnavailable ? undefined : { rotateY: 180, scale: 1.06 }}
                    whileFocus={gridUnavailable ? undefined : { rotateY: 180, scale: 1.06 }}
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
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        initial={false}
        animate={{
          opacity: showGiftCard ? 1 : 0,
          scale: phase === "morphing" || phase === "gift" ? 1 : 0.72,
        }}
        transition={reduceMotion
          ? { duration: 0 }
          : phase === "morphing"
            ? { duration: 0.6, ease: [0.22, 0.7, 0.2, 1] }
            : phase === "fading"
              ? { duration: 0.5, ease: "easeIn" }
              : { duration: 0 }}
        aria-hidden={!showGiftCard}
      >
        {giftCompany ? (
          <div
            dir={isArabic ? "rtl" : "ltr"}
            className="flex aspect-[300/190] w-full max-w-[300px] flex-col rounded-2xl border border-[#C9A227] p-4 shadow-[0_18px_44px_rgba(27,42,68,0.22)] md:p-5"
            style={{ backgroundColor: giftCardBackground, color: giftCardText }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-xl font-semibold leading-none">Sahmi</div>
                <div className="mt-1 text-[10px] leading-none">سهمي</div>
              </div>
              <Gift size={18} strokeWidth={1.8} className="text-[#C9A227]" />
            </div>
            <div className="flex min-h-0 flex-1 items-center gap-3 py-2">
              {giftCompany.image ? (
                <img
                  src={giftCompany.image}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg object-contain"
                  draggable={false}
                />
              ) : (
                <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#C9A227]/40 text-[10px] font-bold text-[#C9A227]">
                  {giftCompany.ticker}
                </span>
              )}
              <p className="font-display line-clamp-2 text-xs font-semibold leading-snug md:text-sm">
                {isArabic ? `10 أسهم في ${giftCompanyName}` : `10 shares of ${giftCompanyName}`}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-display text-xs font-semibold text-[#C9A227]">
                {isArabic ? "عيد مبارك" : "Happy Eid"}
              </span>
              <span
                className="grid h-8 w-8 grid-cols-5 content-center gap-[2px] rounded bg-white p-1"
                aria-label={isArabic ? "رمز QR تجريبي" : "QR placeholder"}
              >
                {Array.from({ length: 25 }, (_, index) => (
                  <span key={index} className={`h-[3px] w-[3px] ${qrSquares.includes(index) ? "bg-[#737373]" : "bg-[#D4D4D4]"}`} />
                ))}
              </span>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
