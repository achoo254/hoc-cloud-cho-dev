/**
 * update-lab-dhcp-vmware-content.js
 * Static content additions for DHCP VMware 2-client conflict scenario:
 * Case A (manual TRƯỚC, ping-check abandons) + Case B (manual SAU, ARP flap).
 * Shapes follow Zod schema in app/src/lib/schema-lab.ts.
 *
 * Data loaded from JSON drafts at:
 *   plans/dattqh/260524-1055-dhcp-lab-codify/content-drafts/
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const draftsDir = join(
  __dirname,
  '..',
  '..',
  'plans',
  'dattqh',
  '260524-1055-dhcp-lab-codify',
  'content-drafts',
);

function loadJson(filename) {
  return JSON.parse(readFileSync(join(draftsDir, filename), 'utf-8'));
}

export const DHCP_ADDITIONS = {
  tryAtHome: loadJson('try-at-home-additions.json'),
  walkthrough: loadJson('walkthrough-additions.json'),
  misconceptions: loadJson('misconceptions-additions.json'),
};
