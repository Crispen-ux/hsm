import type { WeeklyHours } from "@/lib/business-hours";

export interface Branch {
  name: string;
  region: string;
  phoneDisplay: string | null;
  phoneE164: string | null;
  whatsappE164: string | null;
  hours: WeeklyHours;
  serviceRadiusKm: number | null;
}

export interface BeforeAfterImages {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  width: number;
  height: number;
}

export interface SpecDefinition {
  key: string;
  parameter: string;
  unit: string | null;
}

export interface SiteConfig {
  contact: {
    phoneDisplay: string | null;
    phoneE164: string | null;
    whatsappE164: string | null;
    email: string | null;
  };
  branches: readonly Branch[];
  telemetry: {
    warrantyYears: number | null;
    vehiclesCoated: number | null;
    containersCoated: number | null;
    responseHours: number | null;
  };
  beforeAfter: BeforeAfterImages | null;
  serviceRadiusNote: string | null;
  yardDropOff: { offered: boolean; address: string | null; hours: string | null };
  specValues: Readonly<Record<string, string | null>>;
}

export const SPEC_DEFINITIONS: readonly SpecDefinition[] = [
  { key: "hardness", parameter: "Hardness", unit: "Shore" },
  { key: "tensile", parameter: "Tensile strength", unit: "MPa" },
  { key: "elongation", parameter: "Elongation at break", unit: "%" },
  { key: "cure", parameter: "Cure time", unit: null },
  { key: "uv", parameter: "UV stability", unit: null },
  { key: "temperature", parameter: "Service temperature range", unit: null },
  { key: "thickness", parameter: "Applied thickness", unit: "mm" },
];

export const SITE_CONFIG: SiteConfig = {
  contact: { phoneDisplay: null, phoneE164: null, whatsappE164: "+27000000000", email: null },
  branches: [],
  telemetry: { warrantyYears: null, vehiclesCoated: null, containersCoated: null, responseHours: null },
  beforeAfter: null,
  serviceRadiusNote: null,
  yardDropOff: { offered: true, address: null, hours: null },
  specValues: {
    hardness: null,
    tensile: null,
    elongation: null,
    cure: null,
    uv: null,
    temperature: null,
    thickness: null,
  },
};

export function whatsappHref(e164: string | null, text?: string): string | null {
  if (!e164) {
    return null;
  }
  const digits = e164.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
