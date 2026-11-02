"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";

type ScrollMorphHeroProps = {
  lang: "en" | "ar";
  dark: boolean;
};

const WORDS = {
  en: ["Eid", "Graduation", "Birthday", "Newborn", "Wedding", "Gift"],
  ar: ["عيد", "تخرج", "ميلاد", "مولود", "زواج", "هدية"],
};

const PHOTO_COUNT = 16;
const CARD_WIDTH = 56;
const PHOTO_ALTS = {
  en: [
    "Stock chart",
    "Trading screens",
    "Market charts",
    "Candlestick graph",
    "Trading dashboard",
    "Stacked gold coins",
    "Gold coin collection",
    "Gold and silver coins",
    "Pile of gold coins",
    "Gold coin detail",
    "Precious metal coins",
    "Golden coins",
    "Gold bars",
    "Wrapped gift box",
    "Gold gift box",
    "Gift box with ribbon",
  ],
  ar: [
    "رسم بياني للأسهم",
    "شاشات تداول",
    "رسوم بيانية للسوق",
    "رسم الشموع اليابانية",
    "لوحة تداول",
    "عملات ذهبية مكدسة",
    "مجموعة عملات ذهبية",
    "عملات ذهبية وفضية",
    "كومة عملات ذهبية",
    "تفاصيل عملة ذهبية",
    "عملات معادن ثمينة",
    "عملات ذهبية",
    "سبائك ذهبية",
    "علبة هدية مغلفة",
    "علبة هدية ذهبية",
    "علبة هدية بشريط",
  ],
};

export default function ScrollMorphHero({ lang, dark }: ScrollMorphHeroProps) {
  const isArabic = lang === "ar";
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState(0);
  const [introComplete, setIntroComplete] = useState(Boolean(reduceMotion));
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    if (reduceMotion || !size) return;
    const timer = window.setTimeout(() => setIntroComplete(true), 2550);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, size]);

  const positions = useMemo(() => {
    if (!size) return [];
    const center = size / 2;
    const radius = size * 0.35;
    const lineSpacing = Math.min(28, (size - CARD_WIDTH) / (PHOTO_COUNT - 1));
    return Array.from({ length: PHOTO_COUNT }, (_, index) => {
      const angle = (index / PHOTO_COUNT) * Math.PI * 2 - Math.PI / 2;
      const seed = index + 1;
      const scatterX = ((seed * 47) % 181) - 90;
      const scatterY = ((seed * 73) % 181) - 90;
      return {
        circle: {
          x: center + Math.cos(angle) * radius - CARD_WIDTH / 2,
          y: center + Math.sin(angle) * radius - 40,
        },
        line: {
          x: center + (index - (PHOTO_COUNT - 1) / 2) * lineSpacing - CARD_WIDTH / 2,
          y: center - 40,
        },
        scatter: { x: center + scatterX - CARD_WIDTH / 2, y: center + scatterY - 40 },
      };
    });
  }, [size]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = {
      x: Math.max(-20, Math.min(20, (event.clientX - bounds.left - bounds.width / 2) / bounds.width * 40)),
      y: Math.max(-20, Math.min(20, (event.clientY - bounds.top - bounds.height / 2) / bounds.height * 40)),
    };
    pointerRef.current = next;
    setPointer(next);
  };

  const handlePointerLeave = () => {
    pointerRef.current = { x: 0, y: 0 };
    setPointer({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full overflow-visible"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      dir={isArabic ? "rtl" : "ltr"}
      role="group"
      aria-label={isArabic ? "بطاقات صور لمناسبات الإهداء" : "Photo cards for every gifting occasion"}
    >
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
          const imageAlt = PHOTO_ALTS[lang][index];
          const cardShadow = dark
            ? "0 8px 20px rgba(201, 162, 39, 0.26)"
            : "0 8px 18px rgba(27, 42, 68, 0.16)";
          return (
            <motion.div
              key={index}
              className="absolute h-20 w-14 cursor-pointer [perspective:800px]"
              style={{ left: 0, top: 0 }}
              initial={reduceMotion ? { ...position.circle, opacity: 1 } : { ...position.scatter, opacity: 0 }}
              animate={started ? { ...position.circle, opacity: 1 } : { ...position.line, opacity: 1 }}
              transition={reduceMotion
                ? { duration: 0 }
                : started
                  ? { type: "spring", stiffness: 72, damping: 18, delay: index * 0.045 }
                  : { type: "spring", stiffness: 68, damping: 16, delay: index * 0.055 }}
              onAnimationComplete={() => {
                if (index === PHOTO_COUNT - 1 && !reduceMotion) setIntroComplete(true);
              }}
              whileHover={{ scale: 1.08 }}
              whileFocus={{ scale: 1.08 }}
            >
              <motion.button
                type="button"
                className="relative h-full w-full rounded-xl border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2"
                aria-label={`${imageAlt} — ${WORDS[lang][index % WORDS[lang].length]}`}
                whileHover={{ rotateY: 180 }}
                whileFocus={{ rotateY: 180 }}
                transition={{ duration: 0.55, ease: [0.22, 0.7, 0.2, 1] }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <span
                  className="absolute inset-0 block overflow-hidden rounded-xl border border-[#C9A227]/30 bg-[#F3EEE3]"
                  style={{ backfaceVisibility: "hidden", boxShadow: cardShadow }}
                >
                  <img
                    src={`/hero/${index + 1}.jpg`}
                    alt={imageAlt}
                    className="h-full w-full rounded-xl object-cover"
                    draggable={false}
                  />
                </span>
                <span
                  className="font-display absolute inset-0 flex items-center justify-center rounded-xl border border-[#C9A227] bg-[#1B2A44] px-1 text-center text-[10px] font-semibold leading-tight tracking-[.02em] text-[#D8B84A]"
                  style={{ backfaceVisibility: "hidden", boxShadow: cardShadow, transform: "rotateY(180deg)" }}
                  aria-hidden="true"
                >
                  {WORDS[lang][index % WORDS[lang].length]}
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
