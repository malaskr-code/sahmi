"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Heart,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";

const stepIcons = [Wallet, Gift, Heart];
const GiftBoxScene = dynamic(() => import("@/components/home/GiftBoxScene"), {
  ssr: false,
  loading: () => <GiftBoxLoadingFallback />,
});

function GiftBoxArtwork({ dark }: { dark: boolean }) {
  const box = dark ? "#17263a" : "#f3eee2";
  const lid = dark ? "#203149" : "#fbf8ef";
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox="0 0 400 360"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="gift-shadow" x="30" y="255" width="340" height="70" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <linearGradient id="gift-front" x1="95" y1="160" x2="275" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor={lid} />
          <stop offset="1" stopColor={box} />
        </linearGradient>
        <linearGradient id="gift-side" x1="275" y1="150" x2="340" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor={box} />
          <stop offset="1" stopColor={dark ? "#101d30" : "#e4ddcc"} />
        </linearGradient>
      </defs>
      <ellipse cx="207" cy="286" rx="128" ry="20" fill="#382a0c" opacity=".18" filter="url(#gift-shadow)" />
      <path d="M91 157 275 157 336 127 151 126 91 157Z" fill={lid} stroke="#C9A227" strokeOpacity=".22" strokeWidth="2" />
      <path d="M275 157 336 127 336 245 275 278V157Z" fill={dark ? "#203149" : "#e9e2d3"} stroke="#C9A227" strokeOpacity=".18" strokeWidth="2" />
      <path d="M91 157H275V278H91V157Z" fill="url(#gift-front)" stroke="#C9A227" strokeOpacity=".2" strokeWidth="2" />
      <path d="M165 157H198V278H165V157Z" fill="#C9A227" />
      <path d="M275 157 308 141V260L275 278V157Z" fill="#C9A227" />
      <path d="M91 192H275V222H91V192Z" fill="#C9A227" />
      <path d="M275 192 336 162V191L275 222V192Z" fill="#C9A227" />
      <path d="M76 136 275 136 342 104 143 104 76 136Z" fill={lid} stroke="#C9A227" strokeOpacity=".32" strokeWidth="3" />
      <path d="M275 136 342 104V132L275 165V136Z" fill={box} stroke="#C9A227" strokeOpacity=".25" strokeWidth="2" />
      <path d="M76 136H275V165H76V136Z" fill={lid} stroke="#C9A227" strokeOpacity=".25" strokeWidth="2" />
      <path d="M160 136H194V165H160V136Z" fill="#C9A227" />
      <path d="M77 145H275V157H77V145Z" fill="#C9A227" />
      <path d="M275 145 342 113V125L275 157V145Z" fill="#C9A227" />
      <path d="M172 134C143 119 143 99 161 95C174 92 187 105 180 133M181 133C177 105 194 85 208 94C219 102 204 120 188 137" stroke="#C9A227" strokeWidth="9" strokeLinecap="round" />
      <path d="M177 136 164 119M184 136 198 119" stroke="#C9A227" strokeWidth="8" strokeLinecap="round" />
      <circle cx="180" cy="136" r="8" fill="#D9B33D" />
    </svg>
  );
}

function GiftBoxLoadingFallback() {
  const { dark } = useStore();
  return <GiftBoxArtwork dark={dark} />;
}

class GiftBoxErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function HomePage() {
  const { t, dark } = useStore();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [webglAvailable, setWebglAvailable] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [motionPreferenceChecked, setMotionPreferenceChecked] = useState(false);
  const [sceneActive, setSceneActive] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    setMotionPreferenceChecked(true);
    preference.addEventListener("change", updatePreference);

    const canvas = document.createElement("canvas");
    let supported = false;
    try {
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      supported = Boolean(context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      supported = false;
    }
    setWebglAvailable(supported);

    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const node = sceneRef.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setSceneActive(entry.isIntersecting);
    }, { threshold: 0.05 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const canAnimate = webglAvailable && motionPreferenceChecked && !reducedMotion;

  return (
    <div>
      <section className="page-shell home-hero">
        <div className="relative grid min-h-[540px] items-center gap-4 overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper)] px-7 py-16 shadow-[var(--shadow)] md:min-h-[640px] md:grid-cols-[1fr_.85fr] md:gap-2 md:px-16 md:py-24">
          <div className="relative z-10 max-w-[630px] fade-up">
            <h1 className="font-display max-w-[620px] text-5xl font-semibold leading-[1.08] tracking-[-.04em] md:text-[72px]">
              {t.home.title}
            </h1>
            <p className="mt-6 max-w-[480px] text-base leading-7 text-[var(--muted)] md:text-lg">
              {t.home.subtitle}
            </p>
            <Link className="gold-button mt-10" href="/products">
              {t.home.browse}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div
            ref={sceneRef}
            className="relative mx-auto h-[240px] w-full max-w-[240px] md:h-[420px] md:max-w-none"
            aria-hidden="true"
          >
            {canAnimate ? (
              <GiftBoxErrorBoundary fallback={<GiftBoxArtwork dark={dark} />}>
                <GiftBoxScene dark={dark} reducedMotion={false} active={sceneActive} />
              </GiftBoxErrorBoundary>
            ) : (
              <GiftBoxArtwork dark={dark} />
            )}
          </div>
        </div>
      </section>

      <section className="page-shell home-section">
        <div className="mb-8 max-w-xl">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">{t.home.howSub}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {t.home.steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <article key={step} className="relative border-t border-[var(--line)] py-6 md:py-8">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold-dark)]">
                    <Icon size={20} />
                  </span>
                  <span className="font-display text-4xl text-[var(--gold)]">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{t.home.stepDesc[index]}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
