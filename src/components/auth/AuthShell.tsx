import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const PROMISES: Array<{ icon: IconName; title: string; note: string }> = [
  {
    icon: "journal",
    title: "One ledger, every module",
    note: "Documents post balanced entries as your team works.",
  },
  {
    icon: "warehouses",
    title: "Stock that matches the shelf",
    note: "Movements are signed rows with a document reference.",
  },
  {
    icon: "audit",
    title: "A record of every change",
    note: "Who touched what, when, and what it looked like before.",
  },
];

export function AuthShell({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grain min-h-screen bg-bg lg:grid lg:grid-cols-12">
      <aside className="relative hidden overflow-hidden border-r border-line lg:col-span-5 lg:flex lg:flex-col lg:justify-between xl:col-span-5">
        <div className="pointer-events-none absolute inset-0 wash" aria-hidden="true" />

        <div className="relative px-10 pt-10">
          <Link href="/" className="focus-ring-visible rounded-tag" aria-label="NEXORA home">
            <Logo size={30} withWordmark />
          </Link>
        </div>

        <div className="relative px-10 pb-10">
          <p className="numeric text-[11px] uppercase tracking-[0.24em] text-primary">
            Local first ERP
          </p>
          <h2 className="serif mt-5 text-[clamp(2rem,3vw,2.75rem)] leading-[1.05] tracking-tight text-ink">
            The whole company
            <br />
            on <span className="italic text-accent-strong">one</span> ledger.
          </h2>

          <ul className="mt-8 space-y-5">
            {PROMISES.map((item) => (
              <li key={item.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-tag border border-line bg-surface text-primary">
                  <Icon name={item.icon} size={16} />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">
                    {item.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="numeric mt-10 text-[11.5px] text-ink-faint">
            no servers · no telemetry · data stays on this device
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:col-span-7">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="focus-ring-visible rounded-tag lg:hidden" aria-label="NEXORA home">
            <Logo size={26} withWordmark />
          </Link>
          <div className="ml-auto flex items-center gap-4 text-[13.5px]">
            <Link
              href="/terms"
              className="focus-ring-visible rounded-tag text-ink-muted transition-colors duration-150 hover:text-ink"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="focus-ring-visible rounded-tag text-ink-muted transition-colors duration-150 hover:text-ink"
            >
              Privacy
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px]">
            <h1 className="serif text-[clamp(1.9rem,3.4vw,2.5rem)] leading-tight tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{lead}</p>

            <div className="mt-7 rounded-card border border-line bg-surface p-6 card-rest">
              {children}
            </div>

            <div className="mt-5 text-[13.5px] text-ink-muted">{footer}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "mb-4 rounded-input border border-destructive/30 bg-destructive-soft px-3.5 py-2.5",
        "text-[13px] leading-snug text-destructive",
      )}
    >
      {message}
    </p>
  );
}
