import Link from "next/link";
import { listInvoices } from "@/app/actions/invoices";
import { formatZar } from "@/lib/money";

export default async function QuotesPage() {
  const result = await listInvoices({ limit: 50 });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display-wide text-chrome text-[clamp(1.6rem,7vw,2.25rem)]">Quotes</h1>
        <Link href="/dashboard/quotes/new" className="btn btn-primary chamfer">
          New quote
        </Link>
      </div>

      {!result.ok ? (
        <p role="alert" className="mt-6 border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
          {result.error.message}
        </p>
      ) : result.data.items.length === 0 ? (
        <p className="mt-6 text-zinc-400">No quotes yet. Create your first quote to get started.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hawk-obsidian-border border border-hawk-obsidian-border bg-hawk-obsidian-card">
          {result.data.items.map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-400">
                  {invoice.invoiceNumber}
                </p>
                <p className="truncate text-zinc-200">{invoice.clientName}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-mono tabular-nums text-zinc-100">{formatZar(invoice.totalCents)}</p>
                <span className="text-xs text-zinc-400">{invoice.status.toLowerCase()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
