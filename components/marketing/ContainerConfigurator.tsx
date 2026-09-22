"use client";

import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { formatSqm, suggestedAreaMilli } from "@/lib/container-specs";
import { indicativeContainerQuote } from "@/lib/container-quote";
import { hasAnyZone, scopeFromZones, zonesFromScope, type ZoneSelection } from "@/lib/container-zones";
import { CONTAINER_SCOPE_LABELS, type ContainerSize, type ServiceLocation } from "@/lib/domain";
import { formatZar } from "@/lib/money";
import { buildQuoteHref, type QuotePrefill } from "@/lib/quote-link";
import { formatQuoteWhatsAppMessage, buildQuoteShareMessage } from "@/lib/quote-whatsapp";
import { whatsappHref, SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/cn";

type ZoneKey = keyof ZoneSelection;

const SIZE_OPTIONS: ReadonlyArray<{ value: Exclude<ContainerSize, "OTHER">; label: string; heightPx: number }> = [
  { value: "FT20", label: "20ft", heightPx: 259 },
  { value: "FT40", label: "40ft", heightPx: 259 },
  { value: "FT40_HC", label: "40ft high cube", heightPx: 290 },
];

const ZONE_LABELS: Readonly<Record<ZoneKey, string>> = {
  floor: "Floor",
  wallsRoof: "Walls and roof",
  exterior: "Exterior",
};

const ZONE_KEYS: readonly ZoneKey[] = ["floor", "wallsRoof", "exterior"];
const MAX_QUANTITY = 50;
const GROUND = 300;
const LEFT = 58;
const WIDTH = 244;
const WALL = 14;
const LINING = 12;

function zoneStyle(selected: boolean) {
  return selected
    ? { fill: "url(#hawk-hatch)", stroke: "#b91c1c", strokeWidth: 1.5 }
    : { fill: "rgba(255,255,255,0.04)", stroke: "#52525b", strokeWidth: 1.5, strokeDasharray: "4 3" };
}

export function ContainerConfigurator() {
  const [size, setSize] = useState<Exclude<ContainerSize, "OTHER">>("FT40");
  const [quantity, setQuantity] = useState(1);
  const [zones, setZones] = useState<ZoneSelection>(zonesFromScope("FLOOR_ONLY"));
  const [location, setLocation] = useState<ServiceLocation>("ON_SITE");

  const scope = scopeFromZones(zones);
  const height = SIZE_OPTIONS.find((option) => option.value === size)?.heightPx ?? 259;
  const top = GROUND - height;

  const areaMilli = scope === null ? null : suggestedAreaMilli(size, scope);
  const quote = useMemo(
    () => (scope === null ? null : indicativeContainerQuote({ size, scope, quantity, location })),
    [scope, size, quantity, location],
  );

  const toggle = (key: ZoneKey) => setZones((previous) => ({ ...previous, [key]: !previous[key] }));
  const step = (delta: number) => setQuantity((current) => Math.min(MAX_QUANTITY, Math.max(1, current + delta)));

  const href = buildQuoteHref({
    service: "CONTAINER",
    size,
    ...(scope ? { scope } : {}),
    quantity,
    location,
  });

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <div className="chamfer-2 plate">
          <div className="chamfer-2 plate-inner corrugated p-4 sm:p-6">
            <svg viewBox={`24 -24 312 ${GROUND + 34}`} className="w-full" role="img" aria-label={`Cross-section of a ${size === "FT40_HC" ? "40ft high cube" : size === "FT40" ? "40ft" : "20ft"} container showing the floor, walls and roof, and exterior surfaces`}>
              <defs>
                <pattern id="hawk-corrugation" width="8" height="8" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="#2b2b31" />
                  <rect width="4" height="8" fill="#202025" />
                </pattern>
                <pattern id="hawk-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="7" fill="rgba(185,28,28,0.28)" />
                  <line x1="0" y1="0" x2="0" y2="7" stroke="#b91c1c" strokeWidth="2" />
                </pattern>
              </defs>

              <line x1="30" y1={GROUND} x2="330" y2={GROUND} stroke="#3f3f46" strokeWidth="1.5" />
              <rect x={LEFT} y={top} width={WIDTH} height={height} fill="url(#hawk-corrugation)" />
              <rect x={LEFT + WALL} y={top + WALL} width={WIDTH - WALL * 2} height={height - WALL * 2} fill="#060607" />

              <g className="cursor-pointer" onClick={() => toggle("floor")}>
                <rect
                  x={LEFT + WALL}
                  y={GROUND - WALL - LINING}
                  width={WIDTH - WALL * 2}
                  height={LINING}
                  {...zoneStyle(zones.floor)}
                />
              </g>

              <g className="cursor-pointer" onClick={() => toggle("wallsRoof")}>
                <rect x={LEFT + WALL} y={top + WALL} width={WIDTH - WALL * 2} height={LINING} {...zoneStyle(zones.wallsRoof)} />
                <rect
                  x={LEFT + WALL}
                  y={top + WALL + LINING}
                  width={LINING}
                  height={height - WALL * 2 - LINING * 2}
                  {...zoneStyle(zones.wallsRoof)}
                />
                <rect
                  x={LEFT + WIDTH - WALL - LINING}
                  y={top + WALL + LINING}
                  width={LINING}
                  height={height - WALL * 2 - LINING * 2}
                  {...zoneStyle(zones.wallsRoof)}
                />
              </g>

              <g className="cursor-pointer" onClick={() => toggle("exterior")}>
                <path
                  fillRule="evenodd"
                  d={`M${LEFT} ${top}H${LEFT + WIDTH}V${GROUND}H${LEFT}Z M${LEFT + 6} ${top + 6}H${LEFT + WIDTH - 6}V${GROUND - 6}H${LEFT + 6}Z`}
                  {...zoneStyle(zones.exterior)}
                />
              </g>

              <g fontSize="11" fill="#a1a1aa" fontFamily="var(--font-inter), system-ui, sans-serif" textAnchor="middle" pointerEvents="none">
                <text x={LEFT + WIDTH / 2} y={top + WALL + LINING + 24}>Walls and roof</text>
                <text x={LEFT + WIDTH / 2} y={GROUND - WALL - LINING - 10}>Floor</text>
                <text x={LEFT} y={top - 8} textAnchor="start">Exterior</text>
              </g>
            </svg>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-400">Section through the container, end on. Tap a surface, or use the switches.</p>
      </div>

      <div className="lg:col-span-6">
        <fieldset>
          <legend className="text-sm text-zinc-300">Container size</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SIZE_OPTIONS.map((option) => (
              <label key={option.value} className="choice-plate">
                <input type="radio" name="config-size" checked={size === option.value} onChange={() => setSize(option.value)} />
                <span className="chamfer">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm text-zinc-300">Surfaces to coat</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {ZONE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={zones[key]}
                onClick={() => toggle(key)}
                className={cn(
                  "chamfer min-h-[48px] border px-3 text-[0.95rem]",
                  zones[key] ? "border-hawk-crimson bg-hawk-crimson/15 text-white" : "border-zinc-800 text-zinc-300 hover:border-zinc-600",
                )}
              >
                {ZONE_LABELS[key]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p id="config-qty-label" className="text-sm text-zinc-300">
              Containers
            </p>
            <div className="mt-2 flex items-center" role="group" aria-labelledby="config-qty-label">
              <button type="button" onClick={() => step(-1)} disabled={quantity <= 1} className="chamfer min-h-[48px] min-w-[48px] border border-zinc-800 text-lg text-zinc-200 disabled:opacity-40" aria-label="One fewer container">
                &minus;
              </button>
              <output aria-live="polite" className="min-w-[3.5rem] text-center font-mono text-xl tabular-nums text-zinc-50">
                {quantity}
              </output>
              <button type="button" onClick={() => step(1)} disabled={quantity >= MAX_QUANTITY} className="chamfer min-h-[48px] min-w-[48px] border border-zinc-800 text-lg text-zinc-200 disabled:opacity-40" aria-label="One more container">
                +
              </button>
            </div>
          </div>
          <fieldset>
            <legend className="text-sm text-zinc-300">Where</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["ON_SITE", "IN_YARD"] as const).map((option) => (
                <label key={option} className="choice-plate">
                  <input type="radio" name="config-location" checked={location === option} onChange={() => setLocation(option)} />
                  <span className="chamfer">{option === "ON_SITE" ? "On-site" : "In-yard"}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-8 border-t border-hawk-obsidian-border pt-6" aria-live="polite">
          <dl className="space-y-3">
            <div className="flex items-baseline gap-3">
              <dt className="text-zinc-300">Scope</dt>
              <span className="spec-leader" aria-hidden />
              <dd className="text-right text-zinc-50">
                {scope ? CONTAINER_SCOPE_LABELS[scope] : hasAnyZone(zones) ? "Custom combination" : "Nothing selected"}
              </dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="text-zinc-300">Approximate area</dt>
              <span className="spec-leader" aria-hidden />
              <dd className="text-right font-mono tabular-nums text-zinc-50">
                {areaMilli === null ? <span className="font-sans text-zinc-400">Confirmed on inspection</span> : formatSqm(areaMilli * quantity)}
              </dd>
            </div>
            {quote ? (
              <>
                <div className="flex items-baseline gap-3">
                  <dt className="text-zinc-300">Subtotal</dt>
                  <span className="spec-leader" aria-hidden />
                  <dd className="text-right font-mono tabular-nums text-zinc-50">{formatZar(quote.subtotalCents)}</dd>
                </div>
                <div className="flex items-baseline gap-3">
                  <dt className="text-zinc-300">VAT 15%</dt>
                  <span className="spec-leader" aria-hidden />
                  <dd className="text-right font-mono tabular-nums text-zinc-50">{formatZar(quote.vatCents)}</dd>
                </div>
                <div className="flex items-baseline gap-3 border-t-2 border-zinc-600 pt-3">
                  <dt className="font-semibold text-zinc-100">Indicative total</dt>
                  <span className="spec-leader" aria-hidden />
                  <dd className="text-right font-mono text-2xl tabular-nums text-white">{formatZar(quote.totalCents)}</dd>
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-3 border-t-2 border-zinc-600 pt-3">
                <dt className="font-semibold text-zinc-100">Price</dt>
                <span className="spec-leader" aria-hidden />
                <dd className="text-right text-zinc-200">Quote on request</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-sm text-zinc-400">
            Container work is priced by area and confirmed after we see the job. Areas shown are approximate.
          </p>
          <ButtonLink href={href} className="mt-6 w-full sm:w-auto">
            Get a quote for this
          </ButtonLink>
          {(() => {
            if (!scope) return null;
            const prefill: QuotePrefill = { service: "CONTAINER", size, scope, quantity, location };
            const msg = formatQuoteWhatsAppMessage({
              jobType: "CONTAINER",
              containerQuoteInput: { size, scope, quantity, location },
              quote,
            });
            const shareMsg = buildQuoteShareMessage(prefill, msg);
            const whatsappUrl = whatsappHref(SITE_CONFIG.contact.whatsappE164, shareMsg);
            return whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block w-full min-h-[48px] border border-zinc-700 px-4 py-3 text-center text-sm text-zinc-100 sm:w-auto"
              >
                Share on WhatsApp
              </a>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}
