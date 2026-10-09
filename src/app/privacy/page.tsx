import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What NEXORA stores, where it stores it, and what it never sends.",
};

const TABLE: Array<{ key: string; purpose: string; lifetime: string }> = [
  { key: "nexora_users", purpose: "Accounts you create in this browser", lifetime: "Until you clear site data" },
  { key: "nexora_business", purpose: "Company profile and onboarding state", lifetime: "Until you reset the workspace" },
  { key: "nexora_products, nexora_customers, nexora_suppliers", purpose: "Master data you enter or import", lifetime: "Until you delete it" },
  { key: "nexora_sales_*, nexora_purchase_*", purpose: "Documents your team issues", lifetime: "Until you delete it" },
  { key: "nexora_stock_*", purpose: "Balances, movements, transfers, counts", lifetime: "Until you delete it" },
  { key: "nexora_journal_*, nexora_payments", purpose: "Ledger entries and payment records", lifetime: "Until you delete it" },
  { key: "nexora_audit_log", purpose: "Chronological record of every change", lifetime: "Capped at 2,000 entries" },
  { key: "nexora_ui", purpose: "Sidebar and density preferences", lifetime: "Until you clear site data" },
];

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "The short version",
    body: [
      "NEXORA does not send your business data anywhere. Records are written to local storage in the browser on the device you use, under keys prefixed with nexora_.",
      "There is no account system hosted by us, no analytics SDK, no crash reporter and no advertising identifier in this build.",
    ],
  },
  {
    title: "What is stored",
    body: [
      "Everything you would expect an ERP to keep: your company profile, users and roles, products, customers, suppliers, documents, stock movements, ledger entries, payments, payroll records and the audit trail.",
      "The table below lists the key families and why each one exists.",
    ],
  },
  {
    title: "What is never collected",
    body: [
      "Your documents, customer lists, prices and payroll are not transmitted. Page views, clicks and session recordings are not collected. Location, device fingerprints and cross site identifiers are not collected.",
      "The only network activity the application performs is loading its own static assets.",
    ],
  },
  {
    title: "Demo accounts",
    body: [
      "Passwords in this build are stored in plain text inside local storage because there is no server to hash them against. That is a deliberate trade off for an offline workspace, and it is why you should not reuse a real password here.",
      "The demo dataset is fictional. Loading it overwrites an empty workspace only.",
    ],
  },
  {
    title: "Removing everything",
    body: [
      "Clearing site data for this origin removes every nexora_ key, including accounts. The workspace screen also offers a reset that clears all workspace keys while keeping your signed in session.",
      "Export first if you want a copy. Once local storage is cleared, the records cannot be recovered.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="grain min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[860px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="focus-ring-visible rounded-tag" aria-label="NEXORA home">
            <Logo size={26} withWordmark />
          </Link>
          <Link
            href="/"
            className="focus-ring-visible rounded-tag text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-5 py-14 sm:px-8">
        <p className="numeric text-[11px] uppercase tracking-[0.24em] text-primary">
          Legal
        </p>
        <h1 className="serif mt-4 text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05] tracking-tight text-ink">
          Privacy notice
        </h1>
        <p className="mt-4 text-[14px] text-ink-muted">
          Effective 5 October 2026. Written for a product that keeps your records
          on your own machine.
        </p>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-[16.5px] font-semibold text-ink">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="max-w-3xl text-[14.5px] leading-relaxed text-ink-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-[16.5px] font-semibold text-ink">Storage keys</h2>
            <div className="mt-4 overflow-hidden rounded-card border border-line">
              <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] gap-4 border-b border-line bg-surface-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-ink-faint sm:grid">
                <span>Key family</span>
                <span>Purpose</span>
                <span>Lifetime</span>
              </div>
              <ul className="divide-y divide-line">
                {TABLE.map((row) => (
                  <li
                    key={row.key}
                    className="grid grid-cols-1 gap-1 bg-surface px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] sm:gap-4"
                  >
                    <span className="numeric break-words text-[12.5px] text-ink">
                      {row.key}
                    </span>
                    <span className="text-[13px] text-ink-muted">{row.purpose}</span>
                    <span className="text-[13px] text-ink-muted">{row.lifetime}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
          <Link
            href="/terms"
            className="focus-ring-visible rounded-input border border-line bg-surface px-4 py-2 text-[13.5px] font-medium text-ink transition-shadow card-rest hover:card-hover"
          >
            Read the terms
          </Link>
          <Link
            href="/signup"
            className="focus-ring-visible rounded-input border border-primary bg-primary px-4 py-2 text-[13.5px] font-medium text-on-primary transition-shadow card-rest hover:card-hover"
          >
            Open a workspace
          </Link>
        </div>
      </main>
    </div>
  );
}
