# Phase 02: Lab-specific Containers

**Priority:** P1  
**Status:** Partial (2026-04-22) — ARP topology + orchestrator done; 5 remaining labs pending  
**Effort:** 2 weeks  
**Dependencies:** Phase 01 complete

## Overview

Create specialized Docker images for each lab type with pre-configured network topologies. Each lab gets realistic scenarios (e.g., ARP lab has 2 hosts on same LAN, DHCP lab has server + client).

## Context Links

- [Phase 01: Basic Terminal](./phase-01-basic-terminal.md)
- [Docker Networking Docs](https://docs.docker.com/network/)
- [Current Labs](../../fixtures/labs/)

## Requirements

### Functional
- F1: Each lab type has dedicated Docker image
- F2: ARP lab: 2 hosts, shared bridge network, can ARP each other
- F3: DHCP lab: DHCP server + client, client gets IP via DORA
- F4: DNS lab: Local resolver + upstream, can query domains
- F5: ICMP lab: 2 hosts, can ping, traceroute visible
- F6: HTTP lab: nginx server + curl client
- F7: TCP/UDP lab: netcat server + client demos

### Non-Functional
- NF1: Each scenario boots <5s
- NF2: Images <100MB each
- NF3: Pre-populated with sample data/configs

## Lab Scenarios

### ARP Lab
```
┌─────────────┐     ┌─────────────┐
│  host-a     │     │  host-b     │
│ 10.0.0.10   │────────│ 10.0.0.20   │
│ aa:bb:cc:01 │     │ aa:bb:cc:02 │
└─────────────┘     └─────────────┘
      │                   │
      └───────────────────┘
           lab-arp-net
```

**Commands to try:**
- `ip neigh show` (empty cache)
- `ping 10.0.0.20` (triggers ARP)
- `ip neigh show` (see ARP entry)
- `tcpdump -n arp` (capture ARP packets)

### DHCP Lab
```
┌─────────────────┐     ┌─────────────┐
│  dhcp-server    │     │  dhcp-client│
│  10.0.0.1       │─────│  (no IP yet)│
│  dnsmasq        │     │             │
└─────────────────┘     └─────────────┘
           lab-dhcp-net
```

**Commands to try:**
- `ip addr` (no IP on client)
- `dhclient -v eth0` (request IP)
- `ip addr` (see assigned IP)
- `cat /var/lib/dhcp/dhclient.leases`

### DNS Lab
```
┌─────────────────┐     ┌─────────────┐
│  dns-resolver   │     │  dns-client │
│  10.0.0.53      │─────│  10.0.0.10  │
│  unbound        │     │             │
└─────────────────┘     └─────────────┘
           lab-dns-net
```

**Commands to try:**
- `dig @10.0.0.53 example.com`
- `dig @10.0.0.53 example.com +trace`
- `nslookup cloudflare.com 10.0.0.53`

### HTTP Lab
```
┌─────────────────┐     ┌─────────────┐
│  http-server    │     │  http-client│
│  10.0.0.80      │─────│  10.0.0.10  │
│  nginx          │     │  curl       │
└─────────────────┘     └─────────────┘
           lab-http-net
```

**Commands to try:**
- `curl -v http://10.0.0.80/`
- `curl -I http://10.0.0.80/`
- `tcpdump -A -i eth0 port 80`

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `docker/lab-arp/Dockerfile` | ARP lab image |
| `docker/lab-arp/docker-compose.yml` | ARP topology |
| `docker/lab-dhcp/Dockerfile.server` | DHCP server |
| `docker/lab-dhcp/Dockerfile.client` | DHCP client |
| `docker/lab-dhcp/docker-compose.yml` | DHCP topology |
| `docker/lab-dns/Dockerfile` | DNS lab image |
| `docker/lab-dns/docker-compose.yml` | DNS topology |
| `docker/lab-http/Dockerfile` | HTTP lab image |
| `docker/lab-http/docker-compose.yml` | HTTP topology |
| `server/lib/lab-orchestrator.js` | Multi-container management |

### Modify
| File | Change |
|------|--------|
| `server/lib/docker-manager.js` | Support docker-compose up/down |
| `server/terminal/terminal-routes.js` | Route to correct lab topology |

## Implementation Steps

> **tmux convention:** every user-facing lab image MUST install `tmux` and ship `/etc/tmux.conf` (see phase-01). The backend attaches via `tmux new-session -A -s lab` + `tmux attach-session -d -t lab` so WS reconnect restores state and a second tab kicks the first. PID 1 must be long-running and non-interactive — use `sleep infinity`, NOT `bash`.

### Step 1: ARP Lab Image

**File: `docker/lab-arp/Dockerfile`**
```dockerfile
FROM alpine:3.19

RUN apk add --no-cache \
    iproute2 \
    iputils \
    tcpdump \
    arping \
    bash \
    tmux

COPY docker/tmux.conf /etc/tmux.conf

RUN adduser -D -s /bin/bash labuser
USER labuser
WORKDIR /home/labuser

# Welcome message with instructions
COPY --chown=labuser:labuser motd.txt /etc/motd
RUN echo 'cat /etc/motd' >> ~/.bashrc

# Keep container alive; sessions spawn via `docker exec tmux attach ...`
CMD ["sleep", "infinity"]
```

**File: `docker/lab-arp/docker-compose.yml`**
```yaml
version: '3.8'

services:
  host-a:
    build: .
    container_name: arp-host-a
    hostname: host-a
    stdin_open: true
    tty: true
    networks:
      lab-net:
        ipv4_address: 10.0.0.10
    mac_address: "aa:bb:cc:00:00:01"
    cap_add:
      - NET_ADMIN
      - NET_RAW
    mem_limit: 128m
    cpus: 0.25

  host-b:
    build: .
    container_name: arp-host-b
    hostname: host-b
    stdin_open: true
    tty: true
    networks:
      lab-net:
        ipv4_address: 10.0.0.20
    mac_address: "aa:bb:cc:00:00:02"
    cap_add:
      - NET_ADMIN
      - NET_RAW
    mem_limit: 128m
    cpus: 0.25

networks:
  lab-net:
    driver: bridge
    ipam:
      config:
        - subnet: 10.0.0.0/24
```

### Step 2: DHCP Lab Images

**File: `docker/lab-dhcp/Dockerfile.server`**
```dockerfile
FROM alpine:3.19

RUN apk add --no-cache dnsmasq bash iproute2

# DHCP config
RUN echo "dhcp-range=10.0.0.100,10.0.0.200,12h" > /etc/dnsmasq.conf && \
    echo "dhcp-option=option:router,10.0.0.1" >> /etc/dnsmasq.conf

ENTRYPOINT ["dnsmasq", "-d", "--log-dhcp"]
```

**File: `docker/lab-dhcp/Dockerfile.client`**
```dockerfile
FROM alpine:3.19

RUN apk add --no-cache dhclient bash iproute2 tcpdump tmux

COPY docker/tmux.conf /etc/tmux.conf

RUN adduser -D -s /bin/bash labuser
USER labuser
WORKDIR /home/labuser

COPY --chown=labuser:labuser motd-dhcp.txt /etc/motd
RUN echo 'cat /etc/motd' >> ~/.bashrc

CMD ["sleep", "infinity"]
```

*(Dockerfile.server runs dnsmasq as PID 1 — no shell session, no tmux needed.)*

### Step 3: Lab Orchestrator

**File: `server/lib/lab-orchestrator.js`**
```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const DOCKER_DIR = path.resolve(process.cwd(), 'docker');

const LAB_CONFIGS = {
  arp: { dir: 'lab-arp', mainService: 'host-a' },
  dhcp: { dir: 'lab-dhcp', mainService: 'client' },
  dns: { dir: 'lab-dns', mainService: 'client' },
  http: { dir: 'lab-http', mainService: 'client' },
  'icmp-ping': { dir: 'lab-icmp', mainService: 'host-a' },
  'tcp-udp': { dir: 'lab-tcp', mainService: 'client' },
};

export async function startLabEnvironment(labSlug, sessionId) {
  const config = LAB_CONFIGS[labSlug];
  if (!config) {
    throw new Error(`No lab config for: ${labSlug}`);
  }

  const projectName = `lab-${sessionId}`;
  const composeFile = path.join(DOCKER_DIR, config.dir, 'docker-compose.yml');

  await execAsync(
    `docker compose -p ${projectName} -f ${composeFile} up -d`,
    { timeout: 30000 }
  );

  return {
    projectName,
    mainContainer: `${projectName}-${config.mainService}-1`,
  };
}

export async function stopLabEnvironment(projectName) {
  await execAsync(
    `docker compose -p ${projectName} down --volumes --remove-orphans`,
    { timeout: 30000 }
  );
}

export async function attachToContainer(containerName) {
  const Docker = (await import('dockerode')).default;
  const docker = new Docker({ socketPath: '/var/run/docker.sock' });
  const container = docker.getContainer(containerName);
  
  return container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
    hijack: true,
  });
}
```

### Step 4: Update Terminal Routes

**Modify: `server/terminal/terminal-routes.js`**
```javascript
import { startLabEnvironment, stopLabEnvironment, attachToContainer } from '../lib/lab-orchestrator.js';

// In WebSocket handler:
async onOpen(event, ws) {
  try {
    const { projectName, mainContainer } = await startLabEnvironment(labSlug, sessionId);
    const stream = await attachToContainer(mainContainer);
    
    // Store for cleanup
    this.projectName = projectName;
    this.stream = stream;
    
    // ... rest of stream handling
  } catch (err) {
    ws.send(`\x1b[31mError starting lab: ${err.message}\x1b[0m\r\n`);
    ws.close();
  }
},

async onClose() {
  if (this.projectName) {
    await stopLabEnvironment(this.projectName);
  }
}
```

## Todo List

- [x] Create docker/lab-arp/ directory and files (Dockerfile, compose, motd)
- [ ] Create docker/lab-dhcp/ directory and files
- [ ] Create docker/lab-dns/ directory and files
- [ ] Create docker/lab-http/ directory and files
- [ ] Create docker/lab-icmp/ directory and files
- [ ] Create docker/lab-tcp/ directory and files
- [ ] Build all images locally (only lab-terminal:v1 + lab-arp bases exist so far)
- [x] Implement lab-orchestrator.js (topology registry in `LAB_TOPOLOGIES`)
- [x] Update terminal-routes.js for multi-container (via session-manager → hasTopology fallback)
- [ ] Test each lab scenario manually
- [x] Create MOTD files with instructions per lab (arp only)
- [ ] Push images to registry (or build on VPS)
- [ ] Deploy and test on VPS

## Success Criteria

- [ ] ARP lab: Can ping host-b, see ARP cache update
- [ ] DHCP lab: Client gets IP from server via DORA
- [ ] DNS lab: Can resolve domains through local resolver
- [ ] HTTP lab: Can curl nginx server, capture packets
- [ ] Each lab boots <5s
- [ ] Each lab cleans up completely on disconnect

## Security Considerations

- Containers have NET_ADMIN only for network tools (not SYS_ADMIN)
- No internet access from lab networks (isolated bridges)
- Resource limits per container (128MB RAM, 0.25 CPU)
- Project name includes session ID for isolation
