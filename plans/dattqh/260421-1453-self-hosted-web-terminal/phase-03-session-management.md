# Phase 03: Session Management

**Priority:** P1  
**Status:** Code complete (2026-04-22) — MongoDB-backed session/audit models landed; cleanup cron wired in server.js  
**Effort:** 1 week  
**Dependencies:** Phase 02 complete

## Overview

Implement robust session lifecycle: timeout idle sessions, cleanup orphaned containers, queue overflow when max concurrent reached. Prevent resource exhaustion and zombie containers.

## Requirements

### Functional
- F1: Sessions timeout after 30 min of inactivity
- F2: Max 5 concurrent terminal sessions
- F3: Queue overflow with position feedback
- F4: Heartbeat/ping to detect stale connections
- F5: Graceful cleanup on server restart
- F6: Session metadata stored in MongoDB (`terminalsessions` collection)

### Non-Functional
- NF1: Cleanup runs every 60s
- NF2: Queue wait <5s typical
- NF3: No orphaned containers after 24h

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Session Manager                               │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Active Pool  │  │ Wait Queue   │  │ Cleanup Cron │          │
│  │ (max 5)      │  │ (FIFO)       │  │ (every 60s)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                │                   │                  │
│         ▼                ▼                   ▼                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MongoDB: terminalsessions collection        │   │
│  │  _id | userId | labSlug | containerName | status | lastActiveAt │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema (MongoDB / Mongoose)

```js
// server/db/models/terminal-session-model.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const terminalSessionSchema = new Schema({
  _id: { type: String },               // session UUID (client-provided)
  userId: { type: String, default: null, index: true }, // nullable for guests
  labSlug: { type: String, required: true },
  projectName: { type: String, default: null },          // docker-compose project
  containerName: { type: String, default: null },
  status: {
    type: String,
    enum: ['queued', 'active', 'idle', 'terminated'],
    default: 'queued',
    index: true,
  },
  lastActiveAt: { type: Date, required: true, index: true },
  terminatedAt: { type: Date, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, _id: false });

export const TerminalSession = mongoose.model('TerminalSession', terminalSessionSchema);
```

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `server/terminal/session-manager.js` | Session lifecycle management |
| `server/db/models/terminal-session-model.js` | Mongoose model for terminal sessions |
| `server/terminal/cleanup-cron.js` | Periodic cleanup job |

### Modify
| File | Change |
|------|--------|
| `server/terminal/terminal-routes.js` | Integrate session manager |
| `server/server.js` | Start cleanup cron on boot |
| `app/src/components/lab/web-terminal.tsx` | Show queue position, heartbeat |

## Implementation Steps

### Step 1: Mongoose Model

**File: `server/db/models/terminal-session-model.js`** — see schema block above. Mongoose auto-creates indexes on `status`, `userId`, `lastActiveAt` via `index: true`. No manual migration needed (collection auto-created on first write).

Register the model export in `server/db/models/index.js` alongside existing models.

### Step 2: Session Manager

**File: `server/terminal/session-manager.js`**
```javascript
import { TerminalSession } from '../db/models/terminal-session-model.js';
import { startLabEnvironment, stopLabEnvironment } from '../lib/lab-orchestrator.js';

const MAX_CONCURRENT = 5;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30s

class SessionManager {
  constructor() {
    this.waitQueue = [];
    this.activeSessions = new Map();
  }

  async getActiveCount() {
    return TerminalSession.countDocuments({ status: 'active' });
  }

  getQueuePosition(sessionId) {
    const idx = this.waitQueue.findIndex(s => s.id === sessionId);
    return idx === -1 ? null : idx + 1;
  }

  async requestSession(sessionId, userId, labSlug) {
    const now = new Date();

    await TerminalSession.create({
      _id: sessionId,
      userId: userId ?? null,
      labSlug,
      status: 'queued',
      lastActiveAt: now,
    });

    const activeCount = await this.getActiveCount();

    if (activeCount < MAX_CONCURRENT) {
      return this.activateSession(sessionId, labSlug);
    } else {
      return new Promise((resolve, reject) => {
        this.waitQueue.push({ id: sessionId, labSlug, resolve, reject });
      });
    }
  }

  async activateSession(sessionId, labSlug) {
    const { projectName, mainContainer } = await startLabEnvironment(labSlug, sessionId);

    await TerminalSession.updateOne(
      { _id: sessionId },
      {
        $set: {
          status: 'active',
          projectName,
          containerName: mainContainer,
          lastActiveAt: new Date(),
        },
      }
    );

    this.activeSessions.set(sessionId, { projectName, mainContainer, labSlug });

    return { projectName, mainContainer };
  }

  async touchSession(sessionId) {
    await TerminalSession.updateOne(
      { _id: sessionId },
      { $set: { lastActiveAt: new Date() } }
    );
  }

  async terminateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      await stopLabEnvironment(session.projectName);
    } catch (e) {
      console.error(`[session] cleanup failed for ${sessionId}:`, e.message);
    }

    await TerminalSession.updateOne(
      { _id: sessionId },
      { $set: { status: 'terminated', terminatedAt: new Date() } }
    );

    this.activeSessions.delete(sessionId);

    // Process queue
    this.processQueue();
  }

  async processQueue() {
    if (this.waitQueue.length === 0) return;
    if ((await this.getActiveCount()) >= MAX_CONCURRENT) return;

    const next = this.waitQueue.shift();
    try {
      const result = await this.activateSession(next.id, next.labSlug);
      next.resolve(result);
    } catch (e) {
      next.reject(e);
    }
  }

  async cleanupIdleSessions() {
    const cutoff = new Date(Date.now() - IDLE_TIMEOUT_MS);

    const idleSessions = await TerminalSession.find(
      { status: 'active', lastActiveAt: { $lt: cutoff } },
      { _id: 1, projectName: 1 }
    ).lean();

    for (const session of idleSessions) {
      console.log(`[cleanup] terminating idle session: ${session._id}`);
      await this.terminateSession(session._id);
    }

    return idleSessions.length;
  }

  async cleanupOrphanedContainers() {
    // Find containers that exist but have no active session
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(
        "docker ps --filter 'name=lab-' --format '{{.Names}}'"
      );
      
      const runningContainers = stdout.trim().split('\n').filter(Boolean);
      const activeProjects = new Set(
        [...this.activeSessions.values()].map(s => s.projectName)
      );

      for (const container of runningContainers) {
        const projectMatch = container.match(/^(lab-[a-z0-9]+)-/);
        if (projectMatch && !activeProjects.has(projectMatch[1])) {
          console.log(`[cleanup] removing orphaned project: ${projectMatch[1]}`);
          await execAsync(`docker compose -p ${projectMatch[1]} down --volumes`);
        }
      }
    } catch (e) {
      console.error('[cleanup] orphan check failed:', e.message);
    }
  }
}

export const sessionManager = new SessionManager();
```

### Step 3: Cleanup Cron

**File: `server/terminal/cleanup-cron.js`**
```javascript
import { sessionManager } from './session-manager.js';

const CLEANUP_INTERVAL_MS = 60 * 1000; // 60s

export function startCleanupCron() {
  const cleanup = async () => {
    try {
      const idleCount = await sessionManager.cleanupIdleSessions();
      if (idleCount > 0) {
        console.log(`[cleanup-cron] terminated ${idleCount} idle sessions`);
      }

      await sessionManager.cleanupOrphanedContainers();
    } catch (e) {
      console.error('[cleanup-cron] error:', e.message);
    }
  };

  // Run immediately on start
  cleanup();
  
  // Then every interval
  setInterval(cleanup, CLEANUP_INTERVAL_MS);
  
  console.log('[cleanup-cron] started, interval:', CLEANUP_INTERVAL_MS / 1000, 's');
}
```

### Step 4: Update Terminal Routes

**Modify: `server/terminal/terminal-routes.js`**
```javascript
import { sessionManager } from './session-manager.js';

app.get('/ws/terminal/:labSlug', upgradeWebSocket(async (c) => {
  const labSlug = c.req.param('labSlug');
  const sessionId = randomUUID().slice(0, 8);
  const userId = c.get('userId') || null;
  
  let heartbeatInterval = null;

  return {
    async onOpen(event, ws) {
      try {
        // Check queue position
        const queuePos = sessionManager.getQueuePosition(sessionId);
        if (queuePos) {
          ws.send(JSON.stringify({ type: 'queue', position: queuePos }));
        }

        const { projectName, mainContainer } = await sessionManager.requestSession(
          sessionId, userId, labSlug
        );
        
        const stream = await attachToContainer(mainContainer);
        this.sessionId = sessionId;
        this.stream = stream;

        stream.on('data', (chunk) => ws.send(chunk.toString()));
        stream.on('end', () => ws.close());

        // Heartbeat to detect stale connections
        heartbeatInterval = setInterval(() => {
          sessionManager.touchSession(sessionId);
        }, 30000);

        ws.send(`\x1b[32m[Lab: ${labSlug}] Terminal ready.\x1b[0m\r\n`);
      } catch (err) {
        ws.send(`\x1b[31mError: ${err.message}\x1b[0m\r\n`);
        ws.close();
      }
    },

    onMessage(event, ws) {
      if (this.stream?.writable) {
        this.stream.write(event.data);
        sessionManager.touchSession(this.sessionId);
      }
    },

    async onClose() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (this.sessionId) {
        await sessionManager.terminateSession(this.sessionId);
      }
    },
  };
}));
```

### Step 5: Frontend Queue UI

**Update: `app/src/components/lab/web-terminal.tsx`**
```tsx
// Add queue state
const [queuePosition, setQueuePosition] = useState<number | null>(null);

// In WebSocket onmessage:
ws.onmessage = (e) => {
  try {
    const msg = JSON.parse(e.data);
    if (msg.type === 'queue') {
      setQueuePosition(msg.position);
      return;
    }
  } catch {
    // Not JSON, it's terminal data
  }
  setQueuePosition(null);
  term.write(e.data);
};

// In render, show queue position:
{queuePosition && (
  <div className="bg-yellow-500/10 text-yellow-600 px-3 py-2 rounded-md text-sm">
    Waiting in queue: position {queuePosition} of {queuePosition}
  </div>
)}
```

## Todo List

- [x] ~~Migration 003-terminal-sessions.sql~~ → Mongoose models instead (`terminal-session-model.js`, `terminal-audit-log-model.js`)
- [x] ~~Run migration on dev DB~~ N/A — Mongoose auto-creates indexes on first write
- [x] Implement session-manager.js
- [x] Implement cleanup-cron.js
- [x] Update terminal-routes.js with session manager
- [x] Add cleanup cron start to server.js (toggled by `TERMINAL_CLEANUP_DISABLED=1`)
- [x] Update WebTerminal.tsx with queue UI
- [ ] Test concurrent session limit (needs live mongo + VPS)
- [ ] Test idle timeout cleanup
- [ ] Test orphaned container cleanup
- [ ] Load test with multiple browsers

## Success Criteria

- [ ] 6th connection goes to queue, gets position feedback
- [ ] Queued session activates when slot opens
- [ ] Idle session terminates after 30 min
- [ ] No orphaned containers after 24h test
- [ ] Server restart cleans up existing containers

## Security Considerations

- Rate limit session requests per user (future)
- Log all session creates/terminates for audit
- Don't expose container IDs to frontend
