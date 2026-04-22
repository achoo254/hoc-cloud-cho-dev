import { sessionManager } from './session-manager.js';

const INTERVAL_MS = Number(process.env.TERMINAL_CLEANUP_INTERVAL_MS) || 60 * 1000;

let handle = null;

export function startCleanupCron() {
  const tick = async () => {
    try {
      const idleCount = await sessionManager.cleanupIdle();
      if (idleCount > 0) {
        console.log(`[cleanup-cron] terminated ${idleCount} idle session(s)`);
      }
      await sessionManager.cleanupOrphanedProjects();
    } catch (err) {
      console.error('[cleanup-cron] tick failed:', err.message);
    }
  };

  // Fire once on boot to sweep stragglers from the previous process.
  tick();
  handle = setInterval(tick, INTERVAL_MS);
  handle.unref();
  console.log(`[cleanup-cron] started, interval=${INTERVAL_MS / 1000}s`);
}

export function stopCleanupCron() {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}
