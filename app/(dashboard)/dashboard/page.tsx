import Link from "next/link";
import { listInvoices } from "@/app/actions/invoices";
import { formatZar } from "@/lib/money";

export default async function DashboardPage() {
  const result = await listInvoices({ limit: 10 });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display-wide text-chrome text-[clamp(1.6rem,7vw,2.25rem)]">Recent invoices</h1>
        <Link href="/dashboard/invoice-engine" className="btn btn-primary chamfer">
          New invoice
        </Link>
      </div>

      {!result.ok ? (
        <p role="alert" className="mt-6 border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
          {result.error.message}
        </p>
      ) : result.data.items.length === 0 ? (
        <p className="mt-6 text-zinc-400">No invoices yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hawk-obsidian-border border border-hawk-obsidian-border bg-hawk-obsidian-card">
          {result.data.items.map((invoice) => (
            <li key={invoice.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-400">
                  {invoice.invoiceNumber} · {invoice.status}
                </p>
                <p className="truncate text-zinc-200">{invoice.clientName}</p>
              </div>
              <p className="font-mono tabular-nums text-zinc-100">{formatZar(invoice.totalCents)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
