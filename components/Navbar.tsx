"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { accountCopy } from "@/data/account-copy";
import { useAuth } from "@/lib/auth-client";
import { ChevronDown, LogOut, Moon, Sun, ShoppingBag, UserRound } from "lucide-react";
import { isSectorKey, SECTORS } from "@/data/sectors";

function StoreDropdown({ mobile = false }: { mobile?: boolean }) {
  const { t, lang } = useStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestedSector = searchParams.get("sector");
  const currentSector = pathname === "/products"
    ? isSectorKey(requestedSector) ? requestedSector : "all"
    : "";
  const storeActive = pathname === "/products" || pathname.startsWith("/products/");
  const options = [
    { id: "all", href: "/products", label: t.nav.allCompanies },
    ...SECTORS.map(group => ({
      id: group.id,
      href: `/products?sector=${group.id}`,
      label: lang === "ar" ? group.labelAr : group.labelEn,
    })),
  ];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      className={mobile ? "relative h-full w-full" : "relative"}
      ref={rootRef}
      onMouseEnter={!mobile ? () => setOpen(true) : undefined}
      onMouseLeave={!mobile ? () => setOpen(false) : undefined}
      onBlur={event => {
        if (!(event.relatedTarget instanceof Node) || !rootRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onFocus={!mobile ? () => setOpen(true) : undefined}
        onClick={() => setOpen(value => mobile ? !value : true)}
        className={mobile
          ? `relative flex min-h-12 w-full items-center justify-center text-base font-semibold ${storeActive ? "text-[var(--gold-dark)]" : "text-[var(--ink)]"}`
          : "flex items-center gap-1 hover:text-[var(--gold-dark)]"}
      >
        {t.nav.store}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`${mobile ? "absolute end-4" : ""} transition-transform ${open ? "rotate-180" : ""}`}
        />
        {mobile && storeActive && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--gold)]" />}
      </button>
      {open && (
        <div
          className={mobile
            ? "absolute end-0 top-full z-50 max-h-[70vh] w-[200%] overflow-y-auto border-x border-b border-[var(--line)] bg-[var(--paper)] p-2 text-start shadow-[var(--shadow)]"
            : "absolute start-0 top-full z-50 max-h-[70vh] min-w-60 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2 text-start shadow-[var(--shadow)]"}
          role="menu"
          aria-label={t.nav.store}
        >
          {options.map(option => {
            const selected = currentSector === option.id;
            return (
              <Link
                key={option.id}
                href={option.href}
                role="menuitem"
                aria-current={selected ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  selected
                    ? "bg-[var(--gold)]/20 font-semibold text-[var(--gold-dark)]"
                    : "hover:bg-[var(--soft)] hover:text-[var(--gold-dark)]"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StoreDropdownFallback({ mobile = false }: { mobile?: boolean }) {
  const { t } = useStore();
  const pathname = usePathname();
  const storeActive = pathname === "/products" || pathname.startsWith("/products/");
  if (!mobile) return <Link className="hover:text-[var(--gold-dark)]" href="/products">{t.nav.store}</Link>;
  return (
    <Link href="/products" className={`relative flex min-h-12 w-full items-center justify-center text-base font-semibold ${storeActive ? "text-[var(--gold-dark)]" : "text-[var(--ink)]"}`}>
      {t.nav.store}
      <ChevronDown size={14} aria-hidden="true" className="absolute end-4" />
      {storeActive && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--gold)]" />}
    </Link>
  );
}

function AccountMenu() {
  const { lang, t } = useStore();
  const { user, logout } = useAuth();
  const router = useRouter();
  const copy = accountCopy[lang].nav;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return <Link className="shrink-0 text-sm font-semibold hover:text-[var(--gold-dark)]" href="/login">{t.nav.login}</Link>;
  }

  const items = [
    { href: "/wallet", label: copy.wallet },
    { href: "/gifts", label: copy.gifts },
    { href: "/portfolio", label: copy.portfolio },
    ...(user.role === "admin" ? [{ href: "/admin", label: copy.admin }] : []),
  ];

  async function handleLogout() {
    setPending(true);
    setFeedback(false);
    try {
      await logout();
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setFeedback(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${copy.account}: ${user.name}`}
        onClick={() => { setOpen(value => !value); setFeedback(false); }}
        className="outline-button !min-w-0 !px-2.5 !py-2 sm:!px-3"
      >
        <UserRound size={16} aria-hidden="true" />
        <span className="max-w-[62px] truncate text-sm font-semibold sm:max-w-[112px]">{user.name}</span>
        <ChevronDown size={14} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute end-0 top-[calc(100%+10px)] z-50 w-56 max-w-[calc(100vw-36px)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2 shadow-[var(--shadow)]" role="menu" aria-label={copy.account}>
          <div className="border-b border-[var(--line)] px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
          </div>
          {items.map(item => (
            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-[var(--soft)] hover:text-[var(--gold-dark)]">
              {item.label}
            </Link>
          ))}
          {feedback && <p className="px-3 py-2 text-xs text-[var(--red)]" role="alert">{copy.logoutError}</p>}
          <button type="button" role="menuitem" disabled={pending} onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm text-[var(--red)] transition-colors hover:bg-[var(--soft)] disabled:cursor-wait disabled:opacity-60">
            <LogOut size={15} aria-hidden="true" />
            {pending ? copy.loggingOut : copy.logout}
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { t, lang, setLang, dark, toggleTheme, gift } = useStore();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const homeActive = pathname === "/";
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--cream)]/95 backdrop-blur">
      <div className="page-shell">
        <div className="flex min-h-[72px] items-center justify-between gap-3">
          <div className="flex min-w-0 shrink-0 items-center gap-5">
            <Link href="/" aria-label={`${t.nav.home} — Sahmi`} className="shrink-0 leading-none">
              <span className="font-display text-[26px] font-bold tracking-tight text-[var(--gold-dark)]">Sahmi</span>
              <span className="arabic mt-1 block text-center text-[12px] font-semibold text-[var(--ink)]">سهمي</span>
            </Link>
            <nav className="hidden items-center gap-5 text-sm font-medium md:flex" aria-label={t.nav.home}>
              <Link className="hover:text-[var(--gold-dark)]" href="/">{t.nav.home}</Link>
              <Suspense fallback={<StoreDropdownFallback />}>
                <StoreDropdown />
              </Suspense>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} aria-label={t.nav.language} className="outline-button !px-3 !py-2 text-xs">{t.nav.language}</button>
            <button onClick={toggleTheme} aria-label={dark ? t.nav.light : t.nav.dark} className="outline-button !p-2.5">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <Link href="/cart" aria-label={t.nav.cart} className="relative shrink-0 rounded-full border border-[var(--line)] p-2.5 transition hover:border-[var(--gold)]">
              <ShoppingBag size={17} />
              {gift && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-[#241f13]">1</span>}
            </Link>
            {(!loading || user) && <div className="min-w-0"><AccountMenu /></div>}
          </div>
        </div>
      </div>
      <nav className="relative grid min-h-12 grid-cols-2 border-t border-[var(--line)] text-sm font-semibold md:hidden" aria-label={t.nav.home}>
          <Link
            className={`relative flex min-h-12 items-center justify-center text-base ${homeActive ? "text-[var(--gold-dark)]" : "text-[var(--ink)]"}`}
            href="/"
            aria-current={homeActive ? "page" : undefined}
          >
            {t.nav.home}
            {homeActive && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--gold)]" />}
          </Link>
          <Suspense fallback={<StoreDropdownFallback mobile />}>
            <StoreDropdown mobile />
          </Suspense>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-[var(--line)]" />
      </nav>
    </header>
  );
}
