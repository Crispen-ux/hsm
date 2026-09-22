"use client";

import { useEffect, useRef } from "react";
import type { DraftTotals } from "@/lib/invoice-draft";
import { formatZar } from "@/lib/money";

interface ConfirmSheetProps {
  open: boolean;
  clientName: string;
  summary: string;
  totals: DraftTotals;
  offline: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ open, clientName, summary, totals, offline, busy, onConfirm, onCancel }: ConfirmSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,26rem)] border border-hawk-obsidian-border bg-hawk-obsidian-card p-0 text-zinc-200 backdrop:bg-black/80"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="display-narrow text-chrome text-3xl">
          Issue this invoice?
        </h2>
        <p className="mt-4 text-zinc-100">{clientName}</p>
        <p className="text-sm text-zinc-400">{summary}</p>
        {totals.totals ? (
          <dl className="mt-5 space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-300">Total</dt>
              <dd className="font-mono tabular-nums text-zinc-50">{formatZar(totals.totals.totalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-300">Deposit</dt>
              <dd className="font-mono tabular-nums text-zinc-50">{formatZar(totals.totals.depositCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-600 pt-2">
              <dt className="font-semibold text-zinc-100">Balance due</dt>
              <dd className="font-mono text-xl tabular-nums text-white">{formatZar(totals.totals.balanceCents)}</dd>
            </div>
          </dl>
        ) : null}
        {offline ? <p className="mt-4 text-sm text-hawk-gold">You are offline. It will be saved on this phone and sent when you have signal.</p> : null}
        <div className="mt-6 grid gap-3">
          <button type="button" onClick={onConfirm} disabled={busy} className="btn btn-primary chamfer" data-testid="confirm-issue">
            {busy ? "Sending" : "Confirm and issue"}
          </button>
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary chamfer">
            Back to editing
          </button>
        </div>
      </div>
    </dialog>
  );
}
