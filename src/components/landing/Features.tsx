import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const LEDGER_LINES = [
  { side: "Debit", account: "1100 Accounts Receivable", amount: "4,820.00" },
  { side: "Credit", account: "4000 Sales Revenue", amount: "4,452.28" },
  { side: "Credit", account: "2100 Output Tax Payable", amount: "367.72" },
];

const SIDE_ITEMS: Array<{ icon: IconName; title: string; note: string }> = [
  {
    icon: "invoices",
    title: "Invoices post themselves",
    note: "Issue an invoice and the journal entry is already balanced.",
  },
  {
    icon: "inventory",
    title: "Stock follows the document",
    note: "Deliveries, receipts and returns move quantities in the same click.",
  },
  {
    icon: "audit",
    title: "Every change is recorded",
    note: "Who touched what, when, and what it looked like before.",
  },
  {
    icon: "reports",
    title: "Exports in one action",
    note: "CSV for the books, JSON for the archive, both versioned.",
  },
];

const CHECKLIST = [
  "Nine modules, one permission model",
  "Branches, warehouses and document sequences",
  "Receivable and payable aging",
  "Approvals for orders, payroll and journals",
  "Stock transfers, counts and reservations",
  "Light and dark themes, offline friendly",
];

const WIDE_STATS: Array<{ value: string; label: string }> = [
  { value: "2", label: "warehouses seeded" },
  { value: "44", label: "sales chains" },
  { value: "20", label: "purchasing chains" },
  { value: "0", label: "servers required" },
];

export function Features() {
  return (
    <Section id="features" className="py-16 sm:py-24">
      <SectionHead
        eyebrow="Why it holds together"
        title={
          <>
            One ledger behind{" "}
            <span className="italic text-accent-strong">every</span> screen
          </>
        }
        lead="Documents, stock and accounting are the same object seen from three angles. Change one and the others already know."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="h-full rounded-card border border-line bg-surface p-6 sm:p-8 card-rest">
            <span className="flex size-9 items-center justify-center rounded-tag border border-primary/25 bg-primary-soft text-primary">
              <Icon name="journal" size={18} />
            </span>
            <h3 className="serif mt-5 text-[26px] leading-tight text-ink">
              Double entry, without the month end ritual
            </h3>
            <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink-muted">
              Every financial document carries its own posting rules. Totals are
              captured at document time, so a price change tomorrow never rewrites
              yesterday&apos;s books.
            </p>

            <div className="mt-6 overflow-hidden rounded-input border border-line">
              <div className="grid grid-cols-[70px_1fr_100px] gap-3 border-b border-line bg-surface-2 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                <span>Side</span>
                <span>Account</span>
                <span className="text-right">Amount</span>
              </div>
              {LEDGER_LINES.map((line) => (
                <div
                  key={`${line.side}-${line.account}`}
                  className="grid grid-cols-[70px_1fr_100px] gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
                >
                  <span
                    className={
                      line.side === "Debit"
                        ? "text-[12.5px] font-medium text-primary"
                        : "text-[12.5px] font-medium text-accent-strong"
                    }
                  >
                    {line.side}
                  </span>
                  <span className="truncate text-[13px] text-ink-muted">{line.account}</span>
                  <span className="numeric text-right text-[13px] text-ink">
                    {line.amount}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-[70px_1fr_100px] gap-3 bg-surface-2 px-4 py-2.5">
                <span className="text-[12.5px] font-semibold text-ink">Total</span>
                <span className="text-[12.5px] text-success">
                  Balanced, always
                </span>
                <span className="numeric text-right text-[13px] font-semibold text-ink">
                  4,820.00
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:col-span-5">
          {SIDE_ITEMS.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div className="flex h-full items-start gap-4 rounded-card border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:card-hover">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-tag border border-line bg-surface-2 text-primary">
                  <Icon name={item.icon} size={16} />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                    {item.note}
                  </span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-8">
          <div className="h-full rounded-card border border-line bg-surface p-6 sm:p-8 card-rest">
            <h3 className="serif text-[26px] leading-tight text-ink">
              Built for the tenth branch, not the demo
            </h3>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-muted">
              Branches, warehouses, document sequences and roles are part of the
              model from day one. Start with a single desk, add sites when the
              business adds them, and keep one set of numbers the whole way.
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
              {WIDE_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="numeric text-[26px] leading-none text-ink">
                    {stat.value}
                  </dt>
                  <dd className="mt-2 text-[12.5px] leading-snug text-ink-muted">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-4">
          <div className="h-full rounded-card border border-accent/30 bg-accent-soft/50 p-6 sm:p-7">
            <p className="numeric text-[11px] uppercase tracking-[0.2em] text-accent-strong">
              Out of the box
            </p>
            <ul className="mt-5 space-y-3">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-accent-strong" aria-hidden="true">
                    <Icon name="approvals" size={15} />
                  </span>
                  <span className="text-[13.5px] leading-snug text-ink">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
