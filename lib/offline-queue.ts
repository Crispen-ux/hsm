import type { ActionResult } from "@/lib/result";

export type QueueState = "pending" | "failed" | "auth";

export interface QueuedInvoice {
  id: string;
  payload: Record<string, unknown>;
  label: string;
  totalCents: number;
  createdAt: number;
  attempts: number;
  state: QueueState;
  lastError: string | null;
}

export interface QueueStore {
  list(): Promise<QueuedInvoice[]>;
  put(item: QueuedInvoice): Promise<void>;
  remove(id: string): Promise<void>;
}

export type SubmitInvoice = (payload: Record<string, unknown>) => Promise<ActionResult<unknown>>;

export interface FlushSummary {
  synced: number;
  failed: number;
  remaining: number;
  stoppedBecause: "done" | "offline" | "auth" | "rate-limited";
}

const TRANSIENT_CODES: ReadonlySet<string> = new Set(["UNAVAILABLE", "INTERNAL"]);

export async function enqueueInvoice(
  store: QueueStore,
  input: Pick<QueuedInvoice, "id" | "payload" | "label" | "totalCents">,
  now: number,
): Promise<QueuedInvoice> {
  const existing = (await store.list()).find((item) => item.id === input.id);
  if (existing) {
    return existing;
  }
  const item: QueuedInvoice = { ...input, createdAt: now, attempts: 0, state: "pending", lastError: null };
  await store.put(item);
  return item;
}

export async function flushQueue(store: QueueStore, submit: SubmitInvoice): Promise<FlushSummary> {
  const items = (await store.list()).filter((item) => item.state !== "failed").sort((a, b) => a.createdAt - b.createdAt);
  let synced = 0;
  let failed = 0;
  let stoppedBecause: FlushSummary["stoppedBecause"] = "done";

  for (const item of items) {
    let result: ActionResult<unknown>;
    try {
      result = await submit(item.payload);
    } catch {
      await store.put({ ...item, attempts: item.attempts + 1, lastError: "Could not reach the server" });
      stoppedBecause = "offline";
      break;
    }

    if (result.ok) {
      await store.remove(item.id);
      synced += 1;
      continue;
    }

    const { code, message } = result.error;
    if (code === "UNAUTHORIZED") {
      await store.put({ ...item, attempts: item.attempts + 1, state: "auth", lastError: message });
      stoppedBecause = "auth";
      break;
    }
    if (code === "RATE_LIMITED") {
      await store.put({ ...item, attempts: item.attempts + 1, lastError: message });
      stoppedBecause = "rate-limited";
      break;
    }
    if (TRANSIENT_CODES.has(code)) {
      await store.put({ ...item, attempts: item.attempts + 1, lastError: message });
      stoppedBecause = "offline";
      break;
    }

    await store.put({ ...item, attempts: item.attempts + 1, state: "failed", lastError: message });
    failed += 1;
  }

  const remaining = (await store.list()).filter((item) => item.state !== "failed").length;
  return { synced, failed, remaining, stoppedBecause };
}

export async function resumeAuthItems(store: QueueStore): Promise<void> {
  for (const item of await store.list()) {
    if (item.state === "auth") {
      await store.put({ ...item, state: "pending" });
    }
  }
}

export function createMemoryStore(initial: QueuedInvoice[] = []): QueueStore {
  const items = new Map(initial.map((item) => [item.id, item]));
  return {
    list: async () => [...items.values()].map((item) => ({ ...item })),
    put: async (item) => {
      items.set(item.id, { ...item });
    },
    remove: async (id) => {
      items.delete(id);
    },
  };
}
