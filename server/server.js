import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { watch } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const DEV = process.env.NODE_ENV !== 'production';

const app = new Hono();

app.use('*', logger());

// ===== Live-reload (dev only) =====
// SSE endpoint: client kết nối, server fs.watch labs/ và push 'reload' khi có đổi.
// Debounce để gom nhiều save liên tiếp (editor lưu theo block).
const sseClients = new Set();
let reloadTimer;
const broadcastReload = () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const send of sseClients) { try { send(); } catch {} }
  }, 120);
};

if (DEV) {
  const labsDir = resolve(projectRoot, 'labs');
  watch(labsDir, { recursive: true }, (_evt, file) => {
    if (!file) return;
    if (/\.(html|css|js|json|svg|png|jpg|webp)$/i.test(file)) broadcastReload();
  });
  console.log(`[hoc-cloud-labs] live-reload watching ${labsDir}`);

  app.get('/__livereload', (c) => {
    return new Response(
      new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(enc.encode('retry: 1500\n\n'));
          const send = () => controller.enqueue(enc.encode('event: reload\ndata: 1\n\n'));
          sseClients.add(send);
          c.req.raw.signal.addEventListener('abort', () => {
            sseClients.delete(send);
            try { controller.close(); } catch {}
          });
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }
    );
  });
}

app.use(
  '/*',
  serveStatic({
    root: './',
    rewriteRequestPath: (path) => (path === '/' ? '/labs/index.html' : `/labs${path}`),
    onFound: (_path, c) => {
      // Dev: tắt cache để reload luôn lấy file mới.
      c.header('Cache-Control', DEV ? 'no-store' : 'public, max-age=300');
    },
  })
);

app.notFound((c) => c.text('Not Found', 404));

const port = Number(process.env.PORT) || 8387;

serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
  console.log(`[hoc-cloud-labs] serving ${projectRoot}/labs on http://127.0.0.1:${info.port}`);
});
