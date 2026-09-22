import type { Metadata } from "next";
import { PricingPanels } from "@/components/marketing/PricingPanels";
import { SectionHeading } from "@/components/ui/SectionHeading";

const DESCRIPTION =
  "Pricing for spray-on polyurethane coatings: fixed vehicle tiers, container quotes by area, and industrial work quoted after inspection.";

export const metadata: Metadata = {
  title: "Pricing",
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Pricing | Hawk Mobile Rubberising", description: DESCRIPTION, type: "website", locale: "en_ZA" },
};

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-[1200px] px-5 pb-12 pt-14 sm:px-8 lg:pt-20">
        <SectionHeading as="h1" title="Pricing">
          <p>Vehicles have fixed tiers. Containers are priced by area. Industrial work is quoted after we see it.</p>
        </SectionHeading>
      </section>
      <section className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <PricingPanels />
      </section>
    </>
  );
}
