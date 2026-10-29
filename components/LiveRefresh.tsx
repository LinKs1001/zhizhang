'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    let source: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    const refresh = () => router.refresh();
    try {
      source = new EventSource('/api/events');
      source.addEventListener('transactions_changed', refresh);
      source.addEventListener('budgets_changed', refresh);
    } catch {
      // Fallback below keeps the shared ledger reasonably fresh.
    }
    poll = setInterval(refresh, 60_000);
    return () => {
      source?.close();
      if (poll) clearInterval(poll);
    };
  }, [router]);
  return null;
}
