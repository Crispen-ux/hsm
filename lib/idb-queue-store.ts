import type { QueueStore, QueuedInvoice } from "@/lib/offline-queue";

const DB_NAME = "hawk-field";
const DB_VERSION = 1;
const STORE_NAME = "invoice-queue";

export const QUEUE_CHANGED_EVENT = "hawk:queue-changed";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the offline store"));
    request.onblocked = () => reject(new Error("The offline store is blocked by another tab"));
  });
}

function run<T>(database: IDBDatabase, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = work(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error ?? new Error("Offline store transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Offline store transaction aborted"));
  });
}

function notifyChange(): void {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(QUEUE_CHANGED_EVENT);
    channel.postMessage("changed");
    channel.close();
  }
}

export async function createIdbStore(): Promise<QueueStore> {
  const database = await openDatabase();
  return {
    list: async () => run<QueuedInvoice[]>(database, "readonly", (store) => store.getAll()),
    put: async (item) => {
      await run(database, "readwrite", (store) => store.put(item));
      notifyChange();
    },
    remove: async (id) => {
      await run(database, "readwrite", (store) => store.delete(id));
      notifyChange();
    },
  };
}
