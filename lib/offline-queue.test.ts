import { describe, expect, it, vi } from "vitest";
import {
  createMemoryStore,
  enqueueInvoice,
  flushQueue,
  resumeAuthItems,
  type QueuedInvoice,
  type SubmitInvoice,
} from "@/lib/offline-queue";
import { fail, ok } from "@/lib/result";

function item(id: string, createdAt: number, overrides: Partial<QueuedInvoice> = {}): QueuedInvoice {
  return {
    id,
    payload: { idempotencyKey: id },
    label: `Invoice ${id}`,
    totalCents: 115,
    createdAt,
    attempts: 0,
    state: "pending",
    lastError: null,
    ...overrides,
  };
}

describe("enqueueInvoice", () => {
  it("stores a pending item once, keyed by idempotency key", async () => {
    const store = createMemoryStore();
    const first = await enqueueInvoice(store, { id: "a", payload: {}, label: "A", totalCents: 1 }, 100);
    const second = await enqueueInvoice(store, { id: "a", payload: { changed: true }, label: "A2", totalCents: 2 }, 200);
    expect(first.state).toBe("pending");
    expect(second.createdAt).toBe(100);
    expect(await store.list()).toHaveLength(1);
  });
});

describe("flushQueue", () => {
  it("replays oldest first and removes what synced", async () => {
    const store = createMemoryStore([item("b", 2), item("a", 1), item("c", 3)]);
    const order: string[] = [];
    const submit: SubmitInvoice = async (payload) => {
      order.push(String(payload.idempotencyKey));
      return ok({});
    };
    const summary = await flushQueue(store, submit);
    expect(order).toEqual(["a", "b", "c"]);
    expect(summary).toEqual({ synced: 3, failed: 0, remaining: 0, stoppedBecause: "done" });
    expect(await store.list()).toEqual([]);
  });

  it("stops at the first network failure and keeps everything queued", async () => {
    const store = createMemoryStore([item("a", 1), item("b", 2)]);
    const submit = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const summary = await flushQueue(store, submit);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ synced: 0, remaining: 2, stoppedBecause: "offline" });
    const stored = await store.list();
    expect(stored.find((entry) => entry.id === "a")?.attempts).toBe(1);
  });

  it("treats UNAVAILABLE as temporary and retries later", async () => {
    const store = createMemoryStore([item("a", 1)]);
    const summary = await flushQueue(store, async () => fail("UNAVAILABLE", "down"));
    expect(summary).toMatchObject({ remaining: 1, stoppedBecause: "offline" });
    expect((await store.list())[0]?.state).toBe("pending");
  });

  it("marks a validation failure as failed and continues with the next invoice", async () => {
    const store = createMemoryStore([item("bad", 1), item("good", 2)]);
    const submit: SubmitInvoice = async (payload) =>
      payload.idempotencyKey === "bad" ? fail("VALIDATION", "Deposit cannot exceed the invoice total") : ok({});
    const summary = await flushQueue(store, submit);
    expect(summary).toEqual({ synced: 1, failed: 1, remaining: 0, stoppedBecause: "done" });
    const left = await store.list();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ id: "bad", state: "failed", lastError: "Deposit cannot exceed the invoice total" });
  });

  it("does not retry failed items on later flushes", async () => {
    const store = createMemoryStore([item("bad", 1, { state: "failed", lastError: "x" })]);
    const submit = vi.fn();
    await flushQueue(store, submit);
    expect(submit).not.toHaveBeenCalled();
  });

  it("pauses on an expired session and resumes after sign-in", async () => {
    const store = createMemoryStore([item("a", 1), item("b", 2)]);
    const summary = await flushQueue(store, async () => fail("UNAUTHORIZED", "Please sign in to continue."));
    expect(summary.stoppedBecause).toBe("auth");
    expect((await store.list()).find((entry) => entry.id === "a")?.state).toBe("auth");

    await resumeAuthItems(store);
    const submit = vi.fn(async () => ok({}));
    const resumed = await flushQueue(store, submit);
    expect(resumed).toMatchObject({ synced: 2, remaining: 0 });
  });

  it("backs off when rate limited", async () => {
    const store = createMemoryStore([item("a", 1), item("b", 2)]);
    const submit = vi.fn(async () => fail("RATE_LIMITED", "slow down"));
    const summary = await flushQueue(store, submit);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ stoppedBecause: "rate-limited", remaining: 2 });
  });

  it("counts a replayed request as synced, so an interrupted sync never duplicates", async () => {
    const store = createMemoryStore([item("a", 1)]);
    const summary = await flushQueue(store, async () => ok({ replayed: true }));
    expect(summary.synced).toBe(1);
    expect(await store.list()).toEqual([]);
  });
});
