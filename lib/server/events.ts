type Subscriber = {
  householdId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
};

type EventGlobal = typeof globalThis & { __zhizhangSubscribers?: Set<Subscriber> };
const eventGlobal = globalThis as EventGlobal;

function subscribers(): Set<Subscriber> {
  if (!eventGlobal.__zhizhangSubscribers) eventGlobal.__zhizhangSubscribers = new Set();
  return eventGlobal.__zhizhangSubscribers;
}

export function subscribe(householdId: string, controller: ReadableStreamDefaultController<Uint8Array>): () => void {
  const entry: Subscriber = { householdId, controller };
  subscribers().add(entry);
  return () => subscribers().delete(entry);
}

export function broadcastHouseholdUpdate(householdId: string, kind = 'transactions_changed'): void {
  const encoder = new TextEncoder();
  const payload = encoder.encode(`event: ${kind}\ndata: ${JSON.stringify({ kind, at: Date.now() })}\n\n`);
  for (const subscriber of subscribers()) {
    if (subscriber.householdId !== householdId) continue;
    try {
      subscriber.controller.enqueue(payload);
    } catch {
      subscribers().delete(subscriber);
    }
  }
}
