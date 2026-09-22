import type { ContainerScope, ContainerSize } from "@/lib/domain";

export type MeasuredContainerSize = Exclude<ContainerSize, "OTHER">;

export interface ContainerAreas {
  floor: number;
  interiorFull: number;
  exterior: number | null;
}

export const CONTAINER_AREAS_VERIFIED = false;

export const CONTAINER_AREAS_HUNDREDTHS_SQM: Readonly<Record<MeasuredContainerSize, ContainerAreas>> = {
  FT20: { floor: 1_390, interiorFull: 6_700, exterior: null },
  FT40: { floor: 2_830, interiorFull: 12_500, exterior: null },
  FT40_HC: { floor: 2_830, interiorFull: 13_300, exterior: null },
};

export function hundredthsToMilli(hundredths: number): number {
  return hundredths * 10;
}

export function suggestedAreaHundredths(size: ContainerSize, scope: ContainerScope): number | null {
  if (size === "OTHER") {
    return null;
  }
  const areas = CONTAINER_AREAS_HUNDREDTHS_SQM[size];
  switch (scope) {
    case "FLOOR_ONLY":
      return areas.floor;
    case "INTERIOR_FULL":
      return areas.interiorFull;
    case "EXTERIOR_ONLY":
      return areas.exterior;
    case "FULL_SHELL":
      return areas.exterior === null ? null : areas.interiorFull + areas.exterior;
  }
}

export function suggestedAreaMilli(size: ContainerSize, scope: ContainerScope): number | null {
  const hundredths = suggestedAreaHundredths(size, scope);
  return hundredths === null ? null : hundredthsToMilli(hundredths);
}

export function formatSqm(milli: number): string {
  const tenths = Math.round(milli / 100);
  return `${Math.floor(tenths / 10)}.${tenths % 10} m\u00B2`;
}
