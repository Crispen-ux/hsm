import type { DraftTotals } from "@/lib/invoice-draft";
import { formatZar } from "@/lib/money";

function Row({ label, cents, strong = false, large = false }: { label: string; cents: number; strong?: boolean; large?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className={strong ? "font-semibold text-zinc-100" : "text-zinc-300"}>{label}</dt>
      <span className="spec-leader" aria-hidden />
      <dd key={cents} className={`tick text-right font-mono tabular-nums ${large ? "text-2xl text-white" : "text-zinc-50"}`}>
        {formatZar(cents)}
      </dd>
    </div>
  );
}

export function TotalsReadout({ result }: { result: DraftTotals }) {
  const { totals, error } = result;
  return (
    <section aria-labelledby="totals-title" className="chamfer-2 plate">
      <div className="chamfer-2 plate-inner surface-brushed p-5">
        <h2 id="totals-title" className="display-narrow text-chrome text-2xl">
          Totals
        </h2>
        {totals ? (
          <dl className="mt-4 space-y-3" data-testid="totals">
            <Row label="Subtotal" cents={totals.subtotalCents} />
            <Row label="VAT 15%" cents={totals.vatCents} />
            <div className="border-t-2 border-zinc-500 pt-3">
              <Row label="Total" cents={totals.totalCents} strong />
            </div>
            <Row label="Deposit" cents={totals.depositCents} />
            <Row label="Balance due" cents={totals.balanceCents} strong large />
          </dl>
        ) : (
          <p className="mt-4 text-zinc-400">Add a priced line to see the totals.</p>
        )}
        {error ? (
          <p role="alert" className="mt-4 border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
