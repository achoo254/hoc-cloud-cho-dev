#!/usr/bin/env node
import db from '../db/sqlite-client.js';

const topics = db.prepare('SELECT * FROM topics ORDER BY order_idx').all();
const sections = db.prepare('SELECT id, topic_id, slug, length(body_md) AS len FROM sections').all();

console.log(`Topics: ${topics.length}`);
for (const t of topics) {
  const mine = sections.filter((s) => s.topic_id === t.id);
  console.log(`  ${t.slug.padEnd(20)} ${mine.length} sections`);
}
console.log(`Sections total: ${sections.length}`);
console.log(`  empty (<100 chars): ${sections.filter((s) => s.len < 100).length}`);
console.log(`  large (>10KB): ${sections.filter((s) => s.len > 10000).length}`);

const ftsCount = db.prepare('SELECT COUNT(*) AS n FROM sections_fts').get().n;
console.log(`FTS rows: ${ftsCount} (expected ${sections.length})`);
