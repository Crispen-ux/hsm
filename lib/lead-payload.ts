const VEHICLE_ONLY_FIELDS: readonly string[] = ["vehicleMake", "vehicleModel"];
const CONTAINER_ONLY_FIELDS: readonly string[] = [
  "containerSize",
  "containerScope",
  "containerQuantity",
  "serviceLocation",
  "siteLocation",
  "siteAccessNotes",
];

export function normalizeLeadPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const dropped = raw.serviceInterest === "CONTAINER" ? VEHICLE_ONLY_FIELDS : CONTAINER_ONLY_FIELDS;
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !dropped.includes(key)));
}
