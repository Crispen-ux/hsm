import type { Metadata } from "next";
import { CoatingCrossSection } from "@/components/marketing/CoatingCrossSection";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SpecRow } from "@/components/ui/SpecRow";
import { SITE_CONFIG, SPEC_DEFINITIONS } from "@/lib/site-config";

const DESCRIPTION =
  "How Hawk applies spray-on polyurethane coatings: the coating system, specification values, container work and the application process.";

export const metadata: Metadata = {
  title: "Capabilities",
  description: DESCRIPTION,
  alternates: { canonical: "/capabilities" },
  openGraph: { title: "Capabilities | Hawk Mobile Rubberising", description: DESCRIPTION, type: "website", locale: "en_ZA" },
};

const CONTAINER_USES: ReadonlyArray<{ title: string; detail: string }> = [
  { title: "Floors", detail: "A continuous, hard-wearing surface for containers used as workshops, stores and site offices." },
  { title: "Waterproofing", detail: "A seamless coating that helps keep water out of containers used for storage." },
  { title: "Corrosion protection", detail: "Covers bare steel inside and out to help slow rust." },
];

const PROCESS: ReadonlyArray<{ step: string; detail: string }> = [
  { step: "Inspect", detail: "We look at the surface and agree what needs coating." },
  { step: "Prepare", detail: "The surface is cleaned and prepared so the coating can bond." },
  { step: "Prime", detail: "A primer goes on where the job needs one." },
  { step: "Spray", detail: "The polyurethane is sprayed on in passes until the coating is built up." },
  { step: "Cure", detail: "The coating cures before the asset goes back into service." },
  { step: "Hand over", detail: "We walk the job with you and you sign it off." },
];

export default function CapabilitiesPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-[1200px] px-5 pb-16 pt-14 sm:px-8 lg:pt-20">
        <SectionHeading as="h1" title="Coating specifications">
          <p>The coating system we apply, the values it is specified to, and how a job runs from inspection to handover.</p>
        </SectionHeading>
      </section>

      <section aria-labelledby="spec-title" className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <h2 id="spec-title" className="display-wide text-chrome text-3xl">
                Polyurethane coating
              </h2>
              <p className="mt-4 text-zinc-400">Values marked On request are supplied when you enquire.</p>
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="chamfer-2 plate">
              <dl className="chamfer-2 plate-inner surface-brushed divide-y divide-hawk-obsidian-border px-5 py-2 sm:px-8">
                {SPEC_DEFINITIONS.map((spec) => (
                  <SpecRow key={spec.key} parameter={spec.parameter} value={SITE_CONFIG.specValues[spec.key] ?? null} unit={spec.unit} />
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="layers-title" className="mx-auto mt-28 w-full max-w-[1200px] px-5 sm:px-8">
        <SectionHeading id="layers-title" title="How the coating is built up" />
        <div className="mt-12">
          <CoatingCrossSection />
        </div>
      </section>

      <section aria-labelledby="containers-title" className="mx-auto mt-28 w-full max-w-[1200px] px-5 sm:px-8">
        <div className="chamfer-2 plate">
          <div className="chamfer-2 plate-inner corrugated grid gap-10 p-6 sm:p-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 id="containers-title" className="display-wide text-chrome text-[clamp(1.75rem,4vw,2.75rem)]">
                Shipping containers
              </h2>
              <p className="mt-5 text-zinc-300">
                Floor, interior, exterior or the full shell, in 20ft, 40ft and 40ft high cube. Work happens on your site, or in our yard
                if you bring the container to us.
              </p>
              <ButtonLink href="/pricing#containers" className="mt-8">
                Build a container quote
              </ButtonLink>
            </div>
            <ul className="space-y-6 lg:col-span-6 lg:col-start-7">
              {CONTAINER_USES.map((use) => (
                <li key={use.title} className="border-l-2 border-hawk-crimson pl-5">
                  <p className="font-semibold text-zinc-50">{use.title}</p>
                  <p className="mt-1 text-zinc-300">{use.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="process-title" className="mx-auto mt-28 w-full max-w-[1200px] px-5 sm:px-8">
        <SectionHeading id="process-title" title="How a job runs" />
        <ol className="mt-12 grid gap-px border border-hawk-obsidian-border bg-hawk-obsidian-border sm:grid-cols-2 lg:grid-cols-3">
          {PROCESS.map((item, index) => (
            <li key={item.step} className="bg-hawk-obsidian-bg p-6">
              <span className="font-mono text-3xl tabular-nums text-zinc-400" aria-hidden>
                {index + 1}
              </span>
              <p className="mt-3 text-lg font-semibold text-zinc-50">
                <span className="sr-only">Step {index + 1}: </span>
                {item.step}
              </p>
              <p className="mt-2 text-zinc-400">{item.detail}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <ButtonLink href="/#quote">Get a quote</ButtonLink>
        </div>
      </section>
    </>
  );
}
