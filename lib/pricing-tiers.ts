import type { ContainerScope, JobType } from "@/lib/domain";

export const TIER_KEYS = [
  "VEHICLE_FULL",
  "CONTAINER_FLOOR_ONLY",
  "CONTAINER_INTERIOR_FULL",
  "CONTAINER_EXTERIOR_ONLY",
  "CONTAINER_FULL_SHELL",
] as const;

export type TierKey = (typeof TIER_KEYS)[number];
export type VehicleTierKey = Extract<TierKey, `VEHICLE_${string}`>;
export type ContainerTierKey = Extract<TierKey, `CONTAINER_${string}`>;

export interface VehicleTier {
  key: VehicleTierKey;
  label: string;
  priceCents: number | null;
  spoken: readonly string[];
  featured: boolean;
  includes: readonly string[];
}

export interface ContainerScopeRate {
  key: ContainerTierKey;
  label: string;
  ratePerSqmCents: number | null;
}

export const VEHICLE_TIERS: readonly VehicleTier[] = [
  { key: "VEHICLE_FULL", label: "Full", priceCents: 520_000, spoken: ["full"], featured: true, includes: [] },
];

export const CONTAINER_SCOPE_RATES: Readonly<Record<ContainerScope, ContainerScopeRate>> = {
  FLOOR_ONLY: { key: "CONTAINER_FLOOR_ONLY", label: "Floor only", ratePerSqmCents: null },
  INTERIOR_FULL: { key: "CONTAINER_INTERIOR_FULL", label: "Full interior", ratePerSqmCents: null },
  EXTERIOR_ONLY: { key: "CONTAINER_EXTERIOR_ONLY", label: "Exterior only", ratePerSqmCents: null },
  FULL_SHELL: { key: "CONTAINER_FULL_SHELL", label: "Full shell", ratePerSqmCents: null },
};

export const MOBILISATION_FEE_CENTS: number | null = null;

export function tierJobType(key: TierKey): Extract<JobType, "VEHICLE" | "CONTAINER"> {
  return key.startsWith("VEHICLE_") ? "VEHICLE" : "CONTAINER";
}
