"use client";

import { useState } from "react";
import { updateInvoiceStatus } from "@/app/actions/invoices";
import type { InvoiceSummaryView } from "@/components/dashboard/types";
import { formatInvoiceWhatsAppMessage } from "@/lib/invoice-whatsapp";
import { formatZar } from "@/lib/money";
import type { QueuedInvoice } from "@/lib/offline-queue";
import { whatsappHref, SITE_CONFIG } from "@/lib/site-config";

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
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-zinc-100">{item.label}</p>
                <p className={`shrink-0 font-mono tabular-nums ${item.state === "failed" ? "text-hawk-gold" : "text-zinc-100"}`}>
                  {formatZar(item.totalCents)}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className={`text-sm ${item.state === "failed" ? "text-hawk-gold" : "text-zinc-400"}`}>
                  {item.state === "failed"
                    ? `Could not be sent: ${item.lastError ?? "unknown error"}`
                    : item.state === "auth"
                      ? "Waiting for you to sign in"
                      : "Saved on this phone, waiting to sync"}
                </p>
                {item.state === "failed" ? (
                  <button type="button" onClick={() => onDiscard(item.id)} className="min-h-[36px] shrink-0 px-2 text-xs text-zinc-300 underline">
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
            const whatsappUrl = whatsappHref(SITE_CONFIG.contact.whatsappE164, formatInvoiceWhatsAppMessage(invoice));
            return (
              <li key={invoice.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate font-mono text-sm tabular-nums text-zinc-300">
                    {invoice.invoiceNumber} <span className="text-zinc-400">{invoice.status.toLowerCase()}</span>
                  </p>
                  <p className="shrink-0 font-mono tabular-nums text-zinc-50">{formatZar(invoice.totalCents)}</p>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-zinc-100">{invoice.clientName}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] border border-zinc-700 px-2.5 text-xs text-zinc-100"
                        aria-label={`Send ${invoice.invoiceNumber} on WhatsApp`}
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {action ? (
                      <button
                        type="button"
                        disabled={busyId === invoice.id}
                        onClick={() => void advance(invoice, action.to)}
                        className="min-h-[36px] border border-zinc-700 px-2.5 text-xs text-zinc-100 disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
