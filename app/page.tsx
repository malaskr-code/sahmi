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
        <filter id="gift-paper-grain" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="2" seed="8" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="monochrome" />
          <feComponentTransfer in="monochrome" result="grain">
            <feFuncA type="table" tableValues="0 .1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="grain" mode="soft-light" />
        </filter>
        <linearGradient id="gift-paper-front" x1="112" y1="160" x2="255" y2="278" gradientUnits="userSpaceOnUse">
          <stop stopColor={lid} />
          <stop offset=".48" stopColor={box} />
          <stop offset="1" stopColor={dark ? "#142238" : "#e6dfcf"} />
        </linearGradient>
        <linearGradient id="gift-paper-side" x1="277" y1="144" x2="333" y2="253" gradientUnits="userSpaceOnUse">
          <stop stopColor={dark ? "#263954" : "#f0eadc"} />
          <stop offset="1" stopColor={dark ? "#111e31" : "#dcd4c2"} />
        </linearGradient>
        <linearGradient id="gift-paper-lid" x1="95" y1="132" x2="273" y2="163" gradientUnits="userSpaceOnUse">
          <stop stopColor={lid} />
          <stop offset=".58" stopColor={dark ? "#1c2c45" : "#fffdf5"} />
          <stop offset="1" stopColor={dark ? "#17263a" : "#ece5d7"} />
        </linearGradient>
        <linearGradient id="gift-paper-top" x1="120" y1="107" x2="307" y2="147" gradientUnits="userSpaceOnUse">
          <stop stopColor={dark ? "#263650" : "#fffdf6"} />
          <stop offset=".52" stopColor={lid} />
          <stop offset="1" stopColor={dark ? "#1a2940" : "#e7dfce"} />
        </linearGradient>
        <linearGradient id="gift-paper-sheen" x1="92" y1="160" x2="222" y2="225" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity={dark ? ".09" : ".34"} />
          <stop offset=".48" stopColor="#FFFFFF" stopOpacity={dark ? ".035" : ".13"} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gift-ribbon-front" x1="165" y1="157" x2="198" y2="278" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1D66E" />
          <stop offset=".18" stopColor="#C9A227" />
          <stop offset=".62" stopColor="#D7B447" />
          <stop offset="1" stopColor="#A9811B" />
        </linearGradient>
        <linearGradient id="gift-ribbon-side" x1="275" y1="157" x2="308" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E6C657" />
          <stop offset=".55" stopColor="#B78D20" />
          <stop offset="1" stopColor="#98741B" />
        </linearGradient>
        <linearGradient id="gift-ribbon-lid" x1="120" y1="140" x2="298" y2="159" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8C85A" />
          <stop offset=".46" stopColor="#C9A227" />
          <stop offset=".72" stopColor="#E1C45C" />
          <stop offset="1" stopColor="#A77E18" />
        </linearGradient>
        <linearGradient id="gift-bow" x1="150" y1="91" x2="207" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0D673" />
          <stop offset=".5" stopColor="#C9A227" />
          <stop offset="1" stopColor="#A77D19" />
        </linearGradient>
        <linearGradient id="gift-bow-highlight" x1="159" y1="95" x2="185" y2="134" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF0AE" stopOpacity=".8" />
          <stop offset="1" stopColor="#FFF0AE" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="207" cy="286" rx="128" ry="20" fill="#382a0c" opacity=".18" filter="url(#gift-shadow)" />
      <path d="M91 157 275 157 336 127 151 126 91 157Z" fill="url(#gift-paper-top)" stroke="#C9A227" strokeOpacity=".24" strokeWidth="2" />
      <path d="M275 157 336 127 336 245Q336 249 332 251L275 278V157Z" fill="url(#gift-paper-side)" stroke="#C9A227" strokeOpacity=".2" strokeWidth="2" filter="url(#gift-paper-grain)" />
      <path d="M97 157H275V272Q275 278 269 278H98Q91 278 91 271V164Q91 157 97 157Z" fill="url(#gift-paper-front)" stroke="#C9A227" strokeOpacity=".22" strokeWidth="2" filter="url(#gift-paper-grain)" />
      <path d="M101 160H272V270Q272 274 267 274H101Q96 274 96 269V165Q96 160 101 160Z" fill="url(#gift-paper-sheen)" />
      <path d="M165 158H198V277H165V158Z" fill="url(#gift-ribbon-front)" />
      <path d="M275 157 308 141V260L275 278V157Z" fill="url(#gift-ribbon-side)" />
      <path d="M92 192H275V222H92V192Z" fill="url(#gift-ribbon-front)" />
      <path d="M275 192 336 162V191L275 222V192Z" fill="url(#gift-ribbon-side)" />
      <path d="M170 161V271" stroke="#F9E69A" strokeOpacity=".48" strokeWidth="2" />
      <path d="M96 196H270" stroke="#F9E69A" strokeOpacity=".38" strokeWidth="2" />
      <path d="M76 136 275 136 342 104 143 104 76 136Z" fill="url(#gift-paper-top)" stroke="#C9A227" strokeOpacity=".34" strokeWidth="3" filter="url(#gift-paper-grain)" />
      <path d="M275 136 342 104V132L275 165V136Z" fill="url(#gift-paper-side)" stroke="#C9A227" strokeOpacity=".28" strokeWidth="2" filter="url(#gift-paper-grain)" />
      <path d="M82 136H275V159Q275 165 269 165H82Q76 165 76 159V142Q76 136 82 136Z" fill="url(#gift-paper-lid)" stroke="#C9A227" strokeOpacity=".27" strokeWidth="2" filter="url(#gift-paper-grain)" />
      <path d="M160 137H194V164H160V137Z" fill="url(#gift-ribbon-lid)" />
      <path d="M77 145H275V157H77V145Z" fill="url(#gift-ribbon-lid)" />
      <path d="M275 145 342 113V125L275 157V145Z" fill="url(#gift-ribbon-side)" />
      <path d="M166 139V157M86 148H269" stroke="#F6E08C" strokeOpacity=".52" strokeWidth="2" />
      <path d="M87 139H269" stroke="#FFFFFF" strokeOpacity={dark ? ".13" : ".5"} strokeWidth="1.5" />
      <path d="M98 161H269" stroke="#FFFFFF" strokeOpacity={dark ? ".08" : ".28"} strokeWidth="1.5" />
      <path d="M172 134C154 125 146 111 151 101C154 94 162 91 169 95C179 100 183 114 180 132C178 122 173 108 165 106C158 105 158 112 165 121L181 135Z" fill="url(#gift-bow)" stroke="#A77D19" strokeOpacity=".55" strokeWidth="1.5" />
      <path d="M180 132C177 113 184 97 196 93C204 90 211 95 211 103C211 114 201 126 187 136L180 132Z" fill="url(#gift-bow)" stroke="#A77D19" strokeOpacity=".55" strokeWidth="1.5" />
      <path d="M157 100C161 97 166 100 169 105M187 102C192 97 199 96 203 100" stroke="url(#gift-bow-highlight)" strokeWidth="3" strokeLinecap="round" />
      <path d="M164 110C169 115 173 122 176 129M198 105C195 113 191 120 186 126" stroke="#8E6B14" strokeOpacity=".52" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M176 132 164 120 161 124 172 138Z" fill="url(#gift-bow)" stroke="#A77D19" strokeOpacity=".45" />
      <path d="M184 132 198 119 201 123 190 139Z" fill="url(#gift-bow)" stroke="#A77D19" strokeOpacity=".45" />
      <ellipse cx="181" cy="135" rx="8" ry="7" fill="url(#gift-bow)" stroke="#F1D66E" strokeOpacity=".72" strokeWidth="1" />
      <path d="M179 131C180 130 182 130 184 131" stroke="#FFF0AE" strokeOpacity=".72" strokeWidth="1.5" strokeLinecap="round" />
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
