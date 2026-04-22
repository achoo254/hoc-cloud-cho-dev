import { randomUUID } from 'node:crypto';

import { sessionManager } from './session-manager.js';
import { attachContainer, attachToNamedContainer } from '../lib/docker-manager.js';
import { auditLogger } from './audit-logger.js';
import { abuseDetector } from './abuse-detector.js';

const HEARTBEAT_MS = 30 * 1000;

async function openStream(record) {
  if (record.container) return attachContainer(record.container);
  return attachToNamedContainer(record.containerName);
}

/**
 * Mount WS terminal + REST terminate endpoint on the top-level Hono app.
 * @hono/node-ws tracks WS routes via the Hono instance it was constructed
 * with (see server.js), so we receive `upgradeWebSocket` as an argument
 * rather than creating our own.
 */
export function mountTerminalRoutes(app, upgradeWebSocket) {
  app.get(
    '/ws/terminal/:labSlug',
    upgradeWebSocket((c) => {
      const labSlug = c.req.param('labSlug');
      const sidParam = c.req.query('sid');
      const sessionId = sidParam && /^[a-z0-9-]{4,64}$/i.test(sidParam)
        ? sidParam
        : randomUUID().slice(0, 8);
      const userId = c.get('userId') || null;
      const ip = c.req.header('x-real-ip')
        || c.req.header('x-forwarded-for')
        || 'unknown';

      const state = { stream: null, heartbeat: null, closed: false };

      return {
        async onOpen(_evt, ws) {
          auditLogger.logConnect(sessionId, userId, labSlug, ip);

          try {
            const queuePos = sessionManager.getQueuePosition(sessionId);
            if (queuePos) {
              ws.send(JSON.stringify({ type: 'queue', position: queuePos }));
            }

            const record = await sessionManager.requestSession(sessionId, userId, labSlug);
            state.stream = await openStream(record);

            state.stream.on('data', (chunk) => { try { ws.send(chunk); } catch {} });
            state.stream.on('end', () => { try { ws.close(); } catch {} });
            state.stream.on('error', (err) => {
              console.error(`[terminal] stream err session=${sessionId}:`, err.message);
            });

            state.heartbeat = setInterval(() => {
              sessionManager.touch(sessionId).catch(() => {});
              if (record.containerName) {
                abuseDetector.checkContainerCpu(sessionId, record.containerName)
                  .then((res) => {
                    if (res?.terminate && !state.closed) {
                      try { ws.send(`\x1b[31m[Terminated] ${res.reason}\x1b[0m\r\n`); } catch {}
                      try { ws.close(); } catch {}
                    }
                  })
                  .catch(() => {});
              }
            }, HEARTBEAT_MS);
            state.heartbeat.unref?.();

            ws.send(`\x1b[32m[Lab: ${labSlug}] Terminal ready (sid=${sessionId}).\x1b[0m\r\n`);
          } catch (err) {
            console.error(`[terminal] open failed session=${sessionId}:`, err.message);
            try { ws.send(`\x1b[31mError: ${err.message}\x1b[0m\r\n`); } catch {}
            try { ws.close(); } catch {}
          }
        },

        onMessage(evt, ws) {
          const data = typeof evt.data === 'string'
            ? evt.data
            : (evt.data instanceof ArrayBuffer
                ? Buffer.from(evt.data).toString('utf8')
                : String(evt.data));

          const inspection = abuseDetector.ingestInput(sessionId, data);
          if (inspection.blocked) {
            try { ws.send(`\r\n\x1b[31m[Blocked] ${inspection.reason}\x1b[0m\r\n`); } catch {}
            return;
          }
          if (inspection.line) {
            auditLogger.logCommand(sessionId, inspection.line);
          }

          if (state.stream?.writable) {
            state.stream.write(data);
            sessionManager.touch(sessionId).catch(() => {});
          }
        },

        async onClose() {
          state.closed = true;
          if (state.heartbeat) clearInterval(state.heartbeat);
          try { state.stream?.destroy?.(); } catch {}
          abuseDetector.dropSession(sessionId);
          auditLogger.logDisconnect(sessionId, 'client_closed');
          // tmux persists state inside the container; container lifecycle is
          // owned by session-manager (idle timeout / explicit terminate).
        },

        onError(err) {
          console.error(`[terminal] ws err session=${sessionId}:`, err?.message || err);
        },
      };
    }),
  );

  app.post('/api/terminal/:sessionId/terminate', async (c) => {
    const sessionId = c.req.param('sessionId');
    await sessionManager.terminate(sessionId);
    return c.json({ ok: true });
  });
}
