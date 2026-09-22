import type { ContainerScope, ContainerSize, JobType, ServiceLocation, SpanKind } from "@/lib/domain";
import { MAX_CENTS, parseRandsToCents } from "@/lib/money";
import { normalizeSaPhone } from "@/lib/phone";
import { CONTAINER_SCOPE_RATES, VEHICLE_TIERS, type TierKey, type VehicleTier } from "@/lib/pricing-tiers";
import { sanitizeText } from "@/lib/sanitize";
import type { ParsedSpan, ParsedSpeech } from "@/lib/validations";
import { VEHICLE_MAP } from "@/lib/vehicle-map";

const SPOKEN_DIGITS: Readonly<Record<string, string>> = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

const UNITS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const TEENS: Readonly<Record<string, number>> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Readonly<Record<string, number>> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const MIN_SPOKEN_PHONE_DIGITS = 7;

function isNumberWord(token: string): boolean {
  return token in UNITS || token in TEENS || token in TENS || token === "hundred" || token === "thousand";
}

function isSpokenDigit(token: string): boolean {
  return token in SPOKEN_DIGITS || /^\d$/.test(token);
}

function collapseSpokenDigits(tokens: readonly string[]): string[] {
  const output: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    let end = index;
    let digits = "";
    while (end < tokens.length) {
      const token = tokens[end] as string;
      if (!isSpokenDigit(token)) {
        break;
      }
      digits += SPOKEN_DIGITS[token] ?? token;
      end += 1;
    }

    if (end - index >= MIN_SPOKEN_PHONE_DIGITS) {
      output.push(digits);
      index = end;
    } else {
      output.push(tokens[index] as string);
      index += 1;
    }
  }

  return output;
}

interface NumberRun {
  value: number;
  next: number;
}

function parseNumberRun(tokens: readonly string[], start: number): NumberRun | null {
  let total = 0;
  let current = 0;
  let index = start;
  let consumed = false;

  while (index < tokens.length) {
    const token = tokens[index] as string;

    if (token === "and") {
      const following = tokens[index + 1];
      const joinsNumber =
        consumed &&
        (current >= 100 || total > 0) &&
        following !== undefined &&
        isNumberWord(following) &&
        following !== "hundred" &&
        following !== "thousand";
      if (!joinsNumber) {
        break;
      }
      index += 1;
      continue;
    }

    const unit = UNITS[token];
    const teen = TEENS[token];
    const tens = TENS[token];

    if (unit !== undefined) {
      const canAttach = current % 100 === 0 || (current % 10 === 0 && current % 100 >= 20);
      if (!canAttach) {
        break;
      }
      current += unit;
    } else if (teen !== undefined) {
      if (current % 100 !== 0) {
        break;
      }
      current += teen;
    } else if (tens !== undefined) {
      if (current % 100 !== 0) {
        break;
      }
      current += tens;
    } else if (token === "hundred") {
      if (current > 0 && current < 100) {
        current *= 100;
      } else if (current === 0 && !consumed) {
        current = 100;
      } else {
        break;
      }
    } else if (token === "thousand") {
      if (total > 0 && current === 0) {
        break;
      }
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else {
      break;
    }

    consumed = true;
    index += 1;
  }

  return consumed ? { value: total + current, next: index } : null;
}

function convertNumberWords(tokens: readonly string[]): string[] {
  const output: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const run = parseNumberRun(tokens, index);
    if (run) {
      output.push(String(run.value));
      index = run.next;
    } else {
      output.push(tokens[index] as string);
      index += 1;
    }
  }

  return output;
}

export function normalizeTranscript(input: string): string {
  const cleaned = sanitizeText(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ");
  const tokens = cleaned.split(/\s+/).filter((token) => token.length > 0);
  return convertNumberWords(collapseSpokenDigits(tokens)).join(" ");
}

const FOOT = String.raw`(?:ft|foot|feet|footer|footers)`;
const SIZE_QUANTITY = String.raw`(?:(\d{1,3})\s*(?:x\s*)?)?`;
const SIZE_TAIL = String.raw`(?:\s*(?:containers?|units?))?`;

interface SizeMatcher {
  size: Exclude<ContainerSize, "OTHER">;
  regex: RegExp;
}

function sizeMatcher(size: SizeMatcher["size"], source: string): SizeMatcher {
  return { size, regex: new RegExp(String.raw`\b${SIZE_QUANTITY}(?:${source})${SIZE_TAIL}\b`) };
}

const SIZE_MATCHERS: readonly SizeMatcher[] = [
  sizeMatcher("FT40_HC", String.raw`(?:40\s*${FOOT}\s*)?(?:high\s*cubes?|hi\s*cubes?|hc)|40\s*hc`),
  sizeMatcher("FT40", String.raw`40\s*${FOOT}|12\s*m(?:etres?|eters?)?`),
  sizeMatcher("FT20", String.raw`20\s*${FOOT}|6\s*m(?:etres?|eters?)?`),
];

const CONTAINER_HINT = /\b(?:containers?|shipping|tins?)\b/;
const VEHICLE_HINT = /\b(?:bakkies?|trailers?|suv)\b/;
const INDUSTRIAL_HINT = /\b(?:industrial|tanks?|truck\s+deck|plant\s+floor)\b/;

const SCOPE_MATCHERS: ReadonlyArray<{ scope: ContainerScope; regex: RegExp }> = [
  {
    scope: "FULL_SHELL",
    regex: /\b(?:full\s+shell|inside\s+(?:and|n)\s+(?:out|outside)|everything|complete|full)\b/,
  },
  { scope: "INTERIOR_FULL", regex: /\b(?:walls\s+and\s+floor|inside|interior|inner|internal)\b/ },
  { scope: "EXTERIOR_ONLY", regex: /\b(?:outside|exterior|outer|external|skin)\b/ },
  { scope: "FLOOR_ONLY", regex: /\b(?:floor(?:\s+only)?|base)\b/ },
];

const LOCATION_MATCHERS: ReadonlyArray<{ location: ServiceLocation; regex: RegExp }> = [
  { location: "ON_SITE", regex: /\b(?:on\s*site|at\s+(?:the\s+)?site|we\s+come|come\s+to\s+(?:him|her|them|site))\b/ },
  {
    location: "IN_YARD",
    regex:
      /\b(?:in\s*(?:the\s+)?yard|at\s+(?:your\s+|the\s+)?yard|drop\s*off|drop(?:s|ping)?\s+(?:it|them)\s+off|bring(?:s|ing)?\s+(?:it|them))\b/,
  },
];

const AMOUNT = String.raw`(\d{1,3}(?: \d{3})+|\d+)`;
const RAND_PREFIX = String.raw`(?:r|rands?)?\s*`;
const DEPOSIT_AFTER = new RegExp(String.raw`\bdeposit(?:\s+(?:of|is|was))?\s+${RAND_PREFIX}${AMOUNT}(?:\s*rands?)?\b`);
const DEPOSIT_BEFORE = new RegExp(String.raw`\b${RAND_PREFIX}${AMOUNT}\s*(?:rands?\s*)?(?:as\s+)?(?:a\s+)?deposit\b`);
const PHONE = /(?:\+\s?27|\b27|\b0)(?:\s?\d){9}(?!\d)/;
const SECONDARY_QUANTITY = /\b(\d{1,3})\s*(?:x\s*)?(?:containers?|units?)\b/;
const NAME_CUE = /\b(?:client|customer|name\s+is|called|mister|mr|mrs|ms|for)\s+([a-z]{2,}(?:\s+[a-z]{2,})?)\b/g;

const NAME_STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "my", "his", "her", "their", "this", "that", "it", "them", "him", "we", "they",
  "and", "or", "with", "please", "need", "needs", "want", "wants", "job", "quote", "invoice",
  "is", "was", "of", "to", "in", "at", "on", "off", "full", "half", "shell", "floor", "base",
  "inside", "outside", "interior", "exterior", "inner", "outer", "walls", "skin", "complete", "everything",
  "container", "containers", "unit", "units", "deposit", "phone", "number", "cell", "contact",
  "foot", "feet", "ft", "footer", "high", "cube", "cubes", "hc", "hilux", "lux", "ranger", "navara",
  "amarok", "fortuner", "cruiser", "land", "max", "site", "yard", "drop", "bring", "come", "only",
  "rand", "rands", "just", "also", "then", "shipping", "trailer", "bakkie", "suv",
]);

const FILLER_WORDS: ReadonlySet<string> = new Set([
  "and", "the", "a", "an", "please", "um", "uh", "uhm", "er", "ok", "okay", "for", "of", "with", "is", "was",
  "to", "it", "its", "i", "we", "they", "he", "she", "you", "need", "needs", "want", "wants", "do", "done",
  "job", "quote", "invoice", "client", "customer", "name", "called", "mr", "mrs", "ms", "mister", "phone",
  "number", "cell", "contact", "on", "in", "at", "s", "x", "r", "rand", "rands", "unit", "units", "container",
  "containers", "only", "just", "also", "then", "his", "her", "their", "my",
]);

interface Cursor {
  text: string;
  spans: ParsedSpan[];
}

function blank(text: string, start: number, length: number): string {
  return `${text.slice(0, start)} | ${text.slice(start + length)}`;
}

function take(cursor: Cursor, pattern: RegExp, kind: SpanKind): RegExpExecArray | null {
  const match = pattern.exec(cursor.text);
  if (!match) {
    return null;
  }
  cursor.text = blank(cursor.text, match.index, match[0].length);
  cursor.spans.push({ kind, text: match[0].trim() });
  return match;
}

function takePhone(cursor: Cursor): string | null {
  const match = PHONE.exec(cursor.text);
  if (!match) {
    return null;
  }
  const normalized = normalizeSaPhone(match[0]);
  if (normalized === null) {
    return null;
  }
  cursor.text = blank(cursor.text, match.index, match[0].length);
  cursor.spans.push({ kind: "phone", text: match[0].trim() });
  return normalized;
}

function takeDeposit(cursor: Cursor): number | null {
  const match = take(cursor, DEPOSIT_AFTER, "deposit") ?? take(cursor, DEPOSIT_BEFORE, "deposit");
  if (!match || match[1] === undefined) {
    return null;
  }
  const cents = parseRandsToCents(match[1]);
  return cents !== null && cents <= MAX_CENTS ? cents : null;
}

function detectJobType(text: string): JobType | null {
  if (CONTAINER_HINT.test(text) || SIZE_MATCHERS.some((matcher) => matcher.regex.test(text))) {
    return "CONTAINER";
  }
  if (VEHICLE_HINT.test(text) || VEHICLE_MAP.some((vehicle) => vehicle.pattern.test(text))) {
    return "VEHICLE";
  }
  if (INDUSTRIAL_HINT.test(text)) {
    return "INDUSTRIAL";
  }
  return null;
}

function toValidQuantity(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }
  const quantity = Number(raw);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 50 ? quantity : null;
}

interface ContainerExtraction {
  size: ContainerSize | null;
  scope: ContainerScope | null;
  quantity: number | null;
}

function extractContainer(cursor: Cursor): ContainerExtraction {
  let size: ContainerSize | null = null;
  let quantity: number | null = null;

  for (const matcher of SIZE_MATCHERS) {
    const match = take(cursor, matcher.regex, "size");
    if (match) {
      size = matcher.size;
      quantity = toValidQuantity(match[1]);
      break;
    }
  }

  if (quantity === null) {
    const match = SECONDARY_QUANTITY.exec(cursor.text);
    const secondary = toValidQuantity(match?.[1]);
    if (match && secondary !== null) {
      cursor.text = blank(cursor.text, match.index, match[0].length);
      cursor.spans.push({ kind: "quantity", text: match[0].trim() });
      quantity = secondary;
    }
  }

  let scope: ContainerScope | null = null;
  for (const matcher of SCOPE_MATCHERS) {
    if (take(cursor, matcher.regex, "scope")) {
      scope = matcher.scope;
      break;
    }
  }

  return { size, scope, quantity };
}

interface VehicleExtraction {
  label: string | null;
  tier: VehicleTier | null;
}

const VEHICLE_TIER_MATCHERS: ReadonlyArray<{ tier: VehicleTier; regex: RegExp }> = VEHICLE_TIERS.map((tier) => ({
  tier,
  regex: new RegExp(String.raw`\b(?:${tier.spoken.join("|")})\b`),
}));

function extractVehicle(cursor: Cursor): VehicleExtraction {
  let label: string | null = null;
  for (const vehicle of VEHICLE_MAP) {
    if (take(cursor, vehicle.pattern, "vehicle")) {
      label = vehicle.label;
      break;
    }
  }

  let tier: VehicleTier | null = null;
  for (const matcher of VEHICLE_TIER_MATCHERS) {
    if (take(cursor, matcher.regex, "tier")) {
      tier = matcher.tier;
      break;
    }
  }

  return { label, tier };
}

function titleCase(words: readonly string[]): string {
  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
}

function takeName(cursor: Cursor): string | null {
  for (const match of cursor.text.matchAll(NAME_CUE)) {
    const captured = match[1];
    if (captured === undefined) {
      continue;
    }
    const [first, second] = captured.split(/\s+/);
    if (first === undefined || NAME_STOP_WORDS.has(first)) {
      continue;
    }
    const words = second !== undefined && !NAME_STOP_WORDS.has(second) ? [first, second] : [first];
    const consumedLength = match[0].length - captured.length + words.join(" ").length;
    cursor.text = blank(cursor.text, match.index ?? 0, consumedLength);
    cursor.spans.push({ kind: "name", text: words.join(" ") });
    return titleCase(words);
  }
  return null;
}

function collectUnmatched(text: string): string[] {
  return text
    .split("|")
    .map((segment) =>
      segment
        .split(/\s+/)
        .filter((word) => word.length > 0 && !FILLER_WORDS.has(word))
        .join(" "),
    )
    .filter((segment) => segment.length > 0);
}

function computeConfidence(
  jobType: JobType | null,
  container: ContainerExtraction,
  vehicle: VehicleExtraction,
): number {
  let required = 0;
  let matched = 0;

  if (jobType === "CONTAINER") {
    required = 3;
    matched = [container.size, container.scope, container.quantity].filter((value) => value !== null).length;
  } else if (jobType === "VEHICLE") {
    required = 2;
    matched = [vehicle.label, vehicle.tier].filter((value) => value !== null).length;
  } else if (jobType === "INDUSTRIAL") {
    required = 1;
    matched = 1;
  }

  return required === 0 ? 0 : Math.round((matched * 100) / required);
}

export function parseSpeech(input: string): ParsedSpeech {
  const cursor: Cursor = { text: normalizeTranscript(input), spans: [] };

  const clientPhone = takePhone(cursor);
  const depositCents = takeDeposit(cursor);
  const jobType = detectJobType(cursor.text);

  const emptyContainer: ContainerExtraction = { size: null, scope: null, quantity: null };
  const emptyVehicle: VehicleExtraction = { label: null, tier: null };

  const container = jobType === "CONTAINER" ? extractContainer(cursor) : emptyContainer;
  const vehicle = jobType === "VEHICLE" ? extractVehicle(cursor) : emptyVehicle;

  let serviceLocation: ServiceLocation | null = null;
  for (const matcher of LOCATION_MATCHERS) {
    if (take(cursor, matcher.regex, "location")) {
      serviceLocation = matcher.location;
      break;
    }
  }

  const clientName = takeName(cursor);

  const tierKey: TierKey | null =
    jobType === "CONTAINER" && container.scope !== null
      ? CONTAINER_SCOPE_RATES[container.scope].key
      : (vehicle.tier?.key ?? null);

  return {
    jobType,
    vehicleLabel: vehicle.label,
    tierKey,
    containerSize: container.size,
    containerScope: container.scope,
    quantity: container.quantity,
    serviceLocation,
    depositCents,
    clientName,
    clientPhone,
    confidence: computeConfidence(jobType, container, vehicle),
    unmatched: collectUnmatched(cursor.text),
    spans: cursor.spans.slice(0, 50),
  };
}
