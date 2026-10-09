import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";

const CHAIN: Array<{ code: string; label: string; state: string; tone: "success" | "primary" | "neutral" | "accent" }> = [
  { code: "QT-0044", label: "Quotation accepted", state: "today", tone: "neutral" },
  { code: "SO-0031", label: "Order approved", state: "+4m", tone: "primary" },
  { code: "DLV-0027", label: "Stock delivered", state: "+1h", tone: "accent" },
  { code: "INV-0118", label: "Invoice collected", state: "+2d", tone: "success" },
];

const FACTS: Array<{ icon: IconName; text: string }> = [
  { icon: "journal", text: "Double entry ledger" },
  { icon: "warehouses", text: "Stock on every document" },
  { icon: "audit", text: "Audit trail by default" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 wash" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:pb-24">
        <div className="lg:col-span-7 lg:pt-6">
          <span className="inline-flex items-center gap-2 rounded-tag border border-line bg-surface px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="numeric text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Local first ERP · v1.0
            </span>
          </span>

          <h1 className="serif mt-7 text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.98] tracking-tight text-ink">
            Run everything.
            <br />
            From{" "}
            <span className="italic text-accent-strong">one</span> place.
          </h1>

          <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink-muted">
            Sales, purchasing, inventory, finance, people and reporting live in a
            single connected workspace that runs on your machine. No servers to
            maintain, no seats to babysit, no data leaving the building.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href="/signup" size="lg">
              Open your workspace
            </Button>
            <Button href="/login" size="lg" variant="secondary">
              Sign in to the demo
            </Button>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-1 gap-3 border-t border-line pt-6 sm:grid-cols-3">
            {FACTS.map((fact) => (
              <div key={fact.text} className="flex items-center gap-2.5">
                <Icon name={fact.icon} size={16} className="shrink-0 text-primary" />
                <dt className="text-[13px] leading-snug text-ink-muted">{fact.text}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-hero border border-line bg-surface card-rest">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="text-[13px] font-semibold text-ink">Order to cash</p>
                <p className="numeric mt-0.5 text-[11px] text-ink-faint">
                  one document chain, four screens
                </p>
              </div>
              <Badge tone="primary" dot>
                Live
              </Badge>
            </div>

            <ol className="divide-y divide-line">
              {CHAIN.map((step, index) => (
                <li key={step.code} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="numeric w-6 text-[11px] text-ink-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="numeric block text-[13px] text-ink">{step.code}</span>
                    <span className="block text-[12.5px] text-ink-muted">{step.label}</span>
                  </span>
                  <span
                    className={
                      step.tone === "success"
                        ? "numeric text-[11px] text-success"
                        : step.tone === "primary"
                          ? "numeric text-[11px] text-primary"
                          : step.tone === "accent"
                            ? "numeric text-[11px] text-accent-strong"
                            : "numeric text-[11px] text-ink-faint"
                    }
                  >
                    {step.state}
                  </span>
                </li>
              ))}
            </ol>

            <div className="border-t border-line bg-surface-2 px-5 py-4">
              <p className="text-[12.5px] leading-relaxed text-ink-muted">
                Stock reduced, journal posted, audit written. Nothing to reconcile
                at the end of the month.
              </p>
              <Link
                href="/login"
                className="focus-ring-visible mt-3 inline-flex items-center gap-1.5 rounded-tag text-[13px] font-medium text-primary transition-colors duration-150 hover:text-primary-strong"
              >
                Open the sample workspace
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <p className="mt-4 pl-1 text-[12px] text-ink-faint">
            Sample workspace. Your own data stays in your browser.
          </p>
        </div>
      </div>
    </section>
  );
}
