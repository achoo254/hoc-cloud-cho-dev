import mongoose from 'mongoose';

const { Schema } = mongoose;

// Content subdocs use Mixed: Zod (app/src/lib/schema-lab.ts) is the source
// of truth for lab content shape. Typed Mongoose subdocs dropped fields
// silently (tldr, quiz, tryAtHome all lost data). Mixed preserves everything.
const labSchema = new Schema({
  slug: { type: String, unique: true, required: true, index: true },
  module: { type: String, index: true },
  title: { type: String, required: true },
  estimatedMinutes: Number,
  tldr: [Schema.Types.Mixed],
  walkthrough: [Schema.Types.Mixed],
  quiz: [Schema.Types.Mixed],
  flashcards: [Schema.Types.Mixed],
  tryAtHome: [Schema.Types.Mixed],
  diagram: Schema.Types.Mixed,
  terminal: Schema.Types.Mixed,
  contentHash: String,
}, { timestamps: true });

// Auto-sync to Meilisearch on write.
// Dynamic import avoids circular dependency (sync-search-index imports Lab).
// Fire-and-forget: Meili downtime must not crash the Mongo write path.
// Opt-out: pass `{ skipMeili: true }` in query options to bypass (used by bulk sync script).
async function pushToMeili(doc) {
  if (!doc?.slug) return;
  try {
    const { syncSingleLab } = await import('../sync-search-index.js');
    await syncSingleLab(doc.toObject ? doc.toObject() : doc);
  } catch (err) {
    console.warn('[meili] sync failed:', err.message);
  }
}

async function removeFromMeili(slug) {
  if (!slug) return;
  try {
    const { deleteLabFromIndex } = await import('../sync-search-index.js');
    await deleteLabFromIndex(slug);
  } catch (err) {
    console.warn('[meili] delete failed:', err.message);
  }
}

labSchema.post('save', function (doc) {
  pushToMeili(doc);
});

labSchema.post('findOneAndUpdate', async function (doc) {
  if (this.getOptions?.().skipMeili) return;
  // Query default returns pre-update doc; refetch latest to send fresh data.
  const fresh = await this.model.findOne(this.getFilter()).lean();
  pushToMeili(fresh);
});

labSchema.post('findOneAndDelete', function (doc) {
  removeFromMeili(doc?.slug);
});

// Query-level deleteOne/deleteMany don't pass the doc; refetch filter before delete is too late.
// Use document-level deleteOne hook instead (triggered by doc.deleteOne()).
labSchema.post('deleteOne', { document: true, query: false }, function (doc) {
  removeFromMeili(doc?.slug);
});

export const Lab = mongoose.model('Lab', labSchema);
