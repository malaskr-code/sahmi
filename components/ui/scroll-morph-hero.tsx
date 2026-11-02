"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Gift } from "lucide-react";
import type { Product } from "@/lib/product-types";

type ScrollMorphHeroProps = {
  lang: "en" | "ar";
  dark: boolean;
};

type GiftOccasion = {
  en: string;
  ar: string;
};

type StackCard = {
  product: Product;
  shares: number;
  occasion: GiftOccasion;
  sequence: number;
};

const SHARE_COUNTS = [5, 10, 25, 50, 100];
const OCCASIONS: GiftOccasion[] = [
  { en: "Happy Eid", ar: "عيد مبارك" },
  { en: "Happy Graduation", ar: "مبروك التخرج" },
  { en: "Happy Birthday", ar: "عيد ميلاد سعيد" },
  { en: "Welcome Baby", ar: "مبروك المولود" },
  { en: "Happy Wedding", ar: "مبروك الزواج" },
];
const QR_SQUARES = [0, 1, 2, 4, 5, 7, 8, 10, 12, 13, 15, 17, 18, 20, 21, 23, 24];
const ROTATION_INTERVAL = 4_000;
const FULL_TRANSITION = 600;
const REDUCED_TRANSITION = 250;
const STACK_POSITIONS = [
  { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
  { x: 0, y: 17, scale: 0.95, rotate: 2.5, opacity: 0.68 },
  { x: 0, y: 33, scale: 0.9, rotate: -3.5, opacity: 0.44 },
];

function shuffleCompanies(companies: Product[]) {
  const shuffled = [...companies];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function GiftCardFace({
  card,
  lang,
  dark,
}: {
  card: StackCard;
  lang: "en" | "ar";
  dark: boolean;
}) {
  const isArabic = lang === "ar";
  const companyName = (isArabic ? card.product.nameAr : card.product.name) || card.product.ticker;
  const backgroundColor = dark ? "#1B2A44" : "#FBF8F1";
  const textColor = dark ? "#D8B84A" : "#1B2A44";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="flex h-full w-full flex-col rounded-2xl border border-[#C9A227] p-4 shadow-[0_18px_44px_rgba(27,42,68,0.22)] md:p-5"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-xl font-semibold leading-none">Sahmi</div>
          <div className="mt-1 text-[10px] leading-none">سهمي</div>
        </div>
        <Gift size={18} strokeWidth={1.8} className="text-[#C9A227]" />
      </div>
      <div className="flex min-h-0 flex-1 items-center gap-3 py-2">
        {card.product.image ? (
          <img
            src={card.product.image}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg object-contain"
            draggable={false}
          />
        ) : (
          <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#C9A227]/40 text-[10px] font-bold text-[#C9A227]">
            {card.product.ticker}
          </span>
        )}
        <p className="font-display line-clamp-2 text-xs font-semibold leading-snug md:text-sm">
          {isArabic
            ? `${card.shares} أسهم في ${companyName}`
            : `${card.shares} shares of ${companyName}`}
        </p>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-display text-xs font-semibold text-[#C9A227]">
          {isArabic ? card.occasion.ar : card.occasion.en}
        </span>
        <span
          className="grid h-8 w-8 grid-cols-5 content-center gap-[2px] rounded bg-white p-1"
          aria-label={isArabic ? "رمز QR تجريبي" : "QR placeholder"}
        >
          {Array.from({ length: 25 }, (_, index) => (
            <span
              key={index}
              className={`h-[3px] w-[3px] ${QR_SQUARES.includes(index) ? "bg-[#737373]" : "bg-[#D4D4D4]"}`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export default function ScrollMorphHero({ lang, dark }: ScrollMorphHeroProps) {
  const isArabic = lang === "ar";
  const reduceMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRemaining = useRef<number | null>(null);
  const transitionRemaining = useRef<number | null>(null);
  const [companies, setCompanies] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotationCount, setRotationCount] = useState(0);
  const [stage, setStage] = useState<"idle" | "transition" | "fade-in">("idle");
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/products", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Products request failed");
        const rows = await response.json() as Product[];
        setCompanies(shuffleCompanies(rows.filter(product => product.type === "share" && product.id && product.ticker)));
        setLoadState("loaded");
      })
      .catch(() => {
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
    if (loadState !== "loaded" || !companies.length || !isVisible || isHovered || stage !== "idle") return;

    const duration = rotationRemaining.current ?? ROTATION_INTERVAL;
    const startedAt = performance.now();
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      rotationRemaining.current = null;
      setStage("transition");
    }, duration);

    return () => {
      window.clearTimeout(timer);
      if (!completed) {
        rotationRemaining.current = Math.max(0, duration - (performance.now() - startedAt));
      }
    };
  }, [companies.length, isHovered, isVisible, loadState, stage]);

  useEffect(() => {
    if (stage === "idle" || !isVisible) return;

    const duration = transitionRemaining.current ?? (reduceMotion ? REDUCED_TRANSITION : FULL_TRANSITION);
    const startedAt = performance.now();
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      transitionRemaining.current = null;

      if (stage === "transition") {
        setCurrentIndex(index => (index + 1) % companies.length);
        setRotationCount(count => count + 1);
        setStage(reduceMotion ? "fade-in" : "idle");
      } else {
        setStage("idle");
      }
    }, duration);

    return () => {
      window.clearTimeout(timer);
      if (!completed) {
        transitionRemaining.current = Math.max(0, duration - (performance.now() - startedAt));
      }
    };
  }, [companies.length, isVisible, reduceMotion, stage]);

  const stackCards = useMemo<StackCard[]>(() => {
    if (!companies.length) return [];
    const cardCount = stage === "transition" && !reduceMotion ? 4 : 3;
    return Array.from({ length: cardCount }, (_, offset) => {
      const sequence = rotationCount + offset;
      return {
        product: companies[(currentIndex + offset) % companies.length],
        shares: SHARE_COUNTS[sequence % SHARE_COUNTS.length],
        occasion: OCCASIONS[sequence % OCCASIONS.length],
        sequence,
      };
    });
  }, [companies, currentIndex, reduceMotion, rotationCount, stage]);

  const slideDistance = isArabic ? 150 : -150;
  const keepSpace = loadState === "loading" || loadState === "loaded";

  return (
    <div
      ref={containerRef}
      className="relative flex aspect-square w-full items-center justify-center overflow-visible"
      dir={isArabic ? "rtl" : "ltr"}
      role="group"
      aria-label={isArabic ? "بطاقات هدايا سهمي" : "Sahmi gift cards"}
    >
      {keepSpace && (
        <div
          className="relative aspect-[30/19] w-full max-w-[360px] overflow-visible"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {stackCards.map((card, slot) => {
            const isFront = slot === 0;
            const basePosition = STACK_POSITIONS[Math.min(slot, 2)];
            const target = reduceMotion
              ? { ...basePosition, opacity: stage === "transition" ? 0 : basePosition.opacity }
              : stage === "transition" && slot === 0
                ? { ...basePosition, x: slideDistance, y: -5, rotate: isArabic ? 7 : -7, scale: 0.96, opacity: 0 }
                : stage === "transition"
                  ? STACK_POSITIONS[slot - 1] ?? basePosition
                  : basePosition;
            const transition = reduceMotion
              ? { duration: REDUCED_TRANSITION / 1000, ease: "easeInOut" as const }
              : { duration: FULL_TRANSITION / 1000, ease: [0.22, 0.7, 0.2, 1] as [number, number, number, number] };
            const frontName = (isArabic ? card.product.nameAr : card.product.name) || card.product.ticker;
            const face = <GiftCardFace card={card} lang={lang} dark={dark} />;

            return (
              <motion.div
                key={card.sequence}
                className="absolute inset-0 [perspective:1200px]"
                initial={slot === 3 && stage === "transition" && !reduceMotion
                  ? { x: 0, y: 48, scale: 0.82, rotate: 0, opacity: 0 }
                  : false}
                animate={target}
                transition={transition}
                style={{ zIndex: 4 - slot, pointerEvents: isFront && stage === "idle" ? "auto" : "none" }}
              >
                {isFront ? (
                  <Link
                    href={`/products/${encodeURIComponent(card.product.id)}`}
                    className="block h-full w-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2"
                    aria-label={`${card.shares} ${isArabic ? "أسهم في" : "shares of"} ${frontName} · ${isArabic ? card.occasion.ar : card.occasion.en}`}
                    tabIndex={stage === "idle" ? 0 : -1}
                  >
                    {face}
                  </Link>
                ) : (
                  <div aria-hidden="true" className="h-full w-full">
                    {face}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
