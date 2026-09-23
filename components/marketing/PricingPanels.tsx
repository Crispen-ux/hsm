import { ContainerConfigurator } from "@/components/marketing/ContainerConfigurator";
import { ButtonLink } from "@/components/ui/Button";
import { ChamferCard } from "@/components/ui/ChamferCard";
import { formatZar, splitZar } from "@/lib/money";
import { VEHICLE_TIERS, type VehicleTier } from "@/lib/pricing-tiers";
import { buildQuoteHref } from "@/lib/quote-link";

const TABS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "vehicles", label: "Vehicles" },
  { id: "containers", label: "Containers" },
  { id: "industrial", label: "Industrial" },
];

function Price({ cents }: { cents: number | null }) {
  if (cents === null) {
    return <p className="text-2xl text-zinc-200">Price on request</p>;
  }
  const parts = splitZar(cents);
  const groups = parts.whole.split("\u00A0");
  return (
    <p className="font-mono tabular-nums text-zinc-50">
      <span className="sr-only">{formatZar(cents)}</span>
      <span className="flex items-start" aria-hidden>
        <span className="mr-1 mt-2 text-xl text-zinc-400">{parts.symbol}</span>
        <span className="text-5xl">
          {groups.map((group, index) => (
            <span key={`${index}-${group}`} className={index > 0 ? "ml-[0.22em]" : undefined}>
              {group}
            </span>
          ))}
        </span>
        <span className="ml-1 mt-2 text-xl text-zinc-400">{parts.cents}</span>
      </span>
    </p>
  );
}

function TierPlate({ tier }: { tier: VehicleTier }) {
  return (
    <ChamferCard featured={tier.featured} innerClassName="p-6 sm:p-8">
      <h3 className="display-narrow text-chrome text-4xl">{tier.label}</h3>
      <div className="mt-6">
        <Price cents={tier.priceCents} />
      </div>
      <div className="mt-6 text-zinc-400">
        {tier.includes.length > 0 ? (
          <ul className="space-y-2">
            {tier.includes.map((item) => (
              <li key={item} className="text-zinc-300">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p>What is included is confirmed with your quote.</p>
        )}
      </div>
      <ButtonLink href={buildQuoteHref({ service: "FULL_VEHICLE" })} className="mt-8 w-full">
        Get a quote for {tier.label}
      </ButtonLink>
    </ChamferCard>
  );
}

export function PricingPanels() {
  return (
    <div className="tabs">
      <nav aria-label="Pricing categories" className="flex gap-1 border-b border-hawk-obsidian-border">
        {TABS.map((tab) => (
          <a key={tab.id} href={`#${tab.id}`} className="tab-link">
            {tab.label}
          </a>
        ))}
      </nav>

      <div className="tab-panels mt-10">
        <section id="vehicles" className="tab-panel" aria-labelledby="vehicles-title">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 id="vehicles-title" className="display-wide text-chrome text-3xl">
                Vehicles
              </h2>
              <p className="mt-4 text-zinc-400">
                Bakkies, SUVs and trailers are priced by tier, so you know the cost before we start.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
              {VEHICLE_TIERS.map((tier) => (
                <TierPlate key={tier.key} tier={tier} />
              ))}
            </div>
          </div>
        </section>

        <section id="containers" className="tab-panel" aria-labelledby="containers-title">
          <h2 id="containers-title" className="display-wide text-chrome text-3xl">
            Containers
          </h2>
          <p className="mb-10 mt-4 max-w-[60ch] text-zinc-400">
            Choose the size, the surfaces and how many. Container work is priced by the area we coat.
          </p>
          <ContainerConfigurator />
        </section>

        <section id="industrial" className="tab-panel" aria-labelledby="industrial-title">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 id="industrial-title" className="display-wide text-chrome text-3xl">
                Industrial
              </h2>
              <p className="mt-4 text-zinc-400">
                Tanks, truck decks and plant floors vary too much for a fixed price. We look at the surface, then quote.
              </p>
              <ButtonLink href={buildQuoteHref({ service: "INDUSTRIAL" })} className="mt-8">
                Request an inspection quote
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
