"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createInvoice } from "@/app/actions/invoices";
import { createIdbStore, QUEUE_CHANGED_EVENT } from "@/lib/idb-queue-store";
import {
  createMemoryStore,
  enqueueInvoice,
  flushQueue,
  resumeAuthItems,
  type QueueStore,
  type QueuedInvoice,
  type SubmitInvoice,
} from "@/lib/offline-queue";
import { fail } from "@/lib/result";

const SYNC_INTERVAL_MS = 30_000;
const LOCK_NAME = "hawk-invoice-sync";

async function sessionActive(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && "user" in body;
  } catch {
    return true;
  }
}

const submitInvoice: SubmitInvoice = async (payload) => {
  try {
    return await createInvoice(payload);
  } catch (error) {
    if (navigator.onLine && !(await sessionActive())) {
      return fail("UNAUTHORIZED", "Your session has expired. Sign in to send this invoice.");
    }
    throw error;
  }
};

export interface OfflineQueueApi {
  items: QueuedInvoice[];
  pendingCount: number;
  needsSignIn: boolean;
  syncing: boolean;
  persistent: boolean;
  enqueue: (input: Pick<QueuedInvoice, "id" | "payload" | "label" | "totalCents">) => Promise<void>;
  discard: (id: string) => Promise<void>;
  flush: () => Promise<void>;
}

export function useOfflineQueue(onSynced: () => void): OfflineQueueApi {
  const [items, setItems] = useState<QueuedInvoice[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const store = useRef<QueueStore | null>(null);
  const flushing = useRef(false);
  const onSyncedRef = useRef(onSynced);

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  const refresh = useCallback(async () => {
    if (store.current) {
      setItems((await store.current.list()).sort((a, b) => a.createdAt - b.createdAt));
    }
  }, []);

  const runFlush = useCallback(async () => {
    const active = store.current;
    if (!active || flushing.current || !navigator.onLine) {
      return;
    }
    const work = async () => {
      flushing.current = true;
      setSyncing(true);
      try {
        const summary = await flushQueue(active, submitInvoice);
        if (summary.synced > 0) {
          onSyncedRef.current();
        }
      } finally {
        flushing.current = false;
        setSyncing(false);
        await refresh();
      }
    };
    if (typeof navigator.locks !== "undefined") {
      await navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
        if (lock) {
          await work();
        }
      });
    } else {
      await work();
    }
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        store.current = await createIdbStore();
      } catch {
        store.current = createMemoryStore();
        setPersistent(false);
      }
      if (cancelled) {
        return;
      }
      await refresh();
      await runFlush();
    };
    void init();

    const onChange = () => void refresh();
    const onOnline = () => void runFlush();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runFlush();
      }
    };
    const timer = window.setInterval(() => void runFlush(), SYNC_INTERVAL_MS);
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(QUEUE_CHANGED_EVENT);
    if (channel) {
      channel.onmessage = onChange;
    }
    window.addEventListener(QUEUE_CHANGED_EVENT, onChange);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      channel?.close();
      window.removeEventListener(QUEUE_CHANGED_EVENT, onChange);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, runFlush]);

  const enqueue = useCallback(
    async (input: Pick<QueuedInvoice, "id" | "payload" | "label" | "totalCents">) => {
      if (!store.current) {
        store.current = createMemoryStore();
        setPersistent(false);
      }
      await enqueueInvoice(store.current, input, Date.now());
      await refresh();
    },
    [refresh],
  );

  const discard = useCallback(
    async (id: string) => {
      await store.current?.remove(id);
      await refresh();
    },
    [refresh],
  );

  const flush = useCallback(async () => {
    if (store.current) {
      await resumeAuthItems(store.current);
      await refresh();
    }
    await runFlush();
  }, [refresh, runFlush]);

  return {
    items,
    pendingCount: items.filter((item) => item.state !== "failed").length,
    needsSignIn: items.some((item) => item.state === "auth"),
    syncing,
    persistent,
    enqueue,
    discard,
    flush,
  };
}
