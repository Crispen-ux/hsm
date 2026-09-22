import {
  CONTAINER_SCOPES,
  CONTAINER_SIZES,
  SERVICE_INTERESTS,
  SERVICE_LOCATIONS,
  type ContainerScope,
  type ContainerSize,
  type ServiceInterest,
  type ServiceLocation,
} from "@/lib/domain";

export interface QuotePrefill {
  service?: ServiceInterest;
  size?: ContainerSize;
  scope?: ContainerScope;
  quantity?: number;
  location?: ServiceLocation;
}

function pick<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

export function buildQuoteHref(prefill: QuotePrefill): string {
  const params = new URLSearchParams();
  if (prefill.service) {
    params.set("service", prefill.service);
  }
  if (prefill.size) {
    params.set("size", prefill.size);
  }
  if (prefill.scope) {
    params.set("scope", prefill.scope);
  }
  if (prefill.quantity !== undefined) {
    params.set("qty", String(prefill.quantity));
  }
  if (prefill.location) {
    params.set("location", prefill.location);
  }
  const query = params.toString();
  return `/${query ? `?${query}` : ""}#quote`;
}

export function parseQuotePrefill(search: string): QuotePrefill {
  const params = new URLSearchParams(search);
  const prefill: QuotePrefill = {};

  const service = pick(SERVICE_INTERESTS, params.get("service"));
  const size = pick(CONTAINER_SIZES, params.get("size"));
  const scope = pick(CONTAINER_SCOPES, params.get("scope"));
  const location = pick(SERVICE_LOCATIONS, params.get("location"));
  const rawQuantity = params.get("qty");
  const quantity = rawQuantity !== null && /^\d{1,2}$/.test(rawQuantity) ? Number(rawQuantity) : undefined;

  if (service) {
    prefill.service = service;
  }
  if (size) {
    prefill.size = size;
  }
  if (scope) {
    prefill.scope = scope;
  }
  if (location) {
    prefill.location = location;
  }
  if (quantity !== undefined && quantity >= 1 && quantity <= 50) {
    prefill.quantity = quantity;
  }
  return prefill;
}
