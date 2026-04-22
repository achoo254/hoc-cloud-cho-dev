import Docker from 'dockerode';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

const IMAGE = process.env.LAB_TERMINAL_IMAGE || 'lab-terminal:v1';

// Windows/macOS Docker Desktop expose the named pipe; dockerode auto-detects
// when socketPath is omitted. On Linux we pin to the default socket.
const dockerOpts = process.platform === 'linux'
  ? { socketPath: '/var/run/docker.sock' }
  : {};

export const docker = new Docker(dockerOpts);

const BASE_SECURITY = {
  Memory: 256 * 1024 * 1024,
  MemorySwap: 256 * 1024 * 1024,
  CpuQuota: 50000,
  CpuPeriod: 100000,
  PidsLimit: 50,
  SecurityOpt: ['no-new-privileges:true'],
  CapDrop: ['ALL'],
  CapAdd: ['NET_ADMIN', 'NET_RAW'],
  Privileged: false,
  AutoRemove: true,
  Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=64m' },
};

/**
 * Creates the generic terminal container (Phase 01). Network is isolated
 * (`none`) — lab scenarios that need topology go through lab-orchestrator.
 */
export async function createContainer(sessionId) {
  const container = await docker.createContainer({
    Image: IMAGE,
    name: `terminal-${sessionId}`,
    Tty: true,
    OpenStdin: true,
    User: 'labuser',
    HostConfig: {
      ...BASE_SECURITY,
      NetworkMode: 'none',
    },
  });
  await container.start();
  return container;
}

/**
 * Wraps a dockerode exec hijacked stream so:
 *   - reads (consumer `on('data')`) get demultiplexed payload
 *   - writes (`write()`) go to exec stdin
 *
 * Background: Docker daemon on Windows/Docker Desktop returns the 8-byte
 * multiplex frame header (\x01\x00\x00\x00\x00\x00\x00<len>) even on
 * `Tty: true` exec streams. If forwarded raw to xterm.js, the header bytes
 * render as Ctrl+A (tmux prefix) + null padding, corrupting every keystroke.
 * `docker.modem.demuxStream` transparently strips framing when present
 * and passes through raw TTY bytes when not, so this fix is safe on all
 * platforms.
 */
class ExecStreamWrapper extends EventEmitter {
  constructor(src) {
    super();
    this._src = src;
    const out = new PassThrough();
    docker.modem.demuxStream(src, out, out);
    out.on('data', (chunk) => this.emit('data', chunk));
    out.on('end', () => this.emit('end'));
    out.on('error', (err) => this.emit('error', err));
    src.on('error', (err) => this.emit('error', err));
    src.on('close', () => this.emit('end'));
  }
  write(data) { return this._src.write(data); }
  get writable() { return this._src.writable ?? false; }
  destroy(err) {
    try { this._src.destroy?.(err); } catch {}
    this.emit('close');
  }
}

/**
 * Attach via tmux — `-A` creates session if missing, `-d` kicks any stale
 * client so a 2nd browser tab takes over the existing session rather than
 * spawning a fresh bash.
 */
export async function attachContainer(container) {
  const bootstrap = await container.exec({
    Cmd: ['tmux', 'new-session', '-A', '-d', '-s', 'lab'],
    AttachStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    Tty: false,
  });
  await bootstrap.start({ Detach: true });

  const attach = await container.exec({
    Cmd: ['tmux', 'attach-session', '-d', '-t', 'lab'],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });
  const raw = await attach.start({ hijack: true, stdin: true });
  return new ExecStreamWrapper(raw);
}

/** Attach to a specific tmux `lab` session inside a named container. */
export async function attachToNamedContainer(containerName) {
  const container = docker.getContainer(containerName);
  return attachContainer(container);
}

export async function destroyContainer(container) {
  try {
    await container.stop({ t: 1 });
  } catch (err) {
    if (err.statusCode !== 304 && err.statusCode !== 404) throw err;
  }
}

export async function getContainerStats(containerId) {
  const container = docker.getContainer(containerId);
  return container.stats({ stream: false });
}
