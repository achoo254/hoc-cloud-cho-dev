import { getContainerStats } from '../lib/docker-manager.js';
import { auditLogger } from './audit-logger.js';

const SUSPICIOUS_PATTERNS = [
  /curl\s+[^|]*\|\s*sh/i,
  /wget\s+[^|]*\|\s*sh/i,
  /\bbitcoin\b|\bminer\b|\bxmrig\b/i,
  /\brm\s+-rf\s+\/(?!\w)/,
  /:\s*\(\s*\)\s*{\s*:\|:\s*&\s*}\s*;\s*:/,  // fork bomb
  /\bdd\s+if=[^\s]+\s+of=\/dev\//i,
];

const CPU_SPIKE_THRESHOLD = 80;
const CPU_SPIKE_DURATION_MS = 30 * 1000;

class AbuseDetector {
  constructor() {
    this.cpuSpikes = new Map(); // sessionId → { startedAt }
    this.inputBuffer = new Map(); // sessionId → accumulated line buffer
  }

  /**
   * Buffer WS input until a newline, then match against suspicious patterns.
   * Most WS messages arrive as per-keystroke bytes — pattern matching each
   * byte would never hit, so we reconstruct full commands line-by-line.
   */
  ingestInput(sessionId, data) {
    const prev = this.inputBuffer.get(sessionId) || '';
    const combined = prev + data;
    const newlineIdx = combined.search(/[\r\n]/);
    if (newlineIdx === -1) {
      // Cap buffer at 2KB to bound memory.
      this.inputBuffer.set(sessionId, combined.slice(-2048));
      return { blocked: false };
    }
    const line = combined.slice(0, newlineIdx);
    this.inputBuffer.set(sessionId, combined.slice(newlineIdx + 1));

    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(line)) {
        this._logAbuse(sessionId, 'suspicious_command', line);
        return { blocked: true, reason: 'Command not allowed', line };
      }
    }
    return { blocked: false, line };
  }

  dropSession(sessionId) {
    this.cpuSpikes.delete(sessionId);
    this.inputBuffer.delete(sessionId);
  }

  async checkContainerCpu(sessionId, containerId) {
    try {
      const stats = await getContainerStats(containerId);
      const cpuPercent = this._calcCpuPercent(stats);

      if (cpuPercent > CPU_SPIKE_THRESHOLD) {
        const spike = this.cpuSpikes.get(sessionId);
        if (!spike) {
          this.cpuSpikes.set(sessionId, { startedAt: Date.now() });
        } else if (Date.now() - spike.startedAt > CPU_SPIKE_DURATION_MS) {
          this._logAbuse(sessionId, 'cpu_spike', `${cpuPercent.toFixed(1)}% sustained`);
          return { terminate: true, reason: 'Excessive CPU usage' };
        }
      } else {
        this.cpuSpikes.delete(sessionId);
      }
    } catch {
      // Stats failure is non-fatal — container may have exited.
    }
    return { terminate: false };
  }

  _calcCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage
      - stats.precpu_stats.cpu_usage.total_usage;
    const sysDelta = stats.cpu_stats.system_cpu_usage
      - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;
    if (sysDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / sysDelta) * cpuCount * 100;
    }
    return 0;
  }

  _logAbuse(sessionId, type, details) {
    console.warn(`[ABUSE] session=${sessionId} type=${type} details=${details}`);
    auditLogger.log(sessionId, `abuse:${type}`, details);
  }
}

export const abuseDetector = new AbuseDetector();
