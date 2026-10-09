import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

const MODULE_LINKS = [
  { label: "Sales", href: "#modules" },
  { label: "Purchasing", href: "#modules" },
  { label: "Inventory", href: "#modules" },
  { label: "Finance", href: "#modules" },
  { label: "People", href: "#modules" },
  { label: "Insights", href: "#modules" },
];

const COMPANY_LINKS = [
  { label: "Workspace preview", href: "#preview" },
  { label: "How it runs", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "Questions", href: "#faq" },
];

const LEGAL_LINKS = [
  { label: "Terms of service", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-12 sm:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <Logo size={28} withWordmark />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-ink-muted">
              A local first enterprise workspace: sales, purchasing, inventory,
              finance, people and reporting on one ledger.
            </p>
            <p className="numeric mt-5 text-[12px] text-ink-faint">
              Run everything. From one place.
            </p>
          </div>

          <nav className="sm:col-span-3" aria-label="Modules">
            <p className="numeric text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              Modules
            </p>
            <ul className="mt-4 space-y-2.5">
              {MODULE_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="focus-ring-visible rounded-tag text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="sm:col-span-2" aria-label="Product">
            <p className="numeric text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              Product
            </p>
            <ul className="mt-4 space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="focus-ring-visible rounded-tag text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="sm:col-span-2" aria-label="Legal">
            <p className="numeric text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              Legal
            </p>
            <ul className="mt-4 space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="focus-ring-visible rounded-tag text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/login"
                  className="focus-ring-visible rounded-tag text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="focus-ring-visible rounded-tag text-[13.5px] text-primary transition-colors duration-150 hover:text-primary-strong"
                >
                  Open workspace
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-ink-faint">
            © 2026 NEXORA. Built as a local first workspace.
          </p>
          <p className="numeric text-[11.5px] text-ink-faint">
            no trackers · no cloud sync · no telemetry
          </p>
        </div>
      </div>
    </footer>
  );
}
