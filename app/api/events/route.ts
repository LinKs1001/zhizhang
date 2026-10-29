import { getCurrentUser } from '@/lib/auth';
import { getHouseholdContext } from '@/lib/server/household';
import { subscribe } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const context = await getHouseholdContext(user.id);
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('event: connected\ndata: {"ok":true}\n\n'));
      unsubscribe = subscribe(context.householdId, controller);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20_000);
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
