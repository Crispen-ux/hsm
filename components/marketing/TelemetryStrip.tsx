import { SITE_CONFIG } from "@/lib/site-config";

interface Figure {
  label: string;
  value: number;
}

function collectFigures(): Figure[] {
  const { telemetry } = SITE_CONFIG;
  const candidates: ReadonlyArray<{ label: string; value: number | null }> = [
    { label: "Years of warranty", value: telemetry.warrantyYears },
    { label: "Vehicles coated", value: telemetry.vehiclesCoated },
    { label: "Containers coated", value: telemetry.containersCoated },
    { label: "Hours to respond", value: telemetry.responseHours },
  ];
  return candidates.flatMap((candidate) =>
    candidate.value === null ? [] : [{ label: candidate.label, value: candidate.value }],
  );
}

export function TelemetryStrip() {
  const figures = collectFigures();
  if (figures.length === 0) {
    return null;
  }
  return (
    <dl className="grid grid-cols-2 gap-px border border-hawk-obsidian-border bg-hawk-obsidian-border md:grid-cols-4">
      {figures.map((figure) => (
        <div key={figure.label} className="bg-hawk-obsidian-bg px-5 py-6">
          <dd className="font-mono text-4xl tabular-nums text-zinc-50">
            <span className="sr-only">{figure.value}</span>
            <span className="count-up" style={{ "--target": figure.value }} aria-hidden />
          </dd>
          <dt className="mt-1 text-sm text-zinc-400">{figure.label}</dt>
        </div>
      ))}
    </dl>
  );
}
