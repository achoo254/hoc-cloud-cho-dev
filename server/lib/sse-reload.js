// Shared SSE bus for live-reload in dev and section-update events in all modes.

const clients = new Set();

export function addClient(send) {
  clients.add(send);
  return () => clients.delete(send);
}

export function broadcastReload() {
  for (const send of clients) {
    try { send('event: reload\ndata: 1\n\n'); } catch {}
  }
}

export function broadcastSectionUpdate(sectionId) {
  const payload = `event: section-update\ndata: ${sectionId}\n\n`;
  for (const send of clients) {
    try { send(payload); } catch {}
  }
}

export function sseStream(c) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode('retry: 1500\n\n'));
        const send = (chunk) => controller.enqueue(enc.encode(chunk));
        const remove = addClient(send);
        c.req.raw.signal.addEventListener('abort', () => {
          remove();
          try { controller.close(); } catch {}
        });
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  );
}
