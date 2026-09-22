const RIB_COUNT = 16;
const RIB_WIDTH = 40;
const RAIL_HEIGHT = 30;
const WALL_HEIGHT = 420;

const ribs = Array.from({ length: RIB_COUNT }, (_, index) => index * RIB_WIDTH);

export function CoatingPass({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 420"
      className={className}
      role="img"
      aria-label="A spray pass coating a corrugated steel container wall in black polyurethane"
    >
      <defs>
        <linearGradient id="pass-bare-peak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a8a93" />
          <stop offset="0.5" stopColor="#5f5f67" />
          <stop offset="1" stopColor="#4a4a51" />
        </linearGradient>
        <linearGradient id="pass-bare-valley" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2c2c31" />
          <stop offset="1" stopColor="#3a3a40" />
        </linearGradient>
        <linearGradient id="pass-coat-peak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3d3d45" />
          <stop offset="0.3" stopColor="#1a1a1e" />
          <stop offset="1" stopColor="#0e0e10" />
        </linearGradient>
        <linearGradient id="pass-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="0.2" stopColor="#000" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <filter id="pass-glow" x="-200%" y="-5%" width="500%" height="110%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <g>
        {ribs.map((x) => (
          <g key={x}>
            <rect x={x} y="0" width="20" height={WALL_HEIGHT} fill="url(#pass-bare-peak)" />
            <rect x={x + 20} y="0" width="20" height={WALL_HEIGHT} fill="url(#pass-bare-valley)" />
          </g>
        ))}
        <rect x="0" y="0" width="640" height={RAIL_HEIGHT} fill="#3f3f46" />
        <rect x="0" y={WALL_HEIGHT - RAIL_HEIGHT} width="640" height={RAIL_HEIGHT} fill="#3f3f46" />
      </g>

      <g className="pass-coat">
        {ribs.map((x) => (
          <g key={x}>
            <rect x={x} y="0" width="20" height={WALL_HEIGHT} fill="url(#pass-coat-peak)" />
            <rect x={x + 3} y="0" width="1.5" height={WALL_HEIGHT} fill="#ffffff" opacity="0.22" />
            <rect x={x + 20} y="0" width="20" height={WALL_HEIGHT} fill="#08080a" />
          </g>
        ))}
        <rect x="0" y="0" width="640" height={RAIL_HEIGHT} fill="#101013" />
        <rect x="0" y={WALL_HEIGHT - RAIL_HEIGHT} width="640" height={RAIL_HEIGHT} fill="#101013" />
      </g>

      <rect x="0" y="0" width="640" height={WALL_HEIGHT} fill="url(#pass-shade)" />

      <g className="pass-head">
        <rect x="-8" y="0" width="14" height={WALL_HEIGHT} fill="#b91c1c" opacity="0.55" filter="url(#pass-glow)" />
        <rect x="-1" y="0" width="2" height={WALL_HEIGHT} fill="#ef4444" />
      </g>
    </svg>
  );
}
