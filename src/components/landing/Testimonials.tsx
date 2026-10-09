import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";

const QUOTES = [
  {
    quote:
      "We closed the old spreadsheets in a fortnight. Stock, invoices and the ledger finally agree with each other, which sounds small until you have lived without it.",
    name: "Dana Whitfield",
    role: "Operations Manager",
    org: "Harbor Field Supply",
    span: "lg:col-span-7",
    offset: "",
  },
  {
    quote:
      "The audit trail ended a two hour argument in ten seconds. We could see who changed the invoice and what it said before.",
    name: "Mei Sato",
    role: "Accountant",
    org: "Meridian Trading",
    span: "lg:col-span-5",
    offset: "lg:mt-10",
  },
  {
    quote:
      "Two warehouses, one count, no surprises. Transfers and adjustments are ordinary documents instead of a side channel.",
    name: "Lucas Brandt",
    role: "Warehouse Supervisor",
    org: "East Depot",
    span: "lg:col-span-5",
    offset: "",
  },
  {
    quote:
      "It runs on a laptop in the back office with the internet unplugged. For our branches that is the whole requirement.",
    name: "Ibrahim Cole",
    role: "Sales Lead",
    org: "Riverside Grocers",
    span: "lg:col-span-7",
    offset: "lg:mt-10",
  },
];

export function Testimonials() {
  return (
    <Section id="stories" className="py-16 sm:py-24">
      <SectionHead
        eyebrow="From the floor"
        title="What changes when the numbers agree"
        lead="Operators, accountants and warehouse leads on the same workspace."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {QUOTES.map((item, index) => (
          <Reveal
            key={item.name}
            delay={index * 0.05}
            className={`${item.span} ${item.offset}`}
          >
            <figure className="flex h-full flex-col justify-between gap-6 rounded-card border border-line bg-surface p-6 sm:p-7 card-rest">
              <blockquote className="serif text-[19px] leading-[1.45] text-ink sm:text-[21px]">
                {item.quote}
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-line pt-4">
                <span className="flex size-9 items-center justify-center rounded-full border border-primary/25 bg-primary-soft text-[12px] font-semibold text-primary">
                  {item.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">
                    {item.name}
                  </span>
                  <span className="block text-[12.5px] text-ink-muted">
                    {item.role}, {item.org}
                  </span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
