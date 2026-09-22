export const JOB_TYPES = ["VEHICLE", "CONTAINER", "INDUSTRIAL"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const CONTAINER_SIZES = ["FT20", "FT40", "FT40_HC", "OTHER"] as const;
export type ContainerSize = (typeof CONTAINER_SIZES)[number];

export const CONTAINER_SCOPES = ["FLOOR_ONLY", "INTERIOR_FULL", "EXTERIOR_ONLY", "FULL_SHELL"] as const;
export type ContainerScope = (typeof CONTAINER_SCOPES)[number];

export const SERVICE_LOCATIONS = ["ON_SITE", "IN_YARD"] as const;
export type ServiceLocation = (typeof SERVICE_LOCATIONS)[number];

export const LINE_UNITS = ["EACH", "SQM"] as const;
export type LineUnit = (typeof LINE_UNITS)[number];

export const SERVICE_INTERESTS = [
  "BAKKIE_BED",
  "FULL_VEHICLE",
  "TRAILER",
  "CONTAINER",
  "INDUSTRIAL",
  "OTHER",
] as const;
export type ServiceInterest = (typeof SERVICE_INTERESTS)[number];

export const NON_CONTAINER_INTERESTS = [
  "BAKKIE_BED",
  "FULL_VEHICLE",
  "TRAILER",
  "INDUSTRIAL",
  "OTHER",
] as const;

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "PAID", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const ROLES = ["CREW", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const SPAN_KINDS = [
  "jobType",
  "vehicle",
  "tier",
  "size",
  "scope",
  "quantity",
  "deposit",
  "phone",
  "name",
  "location",
] as const;
export type SpanKind = (typeof SPAN_KINDS)[number];

export const CONTAINER_SIZE_LABELS: Readonly<Record<ContainerSize, string>> = {
  FT20: "20ft",
  FT40: "40ft",
  FT40_HC: "40ft High Cube",
  OTHER: "Other size",
};

export const CONTAINER_SCOPE_LABELS: Readonly<Record<ContainerScope, string>> = {
  FLOOR_ONLY: "Floor only",
  INTERIOR_FULL: "Full interior",
  EXTERIOR_ONLY: "Exterior only",
  FULL_SHELL: "Full shell",
};

export const SERVICE_LOCATION_LABELS: Readonly<Record<ServiceLocation, string>> = {
  ON_SITE: "On-site",
  IN_YARD: "In-yard",
};
