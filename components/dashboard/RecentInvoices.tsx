"use client";

import { useState } from "react";
import { updateInvoiceStatus } from "@/app/actions/invoices";
import type { InvoiceSummaryView } from "@/components/dashboard/types";
import { formatZar } from "@/lib/money";
import type { QueuedInvoice } from "@/lib/offline-queue";

interface RecentInvoicesProps {
  invoices: readonly InvoiceSummaryView[];
  loadError: string | null;
  queued: readonly QueuedInvoice[];
  onDiscard: (id: string) => void;
  onChanged: () => void;
}

const NEXT_ACTION: Readonly<Record<string, { to: "ISSUED" | "PAID"; label: string } | undefined>> = {
  DRAFT: { to: "ISSUED", label: "Issue" },
  ISSUED: { to: "PAID", label: "Mark paid" },
};

export function RecentInvoices({ invoices, loadError, queued, onDiscard, onChanged }: RecentInvoicesProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const advance = async (invoice: InvoiceSummaryView, to: "ISSUED" | "PAID") => {
    setBusyId(invoice.id);
    setError(null);
    try {
      const result = await updateInvoiceStatus({ id: invoice.id, status: to });
      if (result.ok) {
        onChanged();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("You are offline. Try again when you have signal.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="recent-title">
      <h2 id="recent-title" className="display-narrow text-chrome text-2xl">
        Recent invoices
      </h2>
      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
          {error}
        </p>
      ) : null}

      {queued.length > 0 ? (
        <ul className="mt-4 divide-y divide-hawk-obsidian-border border border-hawk-gold/50 bg-hawk-obsidian-card" data-testid="queued-list">
          {queued.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-zinc-100">{item.label}</p>
                <p className={`text-sm ${item.state === "failed" ? "text-hawk-gold" : "text-zinc-400"}`}>
                  {item.state === "failed"
                    ? `Could not be sent: ${item.lastError ?? "unknown error"}`
                    : item.state === "auth"
                      ? "Waiting for you to sign in"
                      : "Saved on this phone, waiting to sync"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="font-mono tabular-nums text-zinc-100">{formatZar(item.totalCents)}</p>
                {item.state === "failed" ? (
                  <button type="button" onClick={() => onDiscard(item.id)} className="min-h-[44px] px-2 text-sm text-zinc-300 underline">
                    Discard
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {loadError ? (
        <p className="mt-4 text-sm text-zinc-400">Recent invoices could not be loaded: {loadError}</p>
      ) : invoices.length === 0 && queued.length === 0 ? (
        <p className="mt-4 text-zinc-400">No invoices yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-hawk-obsidian-border border border-hawk-obsidian-border bg-hawk-obsidian-card">
          {invoices.map((invoice) => {
            const action = NEXT_ACTION[invoice.status];
            return (
              <li key={invoice.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm tabular-nums text-zinc-300">
                    {invoice.invoiceNumber} <span className="text-zinc-400">{invoice.status.toLowerCase()}</span>
                  </p>
                  <p className="truncate text-zinc-100">{invoice.clientName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-mono tabular-nums text-zinc-50">{formatZar(invoice.totalCents)}</p>
                  {action ? (
                    <button
                      type="button"
                      disabled={busyId === invoice.id}
                      onClick={() => void advance(invoice, action.to)}
                      className="min-h-[44px] border border-zinc-700 px-3 text-sm text-zinc-100 disabled:opacity-50"
                    >
                      {action.label}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
