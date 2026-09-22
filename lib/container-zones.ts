import type { ContainerScope } from "@/lib/domain";

export interface ZoneSelection {
  floor: boolean;
  wallsRoof: boolean;
  exterior: boolean;
}

export function scopeFromZones(selection: ZoneSelection): ContainerScope | null {
  const { floor, wallsRoof, exterior } = selection;
  if (floor && !wallsRoof && !exterior) {
    return "FLOOR_ONLY";
  }
  if (floor && wallsRoof && !exterior) {
    return "INTERIOR_FULL";
  }
  if (!floor && !wallsRoof && exterior) {
    return "EXTERIOR_ONLY";
  }
  if (floor && wallsRoof && exterior) {
    return "FULL_SHELL";
  }
  return null;
}

export function zonesFromScope(scope: ContainerScope): ZoneSelection {
  switch (scope) {
    case "FLOOR_ONLY":
      return { floor: true, wallsRoof: false, exterior: false };
    case "INTERIOR_FULL":
      return { floor: true, wallsRoof: true, exterior: false };
    case "EXTERIOR_ONLY":
      return { floor: false, wallsRoof: false, exterior: true };
    case "FULL_SHELL":
      return { floor: true, wallsRoof: true, exterior: true };
  }
}

export function hasAnyZone(selection: ZoneSelection): boolean {
  return selection.floor || selection.wallsRoof || selection.exterior;
}
