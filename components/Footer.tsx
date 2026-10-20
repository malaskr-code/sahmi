"use client";

import { Mail, Phone } from "lucide-react";
import { useStore } from "@/lib/store";

export function Footer() {
  const { t } = useStore();

  return (
    <footer className="mt-0 border-t border-[var(--line)] bg-[var(--soft)]/60">
      <div className="page-shell py-12 md:pt-16 md:pb-12">
        <div className="grid gap-10 md:grid-cols-[1.3fr_.7fr] md:gap-16">
          <div>
            <div className="font-display text-[1.75rem] font-bold text-[var(--gold-dark)]">
              Sahmi <span className="arabic text-xl">سهمي</span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-6 text-[var(--muted)]">
              {t.footer.about}
            </p>
          </div>

          <div className="md:justify-self-end">
            <p className="mb-5 text-xs font-bold uppercase tracking-[.18em] text-[var(--gold-dark)]">
              {t.footer.contact}
            </p>
            <div className="flex flex-col gap-4 text-sm">
              <a
                href="tel:+96598858879"
                dir="ltr"
                className="flex w-fit items-center gap-3 hover:text-[var(--gold-dark)]"
              >
                <Phone size={17} aria-hidden="true" className="text-[var(--gold-dark)]" />
                <span>+965 9885 8879</span>
              </a>
              <a
                href="mailto:sahmi.kww@gmail.com"
                dir="ltr"
                className="flex w-fit items-center gap-3 hover:text-[var(--gold-dark)]"
              >
                <Mail size={17} aria-hidden="true" className="text-[var(--gold-dark)]" />
                <span>sahmi.kww@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)] md:mt-12">
          {t.footer.copyright}
        </div>
      </div>
    </footer>
  );
}
