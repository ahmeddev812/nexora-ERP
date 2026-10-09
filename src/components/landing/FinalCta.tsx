import { Button } from "@/components/ui/Button";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function FinalCta() {
  return (
    <Section id="start" className="py-16 sm:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-hero border border-line bg-surface px-6 py-12 sm:px-10 sm:py-16 card-rest">
          <div className="pointer-events-none absolute inset-0 wash" aria-hidden="true" />
          <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="numeric text-[11px] uppercase tracking-[0.24em] text-primary">
                Ready when you are
              </p>
              <h2 className="serif mt-5 text-[clamp(2.1rem,5vw,3.5rem)] leading-[1.03] tracking-tight text-ink">
                Your data never
                <br />
                leaves the <span className="italic text-accent-strong">room</span>.
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-muted">
                Open a workspace, load a CSV or the sample company, and run a full
                day of trading before lunch. Reset it whenever you like.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-card border border-line bg-surface/80 p-6">
                <div className="flex flex-col gap-3">
                  <Button href="/signup" size="lg" block>
                    Open your workspace
                  </Button>
                  <Button href="/login" size="lg" variant="secondary" block>
                    Enter the demo company
                  </Button>
                </div>
                <dl className="mt-5 space-y-2.5 border-t border-line pt-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[13px] text-ink-muted">Setup</dt>
                    <dd className="numeric text-[12.5px] text-ink">2 minutes</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[13px] text-ink-muted">Data location</dt>
                    <dd className="numeric text-[12.5px] text-ink">this device</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[13px] text-ink-muted">Accounts</dt>
                    <dd className="numeric text-[12.5px] text-ink">stored locally</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
