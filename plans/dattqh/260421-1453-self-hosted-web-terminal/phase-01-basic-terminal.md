# Phase 01: Basic Terminal

**Priority:** P1 (blocking)  
**Status:** Pending  
**Effort:** 1 week  
**Dependencies:** VPS upgrade, Docker installation

## Overview

Implement minimal viable web terminal: xterm.js frontend + WebSocket backend + single Docker container. This phase proves the architecture works end-to-end.

## Context Links

- [Brainstorm Report](../reports/brainstorm-260421-1453-self-hosted-web-terminal-learning.md)
- [xterm.js Docs](https://xtermjs.org/docs/)
- [Dockerode API](https://github.com/apocas/dockerode)
- [@hono/node-ws](https://github.com/honojs/middleware/tree/main/packages/node-ws)

## Requirements

### Functional
- F1: Terminal component renders in lab page
- F2: WebSocket connects to `/ws/terminal/:labSlug`
- F3: Docker container starts on connection
- F4: User input streams to container stdin
- F5: Container stdout/stderr streams to terminal
- F6: Container stops on disconnect

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
    bash

# Non-root user for security
RUN adduser -D -s /bin/bash labuser
USER labuser
WORKDIR /home/labuser

ENTRYPOINT ["/bin/bash"]
```

Build: `docker build -t lab-terminal:v1 -f docker/Dockerfile.lab-terminal .`

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

export async function attachContainer(container) {
  return container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
  });
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

app.get('/ws/terminal/:labSlug', upgradeWebSocket(async (c) => {
  const labSlug = c.req.param('labSlug');
  const sessionId = randomUUID().slice(0, 8);
  let container = null;
  let stream = null;

  return {
    async onOpen(event, ws) {
      try {
        container = await createContainer(sessionId);
        stream = await attachContainer(container);
        
        // Container → WebSocket
        stream.on('data', (chunk) => {
          ws.send(chunk.toString());
        });
        
        stream.on('end', () => ws.close());
        
        ws.send(`\x1b[32m[Lab: ${labSlug}] Terminal ready.\x1b[0m\r\n`);
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
      if (container) {
        await destroyContainer(container);
      }
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
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${labSlug}`;
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
- [ ] Create Dockerfile.lab-terminal
- [ ] Build and push lab-terminal:v1 image
- [ ] Install server deps (dockerode, @hono/node-ws)
- [ ] Install app deps (xterm, @xterm/addon-fit)
- [ ] Implement docker-manager.js
- [ ] Implement terminal-routes.js
- [ ] Implement WebTerminal.tsx
- [ ] Integrate WebSocket into server.js
- [ ] Test locally with Docker Desktop
- [ ] Deploy to VPS
- [ ] Smoke test in production

## Success Criteria

- [ ] `docker ps` shows container after WebSocket connect
- [ ] Can type `ls`, `whoami`, `ip addr` and see output
- [ ] Container auto-removes after disconnect
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
