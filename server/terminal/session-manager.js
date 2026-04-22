import { TerminalSession } from '../db/models/terminal-session-model.js';
import {
  createContainer,
  destroyContainer,
  docker,
} from '../lib/docker-manager.js';
import {
  hasTopology,
  startLabEnvironment,
  stopLabEnvironment,
  listLabProjects,
} from '../lib/lab-orchestrator.js';

const MAX_CONCURRENT = Number(process.env.TERMINAL_MAX_CONCURRENT) || 5;
const IDLE_TIMEOUT_MS = Number(process.env.TERMINAL_IDLE_TIMEOUT_MS) || 30 * 60 * 1000;

/**
 * Tracks live sessions both in memory (for stream handles) and in MongoDB
 * (for audit + cross-restart cleanup).
 *
 * In-memory record shape:
 *   { sessionId, labSlug, projectName|null, containerName|null, container|null }
 */
class SessionManager {
  constructor() {
    this.active = new Map();      // sessionId → record
    this.waitQueue = [];          // { sessionId, userId, labSlug, resolve, reject }
  }

  async getActiveCount() {
    return this.active.size;
  }

  getQueuePosition(sessionId) {
    const idx = this.waitQueue.findIndex(q => q.sessionId === sessionId);
    return idx === -1 ? null : idx + 1;
  }

  /**
   * Idempotent: if a record for sessionId already exists (reconnect), return it.
   * Otherwise queue or activate based on concurrency cap.
   */
  async requestSession(sessionId, userId, labSlug) {
    const existing = this.active.get(sessionId);
    if (existing) {
      await this.touch(sessionId);
      return existing;
    }

    await TerminalSession.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          userId: userId ?? null,
          labSlug,
          status: 'queued',
          lastActiveAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (this.active.size < MAX_CONCURRENT) {
      return this._activate(sessionId, labSlug);
    }

    return new Promise((resolve, reject) => {
      this.waitQueue.push({ sessionId, userId, labSlug, resolve, reject });
    });
  }

  async _activate(sessionId, labSlug) {
    let record;
    if (hasTopology(labSlug)) {
      const { projectName, mainContainer } = await startLabEnvironment(labSlug, sessionId);
      record = { sessionId, labSlug, projectName, containerName: mainContainer, container: null };
    } else {
      const container = await createContainer(sessionId);
      record = {
        sessionId,
        labSlug,
        projectName: null,
        containerName: container.id,
        container,
      };
    }

    this.active.set(sessionId, record);
    await TerminalSession.updateOne(
      { _id: sessionId },
      {
        $set: {
          status: 'active',
          projectName: record.projectName,
          containerName: record.containerName,
          lastActiveAt: new Date(),
        },
      },
    );
    return record;
  }

  getRecord(sessionId) {
    return this.active.get(sessionId) ?? null;
  }

  async touch(sessionId) {
    await TerminalSession.updateOne(
      { _id: sessionId },
      { $set: { lastActiveAt: new Date() } },
    );
  }

  async terminate(sessionId) {
    const record = this.active.get(sessionId);
    if (!record) return;

    this.active.delete(sessionId);

    try {
      if (record.projectName) {
        await stopLabEnvironment(record.projectName);
      } else if (record.container) {
        await destroyContainer(record.container);
      } else if (record.containerName) {
        await destroyContainer(docker.getContainer(record.containerName));
      }
    } catch (err) {
      console.error(`[session-manager] cleanup ${sessionId} failed:`, err.message);
    }

    await TerminalSession.updateOne(
      { _id: sessionId },
      { $set: { status: 'terminated', terminatedAt: new Date() } },
    );

    this._drainQueue();
  }

  async _drainQueue() {
    while (this.waitQueue.length > 0 && this.active.size < MAX_CONCURRENT) {
      const next = this.waitQueue.shift();
      try {
        const record = await this._activate(next.sessionId, next.labSlug);
        next.resolve(record);
      } catch (err) {
        next.reject(err);
      }
    }
  }

  async cleanupIdle() {
    const cutoff = new Date(Date.now() - IDLE_TIMEOUT_MS);
    const candidates = await TerminalSession.find(
      { status: 'active', lastActiveAt: { $lt: cutoff } },
      { _id: 1 },
    ).lean();

    for (const { _id } of candidates) {
      console.log(`[session-manager] idle timeout: ${_id}`);
      await this.terminate(_id);
    }
    return candidates.length;
  }

  async cleanupOrphanedProjects() {
    try {
      const liveProjects = await listLabProjects();
      const activeProjects = new Set(
        [...this.active.values()].map(r => r.projectName).filter(Boolean),
      );
      for (const project of liveProjects) {
        if (!activeProjects.has(project)) {
          console.log(`[session-manager] orphan compose project: ${project}`);
          await stopLabEnvironment(project);
        }
      }
    } catch (err) {
      console.error('[session-manager] orphan scan failed:', err.message);
    }
  }
}

export const sessionManager = new SessionManager();
