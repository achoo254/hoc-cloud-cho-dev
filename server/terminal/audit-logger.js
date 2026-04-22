import { TerminalAuditLog } from '../db/models/terminal-audit-log-model.js';

class AuditLogger {
  async log(sessionId, eventType, details = null) {
    try {
      await TerminalAuditLog.create({ sessionId, eventType, details });
    } catch (err) {
      console.error('[audit-logger] insert failed:', err.message);
    }
  }

  logConnect(sessionId, userId, labSlug, ip) {
    return this.log(sessionId, 'connect', JSON.stringify({ userId, labSlug, ip }));
  }

  logDisconnect(sessionId, reason) {
    return this.log(sessionId, 'disconnect', reason);
  }

  logCommand(sessionId, data) {
    // Most WS messages are single keystrokes — batch nothing, but truncate to
    // keep pathological paste storms bounded.
    const truncated = data.length > 500 ? data.slice(0, 500) + '...' : data;
    return this.log(sessionId, 'input', truncated);
  }

  getRecentActivity(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000);
    return TerminalAuditLog
      .find({ createdAt: { $gt: cutoff } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
  }
}

export const auditLogger = new AuditLogger();
