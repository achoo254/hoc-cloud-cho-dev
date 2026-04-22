import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Dev: server/lib/ → ../../docker. Prod (bundle): cwd/docker. Override with env.
const DOCKER_DIR = process.env.DOCKER_DIR
  || (__dirname.endsWith(path.join('server', 'lib'))
    ? path.resolve(__dirname, '..', '..', 'docker')
    : path.resolve(process.cwd(), 'docker'));

/**
 * Registry of multi-container lab topologies. Slugs NOT listed here fall back
 * to single-container mode (lab-terminal:v1 via docker-manager.createContainer).
 *
 * mainService = compose service that the user's terminal attaches to.
 */
const LAB_TOPOLOGIES = {
  arp: { dir: 'lab-arp', mainService: 'host-a' },
  // Add further topologies as their images land (dhcp/dns/http/tcp/icmp).
};

export function hasTopology(labSlug) {
  return Boolean(LAB_TOPOLOGIES[labSlug]);
}

export async function startLabEnvironment(labSlug, sessionId) {
  const config = LAB_TOPOLOGIES[labSlug];
  if (!config) throw new Error(`No lab topology for: ${labSlug}`);

  const projectName = `lab-${sessionId}`;
  const composeFile = path.join(DOCKER_DIR, config.dir, 'docker-compose.yml');

  await execAsync(
    `docker compose -p ${projectName} -f "${composeFile}" up -d`,
    { timeout: 30_000 },
  );

  return {
    projectName,
    mainContainer: `${projectName}-${config.mainService}-1`,
  };
}

export async function stopLabEnvironment(projectName) {
  try {
    await execAsync(
      `docker compose -p ${projectName} down --volumes --remove-orphans`,
      { timeout: 30_000 },
    );
  } catch (err) {
    console.error(`[lab-orchestrator] stop ${projectName} failed:`, err.message);
  }
}

export async function listLabProjects() {
  const { stdout } = await execAsync(
    `docker ps --filter "name=^lab-" --format "{{.Names}}"`,
  );
  const projects = new Set();
  for (const name of stdout.trim().split('\n').filter(Boolean)) {
    const match = name.match(/^(lab-[a-z0-9]+)-/);
    if (match) projects.add(match[1]);
  }
  return [...projects];
}
