/**
 * sync-meili-index.js
 *
 * Bulk re-sync toàn bộ lab + bài tập từ MongoDB → Meilisearch index "labs".
 * Dùng khi content được ghi thẳng vào Mongo (vd seed script) không qua tiến trình
 * server đang chạy, nên post-save hook không bắn tới đúng Meili của môi trường đó.
 *
 * MEILISEARCH_HOST / MEILISEARCH_API_KEY lấy từ env file truyền vào — phải trỏ tới
 * Meili của môi trường muốn cập nhật (vd production Meili khi sync prod).
 *
 * Usage:
 *   node --env-file=.env.development server/scripts/sync-meili-index.js   # Meili dev
 *   node --env-file=.env             server/scripts/sync-meili-index.js   # Meili prod
 */

import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { syncLabsToMeilisearch, syncExercisesToMeilisearch } from '../db/sync-search-index.js';
import { getMeiliStatus } from '../db/meilisearch-client.js';

async function main() {
  console.log('[meili] target host:', process.env.MEILISEARCH_HOST || 'http://localhost:7700');
  await connectMongo();
  try {
    const status = await getMeiliStatus();
    if (!status?.healthy) {
      console.error('[meili] KHÔNG kết nối được Meili tại host trên — kiểm tra MEILISEARCH_HOST/KEY + Meili có đang chạy + reachable. Chi tiết:', status?.error || 'n/a');
      process.exitCode = 2;
      return;
    }
    const labRes = await syncLabsToMeilisearch();
    const exRes = await syncExercisesToMeilisearch();
    console.log('[meili] done:', JSON.stringify({ labs: labRes, exercises: exRes }));
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
