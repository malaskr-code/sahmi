"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useStore } from "@/lib/store";

export function BackToTopButton() {
  const { t } = useStore();
  const [visible, setVisible] = useState(false);
  const [nearFooter, setNearFooter] = useState(false);

  useEffect(() => {
    const updateScrollState = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    const footer = document.querySelector("footer");
    let observer: IntersectionObserver | undefined;
    if (footer && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(([entry]) => setNearFooter(entry.isIntersecting), {
        rootMargin: "0px 0px 40px 0px",
      });
      observer.observe(footer);
    }
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      observer?.disconnect();
    };
  }, []);

  if (!visible || nearFooter) return null;
  return (
    <button
      type="button"
      aria-label={t.nav.backToTop}
      title={t.nav.backToTop}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed end-4 bottom-20 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gold-dark)]/20 bg-[var(--gold)] text-[var(--ink)] shadow-[var(--shadow)] transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-dark)] sm:end-8 sm:bottom-8"
    >
      <ArrowUp size={19} aria-hidden="true" />
    </button>
  );
}
