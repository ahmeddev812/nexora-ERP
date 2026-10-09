import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const STEPS: Array<{ icon: IconName; title: string; body: string; meta: string }> = [
  {
    icon: "settings",
    title: "Create your workspace",
    body: "Name the company, pick currency, timezone and the default tax rate. A branch and a warehouse exist before you finish the form.",
    meta: "about 2 minutes",
  },
  {
    icon: "products",
    title: "Load your master data",
    body: "Bring products, customers and suppliers in from CSV, or type the first twenty by hand. Skus, prices and reorder levels land where they belong.",
    meta: "one import",
  },
  {
    icon: "pulse",
    title: "Run the day",
    body: "Quote, sell, deliver, invoice, receive, pay, count. Each document updates stock, the ledger and the audit trail in the same action.",
    meta: "every day",
  },
  {
    icon: "analytics",
    title: "Read the truth",
    body: "Dashboards, aging, margins and cash are calculated from those documents. Export when your accountant asks, in CSV or JSON.",
    meta: "no reconciliation",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" className="py-16 sm:py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <SectionHead
            eyebrow="How it runs"
            title="Four moves from empty to operating"
            lead="No implementation project, no consultant week. The workspace is usable the moment it opens."
          />

          <ol className="mt-10 border-l border-line">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.06}>
                <li className="relative pb-9 pl-8 last:pb-0">
                  <span className="absolute -left-[13px] top-0 flex size-6 items-center justify-center rounded-full border border-line bg-surface text-primary">
                    <span className="numeric text-[10.5px]">{index + 1}</span>
                  </span>

                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <h3 className="flex items-center gap-2.5 text-[16.5px] font-semibold text-ink">
                      <Icon name={step.icon} size={17} className="text-primary" />
                      {step.title}
                    </h3>
                    <span className="numeric shrink-0 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                      {step.meta}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.1} className="lg:col-span-4">
          <div className="sticky top-24 rounded-card border border-line bg-surface p-6 card-rest">
            <p className="numeric text-[11px] uppercase tracking-[0.2em] text-ink-faint">
              Where the data lives
            </p>
            <p className="serif mt-4 text-[24px] leading-tight text-ink">
              In your browser, on your disk
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">
              NEXORA keeps everything in local storage under one namespaced key
              family. Nothing is uploaded, nothing phones home, and the workspace
              keeps working when the network does not.
            </p>

            <dl className="mt-6 space-y-3 border-t border-line pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[13px] text-ink-muted">Storage namespace</dt>
                <dd className="numeric text-[12.5px] text-ink">nexora_*</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[13px] text-ink-muted">Network calls</dt>
                <dd className="numeric text-[12.5px] text-ink">none</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[13px] text-ink-muted">Backup</dt>
                <dd className="numeric text-[12.5px] text-ink">JSON export</dd>
              </div>
            </dl>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
