interface Layer {
  name: string;
  detail: string;
  offset: number;
  fill: string;
  highlight?: string;
}

const LAYERS: readonly Layer[] = [
  { name: "Substrate", detail: "The vehicle panel, container steel or industrial surface being protected.", offset: 0, fill: "#52525b" },
  { name: "Primer", detail: "Bonds the coating to the prepared surface.", offset: 9, fill: "#a1a1aa" },
  { name: "Polyurethane layer", detail: "The sprayed body of the coating that takes the wear.", offset: 44, fill: "#141417", highlight: "#b91c1c" },
  { name: "Topcoat", detail: "The finishing surface layer.", offset: 52, fill: "#26262b", highlight: "#71717a" },
];

const PERIOD = 60;
const PERIODS = 8;
const WIDTH = PERIODS * PERIOD;
const BASE_Y = 150;
const PEAK_Y = 120;
const TOP = 40;
const BOTTOM = 240;

function profile(offset: number): string {
  const points: string[] = [];
  for (let index = 0; index < PERIODS; index += 1) {
    const x = index * PERIOD;
    points.push(`${x},${BASE_Y - offset}`, `${x + 10},${PEAK_Y - offset}`, `${x + 30},${PEAK_Y - offset}`, `${x + 40},${BASE_Y - offset}`);
  }
  points.push(`${WIDTH},${BASE_Y - offset}`);
  return points.join(" ");
}

export function CoatingCrossSection() {
  const drawOrder = [...LAYERS].reverse();
  return (
    <div className="grid items-center gap-10 md:grid-cols-12">
      <figure className="md:col-span-7">
        <div
          className="relative w-full"
          style={{ aspectRatio: `${WIDTH} / ${BOTTOM - TOP}` }}
          role="img"
          aria-label="Cross-section of a coating on corrugated steel: substrate, primer, polyurethane layer and topcoat"
        >
          {drawOrder.map((layer) => (
            <svg
              key={layer.name}
              viewBox={`0 ${TOP} ${WIDTH} ${BOTTOM - TOP}`}
              className="layer-reveal absolute inset-0 h-full w-full"
              style={{ "--layer": LAYERS.indexOf(layer) }}
              aria-hidden
            >
              <polygon points={`${profile(layer.offset)} ${WIDTH},${BOTTOM} 0,${BOTTOM}`} fill={layer.fill} />
              {layer.highlight ? (
                <polyline points={profile(layer.offset)} fill="none" stroke={layer.highlight} strokeWidth="1.5" strokeLinejoin="round" />
              ) : null}
            </svg>
          ))}
        </div>
        <figcaption className="mt-3 text-sm text-zinc-400">Illustration only, not to scale.</figcaption>
      </figure>
      <ol className="space-y-6 md:col-span-5">
        {drawOrder.map((layer) => (
          <li key={layer.name} className="flex gap-4">
            <span className="mt-2 h-3 w-3 shrink-0" style={{ background: layer.highlight ?? layer.fill, outline: "1px solid #3f3f46" }} aria-hidden />
            <div>
              <p className="font-semibold text-zinc-100">{layer.name}</p>
              <p className="text-zinc-400">{layer.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
