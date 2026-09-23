"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createInvoice } from "@/app/actions/invoices";
import { ActionBar } from "@/components/dashboard/ActionBar";
import { ConfirmSheet } from "@/components/dashboard/ConfirmSheet";
import { InstallPrompt } from "@/components/dashboard/InstallPrompt";
import { JobTypeToggle } from "@/components/dashboard/JobTypeToggle";
import { ParsedChips } from "@/components/dashboard/ParsedChips";
import { RecentInvoices } from "@/components/dashboard/RecentInvoices";
import { ReviewForm } from "@/components/dashboard/ReviewForm";
import { SyncBadge } from "@/components/dashboard/SyncBadge";
import { TotalsReadout } from "@/components/dashboard/TotalsReadout";
import type { InvoiceSummaryView } from "@/components/dashboard/types";
import { useOfflineQueue } from "@/components/dashboard/useOfflineQueue";
import { useOnlineStatus } from "@/components/dashboard/useOnlineStatus";
import { useSpeechCapture } from "@/components/dashboard/useSpeechCapture";
import { VoicePanel } from "@/components/dashboard/VoicePanel";
import { JOB_TYPES, type JobType } from "@/lib/domain";
import {
  applyParsedSpeech,
  blankLine,
  createDraft,
  draftToPayload,
  draftTotals,
  restoreDraft,
  serializeDraft,
  syncAutoLines,
  type DraftLine,
  type FieldErrorMap,
  type InvoiceDraft,
} from "@/lib/invoice-draft";
import { DRAFT_STORAGE_KEY } from "@/lib/pwa";
import { parseSpeech } from "@/lib/speech-parser";

interface InvoiceEngineProps {
  invoices: readonly InvoiceSummaryView[];
  loadError: string | null;
}

type Notice = { tone: "ok" | "warn"; text: string };

const JOB_LABELS: Readonly<Record<JobType, string>> = { VEHICLE: "Vehicle", CONTAINER: "Container", INDUSTRIAL: "Industrial" };
const PERSIST_DELAY_MS = 400;

function joinTranscript(current: string, addition: string): string {
  return [current.trim(), addition.trim()].filter((part) => part.length > 0).join(" ");
}

function errorElementId(key: string): string {
  if (key.startsWith("lines.")) {
    return `f-${key.replace(/\./g, "-")}`;
  }
  return key === "lines" ? "lines-title" : `f-${key === "depositCents" ? "deposit" : key}`;
}

function firstErrorElement(errors: FieldErrorMap): HTMLElement | null {
  const elements = Object.keys(errors)
    .map((key) => document.getElementById(errorElementId(key)))
    .filter((element): element is HTMLElement => element !== null);
  elements.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return elements[0] ?? null;
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function InvoiceEngine({ invoices, loadError }: InvoiceEngineProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const touched = useRef<Set<string>>(new Set());
  const restored = useRef(false);

  const [draft, setDraft] = useState<InvoiceDraft>(() => createDraft("VEHICLE", crypto.randomUUID()));
  const [errors, setErrors] = useState<FieldErrorMap>({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const refreshList = useCallback(() => router.refresh(), [router]);
  const queue = useOfflineQueue(refreshList);

  const reparse = useCallback((next: InvoiceDraft): InvoiceDraft => applyParsedSpeech(next, parseSpeech(next.transcript), touched.current), []);

  const appendTranscript = useCallback(
    (text: string) => setDraft((current) => reparse({ ...current, transcript: joinTranscript(current.transcript, text) })),
    [reparse],
  );

  const speech = useSpeechCapture(appendTranscript);
  const parsed = useMemo(() => parseSpeech(draft.transcript), [draft.transcript]);
  const totals = useMemo(() => draftTotals(draft), [draft]);

  useEffect(() => {
    const stored = restoreDraft(readStorage());
    if (stored) {
      touched.current = new Set(stored.touched);
      setDraft(stored.draft);
    }
    restored.current = true;
  }, []);

  useEffect(() => {
    if (!restored.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft, touched.current));
      } catch {
        return;
      }
    }, PERSIST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const setField = useCallback(<K extends keyof InvoiceDraft>(field: K, value: InvoiceDraft[K]) => {
    touched.current.add(field);
    setErrors({});
    setDraft((current) => {
      if (field === "jobType") {
        const jobType = JOB_TYPES.find((candidate) => candidate === value);
        if (!jobType) {
          return current;
        }
        const manual = current.lines.filter((line) => !line.auto).map((line) => ({ ...line, tierKey: null }));
        return syncAutoLines({ ...current, jobType, lines: manual });
      }
      return syncAutoLines({ ...current, [field]: value });
    });
  }, []);

  const changeLine = useCallback((key: string, patch: Partial<DraftLine>) => {
    setErrors({});
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch, auto: false } : line)),
    }));
  }, []);

  const addLine = useCallback(() => setDraft((current) => ({ ...current, lines: [...current.lines, blankLine()] })), []);
  const removeLine = useCallback(
    (key: string) => setDraft((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) })),
    [],
  );

  const removeAutoLine = useCallback(
    (key: string) => setDraft((current) => ({
      ...current,
      removedAutoLines: [...current.removedAutoLines, key],
      lines: current.lines.filter((line) => line.key !== key),
    })),
    [],
  );

  const selectProduct = useCallback((key: string, product: import("@/lib/product-catalogue").CatalogueProduct) => {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.key === key
          ? {
              ...line,
              description: product.name,
              unit: product.unit,
              unitPrice: product.unitPriceCents > 0 ? String(product.unitPriceCents / 100) : line.unitPrice,
              auto: false,
            }
          : line,
      ),
    }));
  }, []);

  const changeTranscript = useCallback((value: string) => setDraft((current) => reparse({ ...current, transcript: value })), [reparse]);
  const clearTranscript = useCallback(() => setDraft((current) => ({ ...current, transcript: "" })), []);

  const reset = useCallback((jobType: JobType) => {
    touched.current = new Set();
    setErrors({});
    setDraft(createDraft(jobType, crypto.randomUUID()));
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      return;
    }
  }, []);

  const summaryLabel = `${draft.clientName.trim() || "Client"} - ${JOB_LABELS[draft.jobType]}`;

  const submit = useCallback(
    async (status: "DRAFT" | "ISSUED") => {
      const built = draftToPayload(draft, status);
      if (!built.ok) {
        setErrors(built.errors);
        setConfirming(false);
        requestAnimationFrame(() => {
          const target = firstErrorElement(built.errors);
          target?.scrollIntoView({ block: "center" });
          target?.focus();
        });
        return;
      }

      setBusy(true);
      const totalCents = totals.totals?.totalCents ?? 0;
      const saveOffline = async (text: string) => {
        await queue.enqueue({ id: draft.idempotencyKey, payload: built.payload, label: summaryLabel, totalCents });
        reset(draft.jobType);
        setNotice({ tone: "warn", text });
      };

      try {
        if (!navigator.onLine) {
          await saveOffline("Saved on this phone. It will be sent when you have signal.");
          return;
        }
        const result = await createInvoice(built.payload);
        if (result.ok) {
          reset(draft.jobType);
          setNotice({
            tone: "ok",
            text: `${result.data.invoice.invoiceNumber} ${status === "ISSUED" ? "issued" : "saved as a draft"}.`,
          });
          router.refresh();
        } else if (["UNAUTHORIZED", "UNAVAILABLE", "INTERNAL", "RATE_LIMITED"].includes(result.error.code)) {
          await saveOffline("Could not reach the server, so it is saved on this phone and will be sent automatically.");
        } else {
          const flat: FieldErrorMap = {};
          for (const [key, messages] of Object.entries(result.error.fieldErrors ?? {})) {
            const message = messages[0];
            if (message) {
              flat[key] = message;
            }
          }
          setErrors(flat);
          setNotice({ tone: "warn", text: result.error.message });
        }
      } catch {
        await saveOffline("You lost signal, so it is saved on this phone and will be sent automatically.");
      } finally {
        setConfirming(false);
        setBusy(false);
      }
    },
    [draft, queue, reset, router, summaryLabel, totals.totals],
  );

  const requestIssue = () => {
    const built = draftToPayload(draft, "ISSUED");
    if (!built.ok) {
      void submit("ISSUED");
      return;
    }
    setErrors({});
    setConfirming(true);
  };

  return (
    <div className="mx-auto max-w-2xl pb-36">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-wide text-chrome text-[clamp(1.6rem,7vw,2.25rem)]">New invoice</h1>
        <div className="flex items-center gap-2">
          <InstallPrompt />
          <SyncBadge online={online} pendingCount={queue.pendingCount} syncing={queue.syncing} needsSignIn={queue.needsSignIn} />
        </div>
      </div>

      {!queue.persistent ? (
        <p role="alert" className="mt-4 border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
          This browser cannot save invoices for later. Keep this page open until you have signal.
        </p>
      ) : null}
      {queue.needsSignIn ? (
        <p role="alert" className="mt-4 border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
          Your session expired.{" "}
          <a href="/login?callbackUrl=/dashboard/invoice-engine" className="underline">
            Sign in
          </a>{" "}
          to send the invoices waiting on this phone.
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          data-testid="notice"
          className={`mt-4 border-l-2 pl-3 text-sm ${notice.tone === "ok" ? "border-emerald-400 text-zinc-100" : "border-hawk-gold text-hawk-gold"}`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-6">
        <JobTypeToggle value={draft.jobType} onChange={(next) => setField("jobType", next)} />
      </div>

      <VoicePanel speech={speech} transcript={draft.transcript} parsed={parsed} onTranscriptChange={changeTranscript} onClear={clearTranscript} />
      <ParsedChips parsed={parsed} />

      <ReviewForm draft={draft} errors={errors} setField={setField} onLineChange={changeLine} onAddLine={addLine} onRemoveLine={removeLine} onRemoveAutoLine={removeAutoLine} onProductSelect={selectProduct} />

      <div className="mt-10">
        <TotalsReadout result={totals} />
      </div>

      <div className="mt-12">
        <RecentInvoices invoices={invoices} loadError={loadError} queued={queue.items} onDiscard={(id) => void queue.discard(id)} onChanged={refreshList} />
      </div>

      <ActionBar busy={busy} onIssue={requestIssue} onSaveDraft={() => void submit("DRAFT")} />
      <ConfirmSheet
        open={confirming}
        clientName={draft.clientName}
        summary={summaryLabel}
        totals={totals}
        offline={!online}
        busy={busy}
        onConfirm={() => void submit("ISSUED")}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
