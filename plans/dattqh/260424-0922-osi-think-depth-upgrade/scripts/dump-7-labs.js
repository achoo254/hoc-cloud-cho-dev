/**
 * Dump content of 7 labs for Phase 4 audit.
 * Output: audits/labs-dump.json with tldr + walkthrough arrays only.
 */
import mongoose from 'mongoose';
import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'audits', 'labs-dump.json');

const SLUGS = ['arp', 'dhcp', 'dns', 'http', 'icmp-ping', 'subnet-cidr', 'tcp-udp'];

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }

await mongoose.connect(uri);
const Lab = mongoose.model('Lab', new mongoose.Schema({}, { strict: false }), 'labs');

const out = {};
for (const slug of SLUGS) {
  const doc = await Lab.findOne({ slug }, { slug: 1, title: 1, tldr: 1, walkthrough: 1, misconceptions: 1, _id: 0 }).lean();
  if (!doc) { console.warn('[dump] missing slug=', slug); continue; }
  out[slug] = {
    slug: doc.slug,
    title: doc.title,
    tldr: doc.tldr,
    walkthrough: doc.walkthrough,
    misconceptions: doc.misconceptions ?? null,
  };
  console.log(`[dump] ${slug}: tldr=${doc.tldr?.length} walkthrough=${doc.walkthrough?.length} misc=${doc.misconceptions?.length ?? 'MISSING'}`);
}

writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log('[dump] wrote', OUT);
await mongoose.disconnect();
