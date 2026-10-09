"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { AuthError, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

function scorePassword(value: string): Strength {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;

  const labels = ["Too short", "Getting there", "Fair", "Strong", "Excellent"];
  return {
    score: Math.min(4, score) as Strength["score"],
    label: value.length === 0 ? "" : (labels[Math.min(4, score)] ?? "Too short"),
  };
}

const TONE = [
  "bg-line-strong",
  "bg-destructive",
  "bg-warning",
  "bg-primary",
  "bg-success",
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!accepted) {
      setError("Accept the terms of service to continue.");
      return;
    }

    setBusy(true);
    const result = signup({ name, email, password });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Could not create the workspace.");
      return;
    }

    setError(null);
    router.replace("/onboarding");
  };

  return (
    <AuthShell
      title="Open your workspace"
      lead="The first account becomes the owner. Everything you configure next stays on this device."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="focus-ring-visible rounded-tag font-medium text-primary transition-colors duration-150 hover:text-primary-strong"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AuthError message={error} />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Alex Moreau"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
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

          <div className="mt-2.5 flex items-center gap-3">
            <span className="flex flex-1 gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-200",
                    password.length > 0 && index < strength.score
                      ? TONE[strength.score]
                      : "bg-line",
                  )}
                />
              ))}
            </span>
            <span className="w-24 shrink-0 text-right text-[12px] text-ink-muted">
              {strength.label}
            </span>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[13px] leading-relaxed text-ink-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--primary)]"
          />
          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              className="focus-ring-visible rounded-tag text-primary underline-offset-2 hover:underline"
            >
              terms of service
            </Link>{" "}
            and the{" "}
            <Link
              href="/privacy"
              className="focus-ring-visible rounded-tag text-primary underline-offset-2 hover:underline"
            >
              privacy notice
            </Link>
            .
          </span>
        </label>

        <div className="pt-1">
          <Button type="submit" block size="lg" loading={busy}>
            Create workspace
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
