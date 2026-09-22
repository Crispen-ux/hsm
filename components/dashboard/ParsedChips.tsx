import { CONTAINER_SCOPE_LABELS, CONTAINER_SIZE_LABELS, SERVICE_LOCATION_LABELS } from "@/lib/domain";
import { formatZar } from "@/lib/money";
import { VEHICLE_TIERS } from "@/lib/pricing-tiers";
import type { ParsedSpeech } from "@/lib/validations";

interface Chip {
  label: string;
  value: string;
  target: string;
}

function chipsFor(parsed: ParsedSpeech): Chip[] {
  const chips: Chip[] = [];
  const tier = VEHICLE_TIERS.find((candidate) => candidate.key === parsed.tierKey);

  if (parsed.vehicleLabel) {
    chips.push({ label: "Vehicle", value: parsed.vehicleLabel, target: "f-vehicleDetails" });
  }
  if (tier) {
    chips.push({ label: "Tier", value: tier.priceCents === null ? tier.label : `${tier.label}, ${formatZar(tier.priceCents)}`, target: "f-vehicleTierKey" });
  }
  if (parsed.containerSize) {
    chips.push({ label: "Size", value: CONTAINER_SIZE_LABELS[parsed.containerSize], target: "f-containerSize" });
  }
  if (parsed.containerScope) {
    chips.push({ label: "Scope", value: CONTAINER_SCOPE_LABELS[parsed.containerScope], target: "f-containerScope" });
  }
  if (parsed.quantity !== null) {
    chips.push({ label: "Quantity", value: String(parsed.quantity), target: "f-containerQuantity" });
  }
  if (parsed.serviceLocation) {
    chips.push({ label: "Where", value: SERVICE_LOCATION_LABELS[parsed.serviceLocation], target: "f-serviceLocation" });
  }
  if (parsed.clientName) {
    chips.push({ label: "Client", value: parsed.clientName, target: "f-clientName" });
  }
  if (parsed.clientPhone) {
    chips.push({ label: "Phone", value: parsed.clientPhone, target: "f-clientPhone" });
  }
  if (parsed.depositCents !== null) {
    chips.push({ label: "Deposit", value: formatZar(parsed.depositCents), target: "f-deposit" });
  }
  return chips;
}

export function ParsedChips({ parsed }: { parsed: ParsedSpeech }) {
  const chips = chipsFor(parsed);
  if (chips.length === 0 && parsed.unmatched.length === 0) {
    return null;
  }
  return (
    <div className="mt-4" aria-label="What was understood" data-testid="parsed-chips">
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={`${chip.label}-${chip.value}`}>
            <button
              type="button"
              onClick={() => document.getElementById(chip.target)?.focus()}
              className="chamfer min-h-[44px] border border-hawk-obsidian-border bg-hawk-obsidian-card px-3 text-left text-sm"
            >
              <span className="text-zinc-400">{chip.label}: </span>
              <span className="font-mono text-zinc-50">{chip.value}</span>
            </button>
          </li>
        ))}
        {parsed.unmatched.map((fragment) => (
          <li key={`unmatched-${fragment}`} className="inline-flex min-h-[44px] items-center border border-dashed border-hawk-gold px-3 text-sm text-hawk-gold">
            Not understood: {fragment}
          </li>
        ))}
      </ul>
    </div>
  );
}
