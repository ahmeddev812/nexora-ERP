"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthError, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useERPData } from "@/hooks/useERPData";

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();
  const { business } = useERPData();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goToWorkspace = () => {
    router.replace(business?.onboardingDone === true ? "/dashboard" : "/onboarding");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = login({ email, password, remember });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Could not sign in.");
      return;
    }
    setError(null);
    goToWorkspace();
  };

  const onDemo = () => {
    setBusy(true);
    const result = demoLogin();
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Could not open the demo workspace.");
      return;
    }
    setError(null);
    // AuthGuard waits for the demo dataset before deciding where to land.
    router.replace("/dashboard");
  };

  return (
    <AuthShell
      title="Sign in to NEXORA"
      lead="Your workspace lives in this browser. Use the account you created, or open the sample company."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="focus-ring-visible rounded-tag font-medium text-primary transition-colors duration-150 hover:text-primary-strong"
          >
            Open a workspace
          </Link>
        </>
      }
    >
      <AuthError message={error} />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="focus-ring-visible rounded-tag text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />

        <div className="flex items-center justify-between gap-4 pt-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 cursor-pointer accent-[var(--primary)]"
            />
            Keep me signed in on this device
          </label>
          <span className="numeric text-[11.5px] text-ink-faint">local session</span>
        </div>

        <div className="pt-2">
          <Button type="submit" block size="lg" loading={busy}>
            Sign in
          </Button>
        </div>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="numeric text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          or
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      <Button block size="lg" variant="secondary" onClick={onDemo} loading={busy}>
        Open the demo workspace
      </Button>

      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
        The demo loads 90 days of sample documents into an empty workspace. Your
        own records, if any, are never overwritten.
      </p>
    </AuthShell>
  );
}
