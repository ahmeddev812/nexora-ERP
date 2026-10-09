import { Icon } from "@/components/ui/Icon";
import { Reveal } from "./Reveal";
import { Section, SectionHead } from "./Section";
import { Button } from "@/components/ui/Button";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    cadence: "forever",
    summary: "One workspace, every module, nothing gated.",
    features: [
      "All nine modules",
      "Unlimited documents and products",
      "CSV and JSON import and export",
      "Roles, audit trail and approvals",
      "Works fully offline",
    ],
    cta: "Open your workspace",
    highlighted: false,
  },
  {
    id: "operations",
    name: "Operations",
    price: "$12",
    cadence: "per user, per month",
    summary: "For teams that need rollout support and rollout controls.",
    features: [
      "Everything in Starter",
      "Multi branch and multi warehouse",
      "Scheduled workspace backups",
      "Rollout templates per site",
      "Priority support with a named contact",
    ],
    cta: "Start with Operations",
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <Section id="pricing" className="py-16 sm:py-24">
      <SectionHead
        eyebrow="Pricing"
        title="Two ways in, no module tax"
        lead="The product is local first, so the only thing you ever pay for is the help around it."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {TIERS.map((tier, index) => (
          <Reveal
            key={tier.id}
            delay={index * 0.06}
            className={tier.highlighted ? "lg:col-span-7" : "lg:col-span-5"}
          >
            <div
              className={
                tier.highlighted
                  ? "flex h-full flex-col rounded-card border border-primary/35 bg-surface p-6 sm:p-8 card-rest"
                  : "flex h-full flex-col rounded-card border border-line bg-surface p-6 sm:p-8 card-rest"
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">{tier.name}</h3>
                  <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
                    {tier.summary}
                  </p>
                </div>
                {tier.highlighted ? (
                  <span className="numeric shrink-0 rounded-tag border border-primary/25 bg-primary-soft px-2 py-0.5 text-[11px] text-primary">
                    most teams
                  </span>
                ) : null}
              </div>

              <div className="mt-7 flex items-end gap-2">
                <span className="numeric text-[clamp(2.5rem,5vw,3.4rem)] leading-none text-ink">
                  {tier.price}
                </span>
                <span className="pb-1.5 text-[13px] text-ink-muted">{tier.cadence}</span>
              </div>

              <ul className="mt-7 flex-1 space-y-3 border-t border-line pt-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-primary" aria-hidden="true">
                      <Icon name="approvals" size={15} />
                    </span>
                    <span className="text-[13.5px] leading-snug text-ink">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Button
                  href="/signup"
                  block
                  variant={tier.highlighted ? "primary" : "secondary"}
                  size="lg"
                >
                  {tier.cta}
                </Button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="mt-6 flex flex-col gap-6 rounded-card border border-line bg-surface-2 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-xl">
            <h3 className="serif text-[24px] leading-tight text-ink">
              Rolling this out across a few teams?
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              Tell us how many people, branches and warehouses you run. We will
              size the rollout, the backups and the training with you before you
              commit to anything.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button href="/signup" size="lg">
              Create your workspace
            </Button>
            <Button href="/login" size="lg" variant="secondary">
              Try the demo first
            </Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
