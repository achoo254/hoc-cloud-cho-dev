# Phase 01: Basic Terminal

**Priority:** P1 (blocking)  
**Status:** Code complete (2026-04-22) — awaits VPS deploy  
**Effort:** 1 week  
**Dependencies:** VPS upgrade, Docker installation

## Overview

Implement minimal viable web terminal: xterm.js frontend + WebSocket backend + single Docker container. This phase proves the architecture works end-to-end.

## Context Links

- [Brainstorm Report — web terminal](../reports/brainstorm-260421-1453-self-hosted-web-terminal-learning.md)
- [Brainstorm Report — tmux backend decision](../reports/brainstorm-260422-2132-tmux-web-terminal-backend.md)
- [xterm.js Docs](https://xtermjs.org/docs/)
- [Dockerode API](https://github.com/apocas/dockerode)
- [@hono/node-ws](https://github.com/honojs/middleware/tree/main/packages/node-ws)

## Requirements

### Functional
- F1: Terminal component renders in lab page
- F2: WebSocket connects to `/ws/terminal/:labSlug`
- F3: Docker container starts on connection
- F4: User input streams to container stdin (into tmux session `lab`)
- F5: Container stdout/stderr streams to terminal (from tmux session `lab`)
- F6: On WS disconnect, detach tmux client but LEAVE container running — SessionManager (phase-03) owns container lifecycle via idle-timeout. Reconnect within window re-attaches same tmux session.

### Non-Functional
- NF1: Container boot time <3s
- NF2: Input latency <100ms
- NF3: Works on Chrome, Firefox, Safari

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│ Frontend (app/)                                            │
│                                                            │
│  WebTerminal.tsx                                           │
│  ├── xterm.js Terminal instance                            │
│  ├── FitAddon (responsive sizing)                          │
│  ├── WebSocket client                                      │
│  └── Reconnection logic                                    │
└────────────────────────┬───────────────────────────────────┘
                         │ ws://localhost:8387/ws/terminal/arp
                         ▼
┌────────────────────────────────────────────────────────────┐
│ Backend (server/)                                          │
│                                                            │
│  terminal-routes.js                                        │
│  ├── WebSocket upgrade handler                             │
│  ├── Container lifecycle (create/exec/destroy)             │
│  └── Stream piping (ws ↔ container)                        │
│                                                            │
│  lib/docker-manager.js                                     │
│  ├── Dockerode client singleton                            │
│  ├── createLabContainer(labSlug, sessionId)                │
│  ├── execInContainer(containerId, cmd)                     │
│  └── destroyContainer(containerId)                         │
└────────────────────────┬───────────────────────────────────┘
                         │ Docker API (unix socket)
                         ▼
┌────────────────────────────────────────────────────────────┐
│ Docker                                                     │
│                                                            │
│  Image: lab-terminal:v1                                    │
│  ├── FROM alpine:3.19                                      │
│  ├── RUN apk add iproute2 iputils tcpdump bind-tools       │
│  └── ENTRYPOINT ["/bin/sh"]                                │
└────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `app/src/components/lab/web-terminal.tsx` | xterm.js React component |
| `server/terminal/terminal-routes.js` | WebSocket handler |
| `server/lib/docker-manager.js` | Dockerode wrapper |
| `docker/Dockerfile.lab-terminal` | Base terminal image |
| `docker/docker-compose.dev.yml` | Dev environment |

### Modify
| File | Change |
|------|--------|
| `server/server.js` | Add WebSocket upgrade, terminal routes |
| `app/src/components/lab/diagrams/registry.ts` | Register WebTerminal |
| `package.json` | Add `dockerode` dep |
| `app/package.json` | Add `xterm`, `xterm-addon-fit` deps |

## Implementation Steps

### Step 1: VPS Preparation (blocking)
```bash
# On VPS
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Verify
docker run --rm hello-world
```

### Step 2: Install Dependencies
```bash
# Root (server deps)
npm install dockerode @hono/node-ws

# App (frontend deps)
cd app && npm install xterm @xterm/addon-fit
```

### Step 3: Create Docker Base Image

**File: `docker/Dockerfile.lab-terminal`**
```dockerfile
FROM alpine:3.19

RUN apk add --no-cache \
    iproute2 \
    iputils \
    tcpdump \
    bind-tools \
    curl \
    netcat-openbsd \
    bash \
    tmux

# Tmux defaults: bigger scrollback, mouse wheel, UTF-8 — so reconnects see history
COPY docker/tmux.conf /etc/tmux.conf

# Non-root user for security
RUN adduser -D -s /bin/bash labuser
USER labuser
WORKDIR /home/labuser

# Keep container alive; sessions are spawned via `docker exec tmux ...`
# Do NOT ENTRYPOINT bash — nothing should attach stdin to PID 1.
CMD ["sleep", "infinity"]
```

Build: `docker build -t lab-terminal:v1 -f docker/Dockerfile.lab-terminal .`

**File: `docker/tmux.conf`**
```conf
# Bigger scrollback so reconnecting user can review prior tcpdump/ping output
set -g history-limit 10000
set -g mouse on
set -g default-terminal "xterm-256color"
# Keep window alive if user accidentally types `exit` — SessionManager owns lifecycle
set -g remain-on-exit on
```

### Step 4: Backend - Docker Manager

**File: `server/lib/docker-manager.js`**
```javascript
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const IMAGE = 'lab-terminal:v1';

export async function createContainer(sessionId) {
  const container = await docker.createContainer({
    Image: IMAGE,
    name: `terminal-${sessionId}`,
    Tty: true,
    OpenStdin: true,
    HostConfig: {
      Memory: 256 * 1024 * 1024, // 256MB
      CpuQuota: 50000, // 0.5 CPU
      NetworkMode: 'none', // Isolated for now
      AutoRemove: true,
    },
  });
  await container.start();
  return container;
}

// Attach via tmux: `-A` creates session if missing, `-d` kicks any stale client
// so a second browser tab takes over the existing session instead of spawning a new bash.
export async function attachContainer(container) {
  const exec = await container.exec({
    Cmd: ['tmux', 'new-session', '-A', '-d', '-s', 'lab'],
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
  });
  await exec.start({ Detach: true });

  const attachExec = await container.exec({
    Cmd: ['tmux', 'attach-session', '-d', '-t', 'lab'],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });
  return attachExec.start({ hijack: true, stdin: true });
}

export async function destroyContainer(container) {
  try {
    await container.stop({ t: 1 });
  } catch (e) {
    if (e.statusCode !== 304) throw e; // Already stopped
  }
}
```

### Step 5: Backend - WebSocket Routes

**File: `server/terminal/terminal-routes.js`**
```javascript
import { Hono } from 'hono';
import { createNodeWebSocket } from '@hono/node-ws';
import { createContainer, attachContainer, destroyContainer } from '../lib/docker-manager.js';
import { randomUUID } from 'crypto';

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket();

const app = new Hono();

// sessionId comes from client so reconnects re-attach the same tmux session.
// Phase-03 replaces the ad-hoc create-or-reuse with SessionManager;
// phase-01 keeps a minimal in-memory Map just to prove end-to-end works.
const labContainers = new Map(); // sessionId → dockerode container

app.get('/ws/terminal/:labSlug', upgradeWebSocket(async (c) => {
  const labSlug = c.req.param('labSlug');
  const sessionId = c.req.query('sid') || randomUUID().slice(0, 8);
  let container = labContainers.get(sessionId) ?? null;
  let stream = null;

  return {
    async onOpen(event, ws) {
      try {
        if (!container) {
          container = await createContainer(sessionId);
          labContainers.set(sessionId, container);
        }
        stream = await attachContainer(container); // tmux new-session -A + attach -d

        // Container → WebSocket
        stream.on('data', (chunk) => {
          ws.send(chunk.toString());
        });

        stream.on('end', () => ws.close());

        ws.send(`\x1b[32m[Lab: ${labSlug}] Terminal ready (sid=${sessionId}).\x1b[0m\r\n`);
      } catch (err) {
        ws.send(`\x1b[31mError: ${err.message}\x1b[0m\r\n`);
        ws.close();
      }
    },

    onMessage(event, ws) {
      if (stream && stream.writable) {
        stream.write(event.data);
      }
    },

    async onClose() {
      // DO NOT destroy container here. tmux session persists inside the container
      // so the user can reconnect and resume. Container lifecycle moves to
      // SessionManager (phase-03) which destroys on idle-timeout or explicit terminate.
      // Only clean up the per-WS exec stream handle.
      try { stream?.destroy?.(); } catch {}
    },
  };
}));

export { app as terminalRoutes, injectWebSocket };
```

### Step 6: Frontend - WebTerminal Component

**File: `app/src/components/lab/web-terminal.tsx`**
```tsx
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

interface WebTerminalProps {
  labSlug: string;
  className?: string;
}

export function WebTerminal({ labSlug, className }: WebTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
      },
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Stable per-lab sessionId in sessionStorage so WS reconnect (or tab refresh)
    // re-attaches the same tmux session on the server. Cleared when tab/browser closes.
    const sidKey = `lab-sid:${labSlug}`;
    let sid = sessionStorage.getItem(sidKey);
    if (!sid) {
      sid = crypto.randomUUID().slice(0, 8);
      sessionStorage.setItem(sidKey, sid);
    }
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${labSlug}?sid=${sid}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setStatus('connected');
    ws.onerror = () => setStatus('error');
    ws.onclose = () => setStatus('connecting');
    
    ws.onmessage = (e) => term.write(e.data);
    term.onData((data) => ws.send(data));

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [labSlug]);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-green-500' : 
          status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
        }`} />
        <span className="text-xs text-muted-foreground">
          {status === 'connected' ? 'Connected' : 
           status === 'error' ? 'Connection failed' : 'Connecting...'}
        </span>
      </div>
      <div 
        ref={termRef} 
        className="rounded-lg overflow-hidden border border-border"
        style={{ height: '400px' }}
      />
    </div>
  );
}
```

### Step 7: Integrate into Server

**Modify: `server/server.js`**
```javascript
// Add imports
import { terminalRoutes, injectWebSocket } from './terminal/terminal-routes.js';

// Before serve()
app.route('/', terminalRoutes);

// Modify serve() call
const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[hoc-cloud-labs] serving on http://${info.address}:${info.port}`);
});

// Inject WebSocket support
injectWebSocket(server);
```

### Step 8: Register in Diagram Registry

**Modify: `app/src/components/lab/diagrams/registry.ts`**
```typescript
// Add to registry
WebTerminal: lazy(() =>
  import('../web-terminal').then((m) => ({
    default: m.WebTerminal,
  }))
),
```

## Todo List

- [ ] Upgrade VPS (4GB RAM, 2 vCPU)
- [ ] Install Docker on VPS
- [x] Create Dockerfile.lab-terminal (incl. `tmux` pkg + `tmux.conf`)
- [x] Create `docker/tmux.conf` (history-limit, mouse on, remain-on-exit on)
- [x] Build and push lab-terminal:v1 image (local build verified)
- [x] Install server deps (dockerode, @hono/node-ws)
- [x] Install app deps (@xterm/xterm, @xterm/addon-fit) — used non-deprecated `@xterm/*` packages
- [x] Implement docker-manager.js
- [x] Implement terminal-routes.js
- [x] Implement WebTerminal.tsx (registered in diagrams/registry.ts as `WebTerminal`)
- [x] Integrate WebSocket into server.js (injectWebSocket + cleanup cron)
- [x] Test locally with Docker Desktop (container spawns, tmux session attaches, non-root labuser verified)
- [ ] Verify tmux persistence: disconnect WS mid-command → reconnect → scrollback + prompt intact
- [ ] Verify kick-old-client: open 2nd tab → 1st tab detaches, 2nd takes over
- [ ] Deploy to VPS
- [ ] Smoke test in production

## Success Criteria

- [ ] `docker ps` shows container after WebSocket connect
- [ ] Can type `ls`, `whoami`, `ip addr` and see output
- [ ] Container PID 1 = `sleep infinity`; shell runs as `docker exec tmux attach ...` child
- [ ] WS disconnect → container still running (`docker ps`); reconnect within timeout shows same prompt + scrollback
- [ ] Open second browser tab → first tab sees "client detached" (tmux `-d` flag)
- [ ] Works in Chrome, Firefox
- [ ] Boot time <3 seconds

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Docker socket permission | Add user to docker group |
| WebSocket proxy issues | Configure nginx for WS upgrade |
| Container not starting | Check image availability, logs |

## Security Considerations

- Container runs as non-root `labuser`
- Network mode `none` (no external access yet)
- Memory/CPU limits prevent resource exhaustion
- AutoRemove ensures no zombie containers
