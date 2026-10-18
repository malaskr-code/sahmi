"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { accountCopy } from "@/data/account-copy";
import { AuthRequestError, useAuth } from "@/lib/auth-client";
import { authMessage, safeReturnTo, validateCredentials } from "@/lib/auth-validation";
import { useStore } from "@/lib/store";

type AuthFormProps = { mode: "login" | "signup" };
type Fields = { name: string; email: string; phone: string; password: string };
type FieldName = keyof Fields;

export function AuthForm({ mode }: AuthFormProps) {
  const { lang } = useStore();
  const copy = accountCopy[lang].auth;
  const { user, loading, login, signup } = useAuth();
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [message, setMessage] = useState("");
  const [returnTo, setReturnTo] = useState("/wallet");
  const [registered, setRegistered] = useState(false);
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(safeReturnTo(params.get("next"), "/wallet"));
    setRegistered(params.get("registered") === "1");
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(safeReturnTo(returnTo, "/wallet"));
      router.refresh();
    }
  }, [loading, user, returnTo, router]);

  const loginHref = `/login${returnTo !== "/wallet" ? `?next=${encodeURIComponent(returnTo)}` : ""}`;
  const signupHref = `/signup${returnTo !== "/wallet" ? `?next=${encodeURIComponent(returnTo)}` : ""}`;

  function updateField(name: FieldName, value: string) {
    setFields(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: undefined }));
    setMessage("");
  }

  function fieldError(code: string, field: FieldName) {
    if (code === "required") return !fields[field].trim() ? code : "";
    if (field === "email" && code === "emailInvalid") return code;
    if (field === "password" && (code === "passwordShort" || code === "passwordLong")) return code;
    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const validationCode = validateCredentials(fields, isSignup);
    if (validationCode) {
      const fieldsToCheck: FieldName[] = isSignup ? ["name", "email", "phone", "password"] : ["email", "password"];
      const nextErrors: Partial<Record<FieldName, string>> = {};
      fieldsToCheck.forEach(field => {
        const error = fieldError(validationCode, field);
        if (error) nextErrors[field] = error;
      });
      setErrors(nextErrors);
      setMessage(Object.keys(nextErrors).length ? "" : validationCode);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (isSignup) {
        await signup({ name: fields.name.trim(), email: fields.email.trim(), phone: fields.phone.trim(), password: fields.password });
        const nextParam = `&next=${encodeURIComponent(returnTo)}`;
        router.push(`/login?registered=1${nextParam}`);
      } else {
        await login({ email: fields.email.trim(), password: fields.password });
        router.push(safeReturnTo(returnTo, "/wallet"));
        router.refresh();
      }
    } catch (error) {
      const code = error instanceof AuthRequestError ? error.code : "serverError";
      if (code === "emailInvalid" || code === "passwordShort" || code === "passwordLong" || code === "required") {
        const nextErrors: Partial<Record<FieldName, string>> = {};
        (isSignup ? ["name", "email", "phone", "password"] as FieldName[] : ["email", "password"] as FieldName[])
          .forEach(field => { const fieldMessage = fieldError(code, field); if (fieldMessage) nextErrors[field] = fieldMessage; });
        setErrors(nextErrors);
      }
      setMessage(code);
    } finally {
      setPending(false);
    }
  }

  const title = isSignup ? copy.signupTitle : copy.loginTitle;
  const intro = isSignup ? copy.signupIntro : copy.loginIntro;
  const label = isSignup ? copy.signupLabel : copy.loginLabel;

  return (
    <div className="page-shell flex min-h-[70dvh] items-center justify-center py-12 md:py-16">
      <section className="card fade-up w-full max-w-[480px] p-6 sm:p-9" aria-labelledby="auth-title">
        <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--gold-dark)]" aria-hidden="true">
          <LockKeyhole size={19} />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-dark)]">Sahmi</p>
        <h1 id="auth-title" className="font-display text-3xl font-semibold leading-tight text-[var(--ink)]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{intro}</p>

        {registered && !isSignup && <p className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-sm leading-6" role="status">{copy.registered}</p>}
        {message && <p className="mt-5 rounded-lg border border-[var(--red)]/30 bg-[var(--soft)] px-4 py-3 text-sm leading-6 text-[var(--red)]" role="alert">{authMessage(message, lang)}</p>}

        {loading && user ? (
          <div className="mt-7 space-y-4" aria-label={copy.loginAction} aria-busy="true">
            <div className="h-11 animate-pulse rounded-lg bg-[var(--soft)]" />
            <div className="h-11 animate-pulse rounded-lg bg-[var(--soft)]" />
          </div>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate aria-label={label}>
            {isSignup && <AuthField id="auth-name" label={copy.name} value={fields.name} error={errors.name ? authMessage(errors.name, lang) : undefined} autoComplete="name" onChange={value => updateField("name", value)} />}
            <AuthField id="auth-email" label={copy.email} value={fields.email} error={errors.email ? authMessage(errors.email, lang) : undefined} type="email" autoComplete="email" dir="ltr" onChange={value => updateField("email", value)} />
            {isSignup && <AuthField id="auth-phone" label={copy.phone} value={fields.phone} error={errors.phone ? authMessage(errors.phone, lang) : undefined} type="tel" autoComplete="tel" dir="ltr" onChange={value => updateField("phone", value)} />}
            <div>
              <label htmlFor="auth-password" className="mb-2 block text-sm font-semibold">{copy.password}</label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={fields.password}
                  onChange={event => updateField("password", event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "auth-password-error" : isSignup ? "auth-password-hint" : undefined}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--cream)] px-4 py-3 pe-12 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
                  required
                />
                <button type="button" onClick={() => setPasswordVisible(value => !value)} aria-label={passwordVisible ? copy.hidePassword : copy.showPassword} className="absolute inset-y-0 end-0 flex items-center px-4 text-[var(--muted)] hover:text-[var(--ink)]">
                  {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password ? <p id="auth-password-error" className="mt-1.5 text-xs text-[var(--red)]">{authMessage(errors.password, lang)}</p> : isSignup ? <p id="auth-password-hint" className="mt-1.5 text-xs text-[var(--muted)]">{copy.passwordHint}</p> : null}
            </div>
            <button type="submit" disabled={pending || (loading && Boolean(user))} className="gold-button mt-2 w-full disabled:cursor-wait disabled:opacity-60">
              {pending ? (isSignup ? copy.creatingAccount : copy.loggingIn) : (isSignup ? copy.signupAction : copy.loginAction)}
            </button>
          </form>
        )}

        <p className="mt-7 border-t border-[var(--line)] pt-5 text-center text-sm text-[var(--muted)]">
          {isSignup ? copy.haveAccount : copy.needAccount}{" "}
          <Link className="font-semibold text-[var(--gold-dark)] underline-offset-4 hover:underline" href={isSignup ? loginHref : signupHref}>
            {isSignup ? copy.loginLink : copy.signupLink}
          </Link>
        </p>
      </section>
    </div>
  );
}

type AuthFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: string;
  autoComplete: string;
  dir?: "ltr" | "rtl";
  onChange: (value: string) => void;
};

function AuthField({ id, label, value, error, type = "text", autoComplete, dir, onChange }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      <input
        id={id}
        name={id.replace("auth-", "")}
        type={type}
        autoComplete={autoComplete}
        dir={dir}
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-lg border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20"
        required
      />
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs text-[var(--red)]">{error}</p>}
    </div>
  );
}
