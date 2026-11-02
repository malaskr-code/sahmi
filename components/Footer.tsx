"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone } from "lucide-react";
import { useStore } from "@/lib/store";
import { ExchangeRateAttribution } from "@/components/ExchangeRateAttribution";

export function Footer() {
  const { t, lang } = useStore();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameInput = event.currentTarget.elements.namedItem("name") as HTMLInputElement;
    const messageInput = event.currentTarget.elements.namedItem("message") as HTMLTextAreaElement;
    nameInput.setCustomValidity(form.name.trim() ? "" : t.footer.required);
    const trimmedMessage = form.message.trim();
    messageInput.setCustomValidity(
      trimmedMessage.length >= 10 && trimmedMessage.length <= 1000 ? "" : t.footer.messageLength,
    );
    if (!event.currentTarget.reportValidity()) return;

    const normalized = {
      name: form.name.trim(),
      email: form.email.trim(),
      message: trimmedMessage,
    };
    setSending(true);
    setSent(false);
    setError(false);
    try {
      const response = await fetch("https://formsubmit.co/ajax/mo.alaskrr@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...normalized,
          _subject: `New message from Sahmi: ${normalized.name}`,
          _template: "table",
          _captcha: "false",
          _honey: "",
        }),
      });
      const result = await response.json() as { success?: boolean | string };
      if (!response.ok || (result.success !== true && result.success !== "true")) {
        throw new Error("Form submission failed");
      }
      setForm({ name: "", email: "", message: "" });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <footer className="mt-0 border-t border-[var(--line)] bg-[var(--soft)]/60">
      <div className="page-shell">
        <div className="grid gap-10 md:grid-cols-[1.1fr_.9fr] md:gap-16">
          <div>
            <div className="font-display text-[1.75rem] font-bold text-[var(--gold-dark)]">
              Sahmi <span className="arabic text-xl">سهمي</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              {t.footer.about}
            </p>
          </div>

          <div className="md:justify-self-end">
            <p className="mb-5 text-xs font-bold uppercase tracking-[.18em] text-[var(--gold-dark)]">
              {t.footer.contact}
            </p>
            <div className="flex flex-col gap-4 text-sm">
              <a
                href="tel:+96599999999"
                dir="ltr"
                className="flex w-fit items-center gap-3 hover:text-[var(--gold-dark)]"
              >
                <Phone size={17} aria-hidden="true" className="text-[var(--gold-dark)]" />
                <span>+965 9999 9999</span>
              </a>
              <a
                href="mailto:mo.alaskrr@gmail.com"
                dir="ltr"
                className="flex w-fit items-center gap-3 hover:text-[var(--gold-dark)]"
              >
                <Mail size={17} aria-hidden="true" className="text-[var(--gold-dark)]" />
                <span>mo.alaskrr@gmail.com</span>
              </a>
            </div>
            <form onSubmit={submitContact} className="mt-6 grid gap-3" dir={lang === "ar" ? "rtl" : "ltr"}>
              <input
                type="text"
                name="name"
                required
                maxLength={120}
                autoComplete="name"
                placeholder={t.footer.name}
                aria-label={t.footer.name}
                value={form.name}
                onChange={event => {
                  event.currentTarget.setCustomValidity("");
                  setForm(current => ({ ...current, name: event.target.value }));
                }}
                className="min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--gold-dark)] focus:outline-none"
              />
              <input
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                dir="ltr"
                placeholder={t.footer.email}
                aria-label={t.footer.email}
                value={form.email}
                onChange={event => {
                  event.currentTarget.setCustomValidity("");
                  setForm(current => ({ ...current, email: event.target.value }));
                }}
                className="min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--gold-dark)] focus:outline-none"
              />
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={1000}
                rows={3}
                placeholder={t.footer.message}
                aria-label={t.footer.message}
                value={form.message}
                onChange={event => {
                  event.currentTarget.setCustomValidity("");
                  setForm(current => ({ ...current, message: event.target.value }));
                }}
                className="w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--gold-dark)] focus:outline-none"
              />
              <input
                type="text"
                name="_honey"
                value=""
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
                readOnly
              />
              <button type="submit" disabled={sending} className="gold-button min-h-10 w-full justify-center disabled:cursor-wait disabled:opacity-60">
                {sending ? t.footer.sending : t.footer.send}
              </button>
              {sent && <p role="status" className="text-xs text-[var(--green)]">{t.footer.sent}</p>}
              {error && <p role="alert" className="text-xs text-[var(--red)]">{t.footer.sendError}</p>}
            </form>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{t.footer.copyright}</span>
            <ExchangeRateAttribution />
          </div>
        </div>
      </div>
    </footer>
  );
}
