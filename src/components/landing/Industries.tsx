import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const INDUSTRIES: Array<{ icon: IconName; name: string; note: string }> = [
  {
    icon: "purchaseOrders",
    name: "Distribution",
    note: "Multi warehouse stock, route deliveries and credit terms per account.",
  },
  {
    icon: "invoices",
    name: "Retail",
    note: "Counter sales, returns, fast moving SKUs and daily cash position.",
  },
  {
    icon: "products",
    name: "Manufacturing",
    note: "Bill of materials, work orders, component draws and yield checks.",
  },
  {
    icon: "payments",
    name: "Hospitality",
    note: "Recurring suppliers, outlet sites and cost per outlet reporting.",
  },
  {
    icon: "receivables",
    name: "Healthcare",
    note: "Batch tracking, expiring stock and controlled purchase approvals.",
  },
  {
    icon: "analytics",
    name: "Services",
    note: "Projects, retainers, timesheets and margin per engagement.",
  },
];

export function Industries() {
  return (
    <Section id="industries" className="py-16 sm:py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionHead
            eyebrow="Built for operators"
            title={
              <>
                Six industries, one{" "}
                <span className="italic text-accent-strong">operating</span> model
              </>
            }
            lead="Documents, stock and ledgers behave the same everywhere. What changes is the vocabulary your team types all day."
          />
          <p className="mt-6 max-w-sm border-l border-line pl-4 text-[13.5px] leading-relaxed text-ink-faint">
            Rename a document, set a tax rate, choose a warehouse. The workflow
            underneath does not fork into a different product.
          </p>
        </div>

        <ul className="overflow-hidden rounded-card border border-line bg-line lg:col-span-7">
          {INDUSTRIES.map((item, index) => (
            <li key={item.name} className="border-b border-line bg-surface last:border-b-0">
              <Reveal delay={index * 0.04}>
                <div className="flex items-start gap-4 p-5 transition-colors duration-150 hover:bg-surface-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-tag border border-line bg-surface-2 text-primary">
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-ink">
                      {item.name}
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                      {item.note}
                    </span>
                  </span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
