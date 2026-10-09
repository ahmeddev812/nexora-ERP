import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that govern your use of the NEXORA workspace.",
};

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "1. What NEXORA is",
    body: [
      "NEXORA is a local first business workspace. The application runs in your browser and stores its records in your browser's local storage on the device you use.",
      "There is no NEXORA server holding your documents, your customer list or your ledger. Because of that, availability, backups and access control are yours to manage.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "Accounts are created on your device and are visible only in that browser profile. The first account created in a workspace becomes the owner, and the owner controls roles for everyone else.",
      "You are responsible for the accounts you create, for choosing sensible roles, and for signing out on shared machines.",
    ],
  },
  {
    title: "3. Acceptable use",
    body: [
      "Use the workspace for lawful business records. Do not attempt to disrupt the application, tamper with its storage keys, or use it to hold data you have no right to hold.",
      "Sample and demo datasets are provided for evaluation. They are fictional and must not be presented as real financial records.",
    ],
  },
  {
    title: "4. Your data and your backups",
    body: [
      "You own the records you enter. Because storage lives in your browser, clearing site data, using a different browser profile or moving to a new machine will remove the workspace unless you export it first.",
      "Export your workspace regularly using the built in JSON export, and keep that file wherever you keep the rest of your books.",
    ],
  },
  {
    title: "5. No warranty",
    body: [
      "The workspace is provided as is. Calculations, reports and postings are provided in good faith, but you remain responsible for reviewing them with a qualified accountant before filing anything.",
      "To the extent permitted by law, no warranty of fitness for a particular purpose is given, and no liability is accepted for losses arising from use of the workspace or from data lost through browser storage.",
    ],
  },
  {
    title: "6. Changes to these terms",
    body: [
      "These terms may be updated as the product changes. The version in force is always the one published with the build you are running.",
      "Continuing to use the workspace after a change means you accept the updated terms.",
    ],
  },
];

export default function TermsPage() {
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
          Terms of service
        </h1>
        <p className="mt-4 text-[14px] text-ink-muted">
          Effective 5 October 2026. This document is a plain language draft written
          for a local first product.
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
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
          <Link
            href="/privacy"
            className="focus-ring-visible rounded-input border border-line bg-surface px-4 py-2 text-[13.5px] font-medium text-ink transition-shadow card-rest hover:card-hover"
          >
            Read the privacy notice
          </Link>
          <Link
            href="/login"
            className="focus-ring-visible rounded-input border border-line bg-surface px-4 py-2 text-[13.5px] font-medium text-ink transition-shadow card-rest hover:card-hover"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
