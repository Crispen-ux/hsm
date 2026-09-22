# Design plan: "Forged Instrument"

## Tokens
- Obsidian `#050506`, Card `#0c0c0e`, Line `#17171c`: surfaces.
- Crimson `#b91c1c`: cure line, primary action, active state. About 5% of any viewport at most.
- Hazard `#f59e0b`: errors and hazard indicators only.
- Steel: zinc 100 to 600 for text, with the brushed-chrome gradient on display type only.

## Type
- Archivo variable, two voices: extended width (font-stretch about 125%) at weight 800 to 900 for headlines in chrome, condensed (about 75%) for plate and spec labels.
- Inter for body copy at 16 to 17px, `text-zinc-400` on dark (AA).
- JetBrains Mono only where the content is data: prices, spec values, reference codes.

## Layout
Left-aligned, asymmetric 12-column grids with deliberate empty columns. Cards use chamfered corners (one or two 12px cuts), never rounded corners.

## The one bold move
The hero shows a spray pass hardening across a corrugated steel wall, then holds still. It is the only page-load animation. Everything else is quiet.

## Review against the brief: what changed and why
- Dropped the tracked all-caps mono eyebrow above every heading. It is template chrome, so labels appear only where they carry information.
- Dropped the arrow glyph on buttons. Buttons say what happens ("Get a quote").
- Numbered markers appear only on the process timeline, which is a real sequence.
- Navigation is sentence-case Inter, not mono caps.
- Scroll reveals are limited to the coating cross-section, where the reveal explains the layer order. No fade-up on every section.
- The container configurator uses a cross-section drawing, not an isometric box. Zones (floor, walls and roof, exterior) are unambiguous in section and read like an engineering drawing.
- No invented claims. Prices, specs, warranty and branch data come from `lib/site-config.ts` and `lib/pricing-tiers.ts`. Missing values render as "On request" or "Quote on request".
