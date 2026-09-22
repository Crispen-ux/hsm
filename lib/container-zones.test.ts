import { describe, expect, it } from "vitest";
import { hasAnyZone, scopeFromZones, zonesFromScope } from "@/lib/container-zones";
import { CONTAINER_SCOPES } from "@/lib/domain";

describe("container zones", () => {
  it("round-trips every scope", () => {
    for (const scope of CONTAINER_SCOPES) {
      expect(scopeFromZones(zonesFromScope(scope))).toBe(scope);
    }
  });

  it.each([
    [{ floor: false, wallsRoof: true, exterior: false }],
    [{ floor: true, wallsRoof: false, exterior: true }],
    [{ floor: false, wallsRoof: true, exterior: true }],
    [{ floor: false, wallsRoof: false, exterior: false }],
  ])("returns null for the custom combination %j", (selection) => {
    expect(scopeFromZones(selection)).toBeNull();
  });

  it("detects an empty selection", () => {
    expect(hasAnyZone({ floor: false, wallsRoof: false, exterior: false })).toBe(false);
    expect(hasAnyZone({ floor: false, wallsRoof: false, exterior: true })).toBe(true);
  });
});
