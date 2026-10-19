"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useStore } from "@/lib/store";

const SHOWN_KEY = "sahmi-login-prompt-shown";
const DISMISSED_KEY = "sahmi-login-prompt-dismissed";
const DISPLAY_DELAY_MS = 1500;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function excludedPath(pathname: string) {
  return pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/redeem" ||
    pathname.startsWith("/redeem/") ||
    pathname === "/checkout/success" ||
    pathname === "/checkout/cancel";
}

function alreadyShown() {
  try {
    return sessionStorage.getItem(SHOWN_KEY) === "1" ||
      sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function LoginPrompt() {
  const { user, loading, error } = useAuth();
  const { lang } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const startedAt = useRef<number | null>(null);
  const shownThisMount = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const isExcluded = excludedPath(pathname);
  const isArabic = lang === "ar";

  useEffect(() => {
    startedAt.current ??= Date.now();
  }, []);

  useEffect(() => {
    if (loading || user || error || isExcluded || open || shownThisMount.current || alreadyShown()) return;
    const elapsed = Date.now() - (startedAt.current ?? Date.now());
    const timer = window.setTimeout(() => {
      shownThisMount.current = true;
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        // Keep the in-memory guard if browser storage is unavailable.
      }
      setOpen(true);
    }, Math.max(0, DISPLAY_DELAY_MS - elapsed));
    return () => window.clearTimeout(timer);
  }, [error, isExcluded, loading, open, pathname, user]);

  useEffect(() => {
    if (isExcluded || user) setOpen(false);
  }, [isExcluded, user]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });
    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      }
    };
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("focusin", keepFocusInside);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [open]);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Keep the dismissal for the lifetime of this mounted app.
    }
    shownThisMount.current = true;
    setOpen(false);
  }

  function openAuthPage(page: "login" | "signup") {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    dismiss();
    router.push(`/${page}?next=${encodeURIComponent(returnTo)}`);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      .filter(element => !element.hasAttribute("disabled"));
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open || isExcluded || user) return null;

  const copy = isArabic
    ? {
        title: "أهلاً بك في سهمي",
        text: "سجّل دخولك لإرسال هدايا الأسهم ومتابعة محفظتك واستثماراتك.",
        login: "تسجيل الدخول",
        create: "إنشاء حساب",
        later: "لاحقاً",
      }
    : {
        title: "Welcome to Sahmi",
        text: "Log in to send share gifts, track your wallet, and see your portfolio.",
        login: "Log in",
        create: "Create account",
        later: "Maybe later",
      };

  return (
    <div
      className="login-prompt-overlay fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={event => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        aria-describedby="login-prompt-description"
        dir={isArabic ? "rtl" : "ltr"}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="login-prompt-sheet relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--paper)] px-6 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-9 text-[var(--ink)] shadow-[var(--shadow)] sm:max-w-[440px] sm:rounded-2xl sm:px-9 sm:pb-8 sm:pt-10"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
        >
          <X size={19} aria-hidden="true" />
        </button>

        <div className="mb-6 text-center leading-none" aria-label="Sahmi">
          <span className="font-display text-[28px] font-bold tracking-tight text-[var(--gold-dark)]">Sahmi</span>
          <span className="arabic mt-1 block text-[12px] font-semibold text-[var(--ink)]">سهمي</span>
        </div>

        <h2 id="login-prompt-title" className="font-display text-center text-2xl font-semibold leading-tight sm:text-[28px]">
          {copy.title}
        </h2>
        <p id="login-prompt-description" className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-[var(--muted)]">
          {copy.text}
        </p>

        <div className="mt-7 grid gap-3">
          <button type="button" onClick={() => openAuthPage("login")} className="gold-button min-h-12 w-full">
            {copy.login}
          </button>
          <button type="button" onClick={() => openAuthPage("signup")} className="outline-button min-h-12 w-full">
            {copy.create}
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mx-auto mt-5 block min-h-10 px-3 text-sm font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--gold-dark)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
        >
          {copy.later}
        </button>
      </div>
    </div>
  );
}
