import { SITE_CONFIG } from "@/lib/site-config";
import { SITE_NAME, siteUrl } from "@/lib/site";

type JsonLd = Record<string, unknown>;

const SERVICE_TYPES: ReadonlyArray<{ name: string; description: string }> = [
  {
    name: "Vehicle rubberising",
    description: "Spray-on polyurethane protective coatings for bakkies, SUVs and trailers.",
  },
  {
    name: "Shipping container rubberising",
    description: "Spray-on polyurethane coatings for the floor, interior, exterior or full shell of shipping containers.",
  },
  {
    name: "Industrial surface rubberising",
    description: "Spray-on polyurethane coatings for tanks, truck decks and plant floors.",
  },
];

export function localBusinessJsonLd(): JsonLd {
  const { contact } = SITE_CONFIG;
  const sameAs = contact.email ? { email: contact.email } : {};
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    url: siteUrl(),
    description:
      "Mobile spray-on polyurethane protective coatings for vehicles, shipping containers and industrial surfaces.",
    areaServed: { "@type": "Country", name: "South Africa" },
    ...(contact.phoneE164 ? { telephone: contact.phoneE164 } : {}),
    ...sameAs,
  };
}

export function serviceJsonLd(): JsonLd[] {
  return SERVICE_TYPES.map((service) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    provider: { "@type": "LocalBusiness", name: SITE_NAME, url: siteUrl() },
    areaServed: { "@type": "Country", name: "South Africa" },
  }));
}

export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
