import type { Metadata } from "next";
import { BranchMatrix } from "@/components/marketing/BranchMatrix";
import { JsonLd } from "@/components/marketing/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE_CONFIG, whatsappHref } from "@/lib/site-config";
import { localBusinessJsonLd } from "@/lib/structured-data";

export const revalidate = 60;

const DESCRIPTION = "Contact Hawk Mobile Rubberising: branches, opening hours, mobile call-outs and our yard drop-off.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact | Hawk Mobile Rubberising", description: DESCRIPTION, type: "website", locale: "en_ZA" },
};

export default function ContactPage() {
  const now = new Date();
  const { branches, contact, yardDropOff, serviceRadiusNote } = SITE_CONFIG;
  const generalWhatsapp = whatsappHref(contact.whatsappE164);

  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />

      <section className="mx-auto w-full max-w-[1200px] px-5 pb-12 pt-14 sm:px-8 lg:pt-20">
        <SectionHeading as="h1" title="Contact">
          <p>Call, message on WhatsApp, or send the quote form and we will come back to you.</p>
        </SectionHeading>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/#quote">Get a quote</ButtonLink>
          {contact.phoneE164 && contact.phoneDisplay ? (
            <ButtonLink href={`tel:${contact.phoneE164}`} variant="secondary" external>
              Call {contact.phoneDisplay}
            </ButtonLink>
          ) : null}
          {generalWhatsapp ? (
            <ButtonLink href={generalWhatsapp} variant="secondary" external>
              WhatsApp
            </ButtonLink>
          ) : null}
        </div>
      </section>

      {branches.length > 0 ? (
        <section aria-labelledby="branches-title" className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <h2 id="branches-title" className="display-wide text-chrome text-3xl">
            Branches
          </h2>
          <div className="mt-8">
            <BranchMatrix branches={branches} now={now} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="where-title" className="mx-auto mt-24 w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="chamfer-2 plate">
            <div className="chamfer-2 plate-inner p-7">
              <h2 id="where-title" className="display-narrow text-chrome text-3xl">
                We come to you
              </h2>
              <p className="mt-4 text-zinc-300">
                {serviceRadiusNote ??
                  "Tell us where the vehicle, container or surface is in the quote form and we will confirm we can get to you."}
              </p>
            </div>
          </div>
          {yardDropOff.offered ? (
            <div className="chamfer-2 plate">
              <div className="chamfer-2 plate-inner corrugated p-7">
                <h2 className="display-narrow text-chrome text-3xl">Or bring it to our yard</h2>
                <p className="mt-4 text-zinc-300">
                  {yardDropOff.address ?? "The yard address and access hours are confirmed when you book."}
                </p>
                {yardDropOff.hours ? <p className="mt-2 text-zinc-300">{yardDropOff.hours}</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
