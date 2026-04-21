# Phase 04: Security Hardening

**Priority:** P1  
**Status:** Pending  
**Effort:** 1 week  
**Dependencies:** Phase 03 complete

## Overview

Harden the terminal system against abuse: resource limits, network isolation, command restrictions, monitoring/alerting. Prevent crypto mining, DoS, and container escape.

## Requirements

### Functional
- F1: Container resource limits enforced (256MB RAM, 0.5 CPU)
- F2: No internet access from lab containers
- F3: Optional command whitelist per lab
- F4: Abuse detection (high CPU, spam commands)
- F5: Rate limiting on WebSocket connections
- F6: Audit logging for all terminal activity

### Non-Functional
- NF1: Container cannot access host filesystem
- NF2: Container cannot access Docker socket
- NF3: Container cannot escalate privileges
- NF4: Alerts within 60s of abuse detection

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Rate Limiting (Nginx/Hono)                             │
│ - Max 3 WS connections per IP per minute                        │
│ - Max 100 messages per minute per session                       │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Session Controls                                        │
│ - Max 5 concurrent sessions total                                │
│ - 30 min idle timeout                                           │
│ - 2 hour absolute timeout                                       │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Container Isolation                                     │
│ - No network access (network_mode: none or isolated bridge)     │
│ - Read-only root filesystem                                     │
│ - No privileged mode                                            │
│ - Dropped capabilities (except NET_ADMIN, NET_RAW for labs)    │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Resource Limits                                         │
│ - Memory: 256MB hard limit                                       │
│ - CPU: 0.5 cores                                                │
│ - PIDs: 50 max                                                  │
│ - No swap                                                       │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Monitoring & Alerting                                   │
│ - CPU spike detection (>80% for >30s)                           │
│ - Audit log all commands                                        │
│ - Alert on suspicious patterns                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `server/terminal/rate-limiter.js` | WebSocket rate limiting |
| `server/terminal/abuse-detector.js` | Suspicious pattern detection |
| `server/terminal/audit-logger.js` | Command logging |
| `server/lib/container-security.js` | Hardened container config |
| `docker/seccomp-profile.json` | Syscall restrictions |

### Modify
| File | Change |
|------|--------|
| `server/terminal/terminal-routes.js` | Add rate limiting, audit |
| `server/lib/docker-manager.js` | Apply security config |
| `docker/lab-*/docker-compose.yml` | Add security options |
| `deploy/nginx.conf.example` | Add WS rate limiting |

## Implementation Steps

### Step 1: Hardened Container Config

**File: `server/lib/container-security.js`**
```javascript
export const CONTAINER_SECURITY_OPTS = {
  // Resource limits
  HostConfig: {
    Memory: 256 * 1024 * 1024,      // 256MB
    MemorySwap: 256 * 1024 * 1024,  // No swap
    CpuQuota: 50000,                 // 0.5 CPU
    CpuPeriod: 100000,
    PidsLimit: 50,                   // Max 50 processes
    
    // Filesystem
    ReadonlyRootfs: false,           // Need writable for some tools
    Tmpfs: {
      '/tmp': 'rw,noexec,nosuid,size=64m',
    },
    
    // Security
    SecurityOpt: [
      'no-new-privileges:true',
    ],
    CapDrop: ['ALL'],
    CapAdd: ['NET_ADMIN', 'NET_RAW'], // Required for network labs
    
    // No privileged access
    Privileged: false,
    
    // Isolation
    NetworkMode: 'none',  // Override per-lab with custom bridge
  },
  
  // Non-root user
  User: 'labuser',
};

export function getLabSecurityOpts(labSlug) {
  const base = { ...CONTAINER_SECURITY_OPTS };
  
  // Lab-specific overrides
  switch (labSlug) {
    case 'http':
      // HTTP lab needs to bind to port 80
      base.HostConfig.CapAdd.push('NET_BIND_SERVICE');
      break;
  }
  
  return base;
}
```

### Step 2: Rate Limiter

**File: `server/terminal/rate-limiter.js`**
```javascript
const CONNECTION_LIMIT = 3;      // per IP per minute
const MESSAGE_LIMIT = 100;       // per session per minute
const WINDOW_MS = 60 * 1000;

class RateLimiter {
  constructor() {
    this.connections = new Map(); // IP -> { count, resetAt }
    this.messages = new Map();    // sessionId -> { count, resetAt }
  }

  checkConnection(ip) {
    const now = Date.now();
    const record = this.connections.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
    
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + WINDOW_MS;
    }
    
    record.count++;
    this.connections.set(ip, record);
    
    if (record.count > CONNECTION_LIMIT) {
      return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
    }
    
    return { allowed: true };
  }

  checkMessage(sessionId) {
    const now = Date.now();
    const record = this.messages.get(sessionId) || { count: 0, resetAt: now + WINDOW_MS };
    
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + WINDOW_MS;
    }
    
    record.count++;
    this.messages.set(sessionId, record);
    
    return record.count <= MESSAGE_LIMIT;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.connections) {
      if (now > record.resetAt) this.connections.delete(key);
    }
    for (const [key, record] of this.messages) {
      if (now > record.resetAt) this.messages.delete(key);
    }
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
```

### Step 3: Abuse Detector

**File: `server/terminal/abuse-detector.js`**
```javascript
import db from '../db/sqlite-client.js';

const SUSPICIOUS_PATTERNS = [
  /curl.*\|.*sh/i,           // Pipe curl to shell
  /wget.*\|.*sh/i,           // Pipe wget to shell
  /bitcoin|crypto|miner/i,   // Crypto keywords
  /rm\s+-rf\s+\//,           // Dangerous rm
  /:(){ :|:& };:/,           // Fork bomb
  /dd\s+if=.*of=/i,          // DD disk operations
];

const CPU_SPIKE_THRESHOLD = 80;
const CPU_SPIKE_DURATION_MS = 30 * 1000;

class AbuseDetector {
  constructor() {
    this.cpuSpikes = new Map(); // sessionId -> { startedAt }
  }

  checkCommand(sessionId, command) {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(command)) {
        this.logAbuse(sessionId, 'suspicious_command', command);
        return { blocked: true, reason: 'Command not allowed' };
      }
    }
    return { blocked: false };
  }

  async checkContainerCpu(sessionId, containerId) {
    try {
      const Docker = (await import('dockerode')).default;
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      const container = docker.getContainer(containerId);
      
      const stats = await container.stats({ stream: false });
      const cpuPercent = this.calculateCpuPercent(stats);
      
      if (cpuPercent > CPU_SPIKE_THRESHOLD) {
        const spike = this.cpuSpikes.get(sessionId);
        if (!spike) {
          this.cpuSpikes.set(sessionId, { startedAt: Date.now() });
        } else if (Date.now() - spike.startedAt > CPU_SPIKE_DURATION_MS) {
          this.logAbuse(sessionId, 'cpu_spike', `${cpuPercent}% for ${CPU_SPIKE_DURATION_MS}ms`);
          return { terminate: true, reason: 'Excessive CPU usage' };
        }
      } else {
        this.cpuSpikes.delete(sessionId);
      }
      
      return { terminate: false };
    } catch (e) {
      return { terminate: false };
    }
  }

  calculateCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * cpuCount * 100;
    }
    return 0;
  }

  logAbuse(sessionId, type, details) {
    const now = Math.floor(Date.now() / 1000);
    console.warn(`[ABUSE] session=${sessionId} type=${type} details=${details}`);
    
    db.prepare(`
      INSERT INTO terminal_audit_log (session_id, event_type, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, `abuse:${type}`, details, now);
  }
}

export const abuseDetector = new AbuseDetector();
```

### Step 4: Audit Logger

**File: `server/terminal/audit-logger.js`**
```javascript
import db from '../db/sqlite-client.js';

// Migration for audit log table
export const AUDIT_MIGRATION = `
CREATE TABLE IF NOT EXISTS terminal_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON terminal_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON terminal_audit_log(event_type);
`;

class AuditLogger {
  log(sessionId, eventType, details = null) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO terminal_audit_log (session_id, event_type, details, created_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, eventType, details, now);
  }

  logConnect(sessionId, userId, labSlug, ip) {
    this.log(sessionId, 'connect', JSON.stringify({ userId, labSlug, ip }));
  }

  logDisconnect(sessionId, reason) {
    this.log(sessionId, 'disconnect', reason);
  }

  logCommand(sessionId, command) {
    // Truncate long commands
    const truncated = command.length > 500 ? command.slice(0, 500) + '...' : command;
    this.log(sessionId, 'command', truncated);
  }

  getRecentActivity(hours = 24) {
    const cutoff = Math.floor(Date.now() / 1000) - (hours * 3600);
    return db.prepare(`
      SELECT * FROM terminal_audit_log 
      WHERE created_at > ? 
      ORDER BY created_at DESC 
      LIMIT 1000
    `).all(cutoff);
  }
}

export const auditLogger = new AuditLogger();
```

### Step 5: Nginx Rate Limiting

**Update: `deploy/nginx.conf.example`**
```nginx
# Rate limiting for WebSocket connections
limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=3r/m;

server {
    # ... existing config ...

    location /ws/ {
        limit_req zone=ws_limit burst=5 nodelay;
        limit_req_status 429;
        
        proxy_pass http://127.0.0.1:8387;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### Step 6: Update Terminal Routes

**Modify: `server/terminal/terminal-routes.js`**
```javascript
import { rateLimiter } from './rate-limiter.js';
import { abuseDetector } from './abuse-detector.js';
import { auditLogger } from './audit-logger.js';

app.get('/ws/terminal/:labSlug', upgradeWebSocket(async (c) => {
  const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown';
  
  // Rate limit check
  const rateCheck = rateLimiter.checkConnection(ip);
  if (!rateCheck.allowed) {
    return c.text(`Rate limited. Retry after ${rateCheck.retryAfter}s`, 429);
  }

  // ... rest of handler ...

  return {
    async onOpen(event, ws) {
      auditLogger.logConnect(sessionId, userId, labSlug, ip);
      // ... existing code ...
    },

    onMessage(event, ws) {
      // Rate limit messages
      if (!rateLimiter.checkMessage(sessionId)) {
        ws.send('\x1b[31m[Rate limited] Slow down!\x1b[0m\r\n');
        return;
      }

      // Abuse detection
      const command = event.data.toString();
      const abuseCheck = abuseDetector.checkCommand(sessionId, command);
      if (abuseCheck.blocked) {
        ws.send(`\x1b[31m[Blocked] ${abuseCheck.reason}\x1b[0m\r\n`);
        auditLogger.log(sessionId, 'blocked_command', command);
        return;
      }

      auditLogger.logCommand(sessionId, command);
      // ... existing code ...
    },

    async onClose() {
      auditLogger.logDisconnect(sessionId, 'client_closed');
      // ... existing cleanup ...
    },
  };
}));
```

## Todo List

- [ ] Create container-security.js with hardened config
- [ ] Create rate-limiter.js
- [ ] Create abuse-detector.js
- [ ] Create audit-logger.js with migration
- [ ] Run audit log migration
- [ ] Update docker-compose files with security options
- [ ] Update terminal-routes.js with all security layers
- [ ] Update nginx.conf with WS rate limiting
- [ ] Test rate limiting with concurrent connections
- [ ] Test abuse detection with suspicious commands
- [ ] Verify container isolation (no internet, no host access)
- [ ] Load test resource limits
- [ ] Set up log monitoring/alerting

## Success Criteria

- [ ] Container OOM-killed at 256MB (verified with stress test)
- [ ] Container cannot ping external IPs
- [ ] Fork bomb gets PID limited
- [ ] Suspicious commands blocked and logged
- [ ] Rate limiting kicks in at thresholds
- [ ] Audit log captures all activity

## Security Checklist

- [ ] No root in containers
- [ ] No privileged mode
- [ ] Capabilities dropped (except needed)
- [ ] No new privileges
- [ ] Memory/CPU/PID limits
- [ ] Network isolated
- [ ] Tmpfs for /tmp (noexec)
- [ ] Rate limiting at nginx + app
- [ ] Command filtering
- [ ] Audit logging
- [ ] Abuse detection
