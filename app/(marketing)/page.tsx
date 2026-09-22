import type { Metadata } from "next";
import Link from "next/link";
import { CoatingPass } from "@/components/marketing/CoatingPass";
import { JsonLd } from "@/components/marketing/JsonLd";
import { LeadCaptureCard } from "@/components/marketing/LeadCaptureCard";
import { TelemetryStrip } from "@/components/marketing/TelemetryStrip";
import { ButtonLink } from "@/components/ui/Button";
import { CompareSlider } from "@/components/ui/CompareSlider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_CONFIG } from "@/lib/site-config";
import { localBusinessJsonLd, serviceJsonLd } from "@/lib/structured-data";

const TITLE = "Spray-on polyurethane protection";
const DESCRIPTION =
  "Mobile spray-on polyurethane coatings for bakkies, shipping containers and industrial surfaces. On-site or in our yard. Get a quote.";

export const metadata: Metadata = {
  title: { absolute: `Hawk Mobile Rubberising | ${TITLE}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: `Hawk Mobile Rubberising | ${TITLE}`, description: DESCRIPTION, type: "website", locale: "en_ZA" },
};

export default function HomePage() {
  const { beforeAfter } = SITE_CONFIG;

  return (
    <>
      <JsonLd data={[localBusinessJsonLd(), ...serviceJsonLd()]} />

      <section className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-14 sm:px-8 lg:pb-28 lg:pt-20">
        <div className="cure-line cure-line-draw pb-1">
          <h1 className="display-wide text-chrome hero-reveal text-[clamp(2.4rem,10vw,7.5rem)]">
            <span className="block">Rubberised</span>
            <span className="block">on site.</span>
          </h1>
        </div>
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="max-w-[44ch] text-lg text-zinc-400 sm:text-xl">
              Spray-on polyurethane protection for bakkies, shipping containers and industrial surfaces. We come to you, or you
              bring it to our yard.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/#quote">Get a quote</ButtonLink>
              <ButtonLink href="/pricing" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="chamfer-2 plate">
              <div className="chamfer-2 plate-inner">
                <CoatingPass className="block w-full" />
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-400">A pass of polyurethane over corrugated container steel, part way through the wall.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <TelemetryStrip />
      </div>

      <section aria-labelledby="work-title" className="mx-auto mt-24 w-full max-w-[1200px] px-5 sm:px-8">
        <SectionHeading id="work-title" title="What we coat" />
        <div className="mt-12 grid gap-6 lg:grid-cols-12">
          <Link href="/pricing#vehicles" className="chamfer-2 plate group lg:col-span-5">
            <span className="chamfer-2 plate-inner flex h-full min-h-[240px] flex-col justify-between p-7">
              <span>
                <span className="display-narrow text-chrome text-4xl">Vehicles</span>
                <span className="mt-4 block text-zinc-400">
                  Bakkie beds, full vehicles and trailers, sprayed to a fixed-tier price.
                </span>
              </span>
              <span className="mt-8 font-semibold text-zinc-100 underline decoration-hawk-crimson decoration-2 underline-offset-4">
                See vehicle pricing
              </span>
            </span>
          </Link>
          <Link href="/pricing#containers" className="chamfer-2 plate group lg:col-span-7 lg:mt-14">
            <span className="chamfer-2 plate-inner corrugated flex h-full min-h-[280px] flex-col justify-between p-7">
              <span>
                <span className="display-narrow text-chrome text-4xl">Containers</span>
                <span className="mt-4 block max-w-[44ch] text-zinc-300">
                  Floor, interior, exterior or the full shell, in 20ft, 40ft and high cube. Priced by the area we coat.
                </span>
              </span>
              <span className="mt-8 font-semibold text-zinc-100 underline decoration-hawk-crimson decoration-2 underline-offset-4">
                Build a container quote
              </span>
            </span>
          </Link>
          <Link href="/pricing#industrial" className="chamfer-2 plate group lg:col-span-6 lg:col-start-4">
            <span className="chamfer-2 plate-inner flex h-full min-h-[200px] flex-col justify-between p-7">
              <span>
                <span className="display-narrow text-chrome text-4xl">Industrial</span>
                <span className="mt-4 block text-zinc-400">
                  Tanks, truck decks and plant floors. We look at the surface, then quote.
                </span>
              </span>
              <span className="mt-8 font-semibold text-zinc-100 underline decoration-hawk-crimson decoration-2 underline-offset-4">
                Ask for an inspection
              </span>
            </span>
          </Link>
        </div>
      </section>

      {beforeAfter ? (
        <section aria-labelledby="proof-title" className="mx-auto mt-24 w-full max-w-[1200px] px-5 sm:px-8">
          <SectionHeading id="proof-title" title="Bare and coated" />
          <div className="mt-10 max-w-4xl">
            <CompareSlider images={beforeAfter} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="quote-title" className="mx-auto mt-28 w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading id="quote-title" title="Tell us about the job">
              <p>
                Send the details once. We come back with a price, or book a time to look at the job first if it needs an inspection.
              </p>
            </SectionHeading>
          </div>
          <div className="lg:col-span-8">
            <LeadCaptureCard />
          </div>
        </div>
      </section>
    </>
  );
}
