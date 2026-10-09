"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const ITEMS = [
  {
    q: "Where does my data actually live?",
    a: "In your browser, on your machine, under the nexora_ namespace of local storage. NEXORA makes no network requests with your records, and nothing is mirrored to a service.",
  },
  {
    q: "Do I need a server to run it?",
    a: "No. The application is a static frontend that boots from your machine or your own hosting. There is no database to install, no worker to monitor and no upgrade window to plan.",
  },
  {
    q: "How do I get my data out?",
    a: "Every module exports to CSV with a documented header row, and the whole workspace exports to a versioned JSON envelope. Both are one action from the module you are looking at.",
  },
  {
    q: "Is the accounting really double entry?",
    a: "Yes. Each financial document carries posting rules, and an entry is rejected unless total debits equal total credits. Stock movements and journal lines are checked against each other on demand.",
  },
  {
    q: "How do roles and permissions work?",
    a: "Six roles share one matrix: owner, admin, manager, cashier, accountant and viewer. Salary fields, for example, are visible only to owner, admin and accountant, and every change is written to the audit trail.",
  },
  {
    q: "What comes with the demo workspace?",
    a: "Ninety days of sample data: branches, warehouses, products, sales and purchasing chains, stock movements, journals, expenses, payroll and an audit trail. Sign in with the demo button to load it into an empty workspace.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<string | null>(ITEMS[0]?.q ?? null);

  return (
    <Section id="faq" className="py-16 sm:py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <SectionHead
            eyebrow="Questions"
            title="Before you commit an afternoon"
            lead="The things people ask in the first ten minutes."
          />
          <p className="mt-6 text-[13.5px] leading-relaxed text-ink-faint">
            Still unsure? Open the demo workspace, click through a chain, then
            reset it. Nothing leaves your machine either way.
          </p>
        </div>

        <div className="lg:col-span-8">
          <ul className="divide-y divide-line border-y border-line">
            {ITEMS.map((item, index) => {
              const expanded = open === item.q;
              return (
                <li key={item.q}>
                  <Reveal delay={index * 0.03}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : item.q)}
                      className="focus-ring-visible flex w-full items-start justify-between gap-6 py-4 text-left"
                    >
                      <span
                        className={cn(
                          "text-[15px] font-medium transition-colors duration-150",
                          expanded ? "text-ink" : "text-ink-muted hover:text-ink",
                        )}
                      >
                        {item.q}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 text-primary transition-transform duration-200",
                          expanded ? "rotate-45" : "rotate-0",
                        )}
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </button>

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-200 ease-out",
                        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-2xl pb-5 pr-8 text-[14px] leading-relaxed text-ink-muted">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}
