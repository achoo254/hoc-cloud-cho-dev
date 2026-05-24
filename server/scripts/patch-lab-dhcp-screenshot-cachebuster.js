/**
 * patch-lab-dhcp-screenshot-cachebuster.js
 *
 * Thêm query string `?v=<timestamp>` vào mọi `screenshot.src` trong `tryAtHome[]`
 * của lab `dhcp` để force Cloudflare cache MISS (workaround cho 404 cached trước
 * khi files được upload).
 *
 * Idempotent: chỉ patch URL chưa có `?v=`.
 *
 * Usage:
 *   node --env-file=.env.production server/scripts/patch-lab-dhcp-screenshot-cachebuster.js
 */

import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';

const CACHE_BUSTER = `v=${Date.now()}`;

async function main() {
  await connectMongo();
  try {
    const lab = await Lab.findOne({ slug: 'dhcp' });
    if (!lab) throw new Error('lab "dhcp" not found');

    let patched = 0;
    for (const item of lab.tryAtHome ?? []) {
      if (!Array.isArray(item.steps)) continue;
      for (const step of item.steps) {
        if (!step.screenshot?.src) continue;
        if (step.screenshot.src.includes('?')) continue;
        step.screenshot.src = `${step.screenshot.src}?${CACHE_BUSTER}`;
        patched += 1;
      }
    }

    if (patched === 0) {
      console.log('[skip] no screenshot src to patch');
      return;
    }

    lab.markModified('tryAtHome');
    lab.updatedAt = new Date();
    await lab.save();
    console.log(`[done] patched ${patched} screenshot src with ?${CACHE_BUSTER}`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
