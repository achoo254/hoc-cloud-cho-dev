import mongoose from 'mongoose';

const { Schema } = mongoose;

// Collection riêng cho mục "Bài Tập" (public). Content subdocs dùng Mixed —
// shape do FE/seed quản (giống lab-model). Index vào Meili (chung index "labs"
// với type='exercise') để search được nội dung bài tập. KHÔNG gắn lab.
const exerciseSchema = new Schema({
  slug: { type: String, unique: true, required: true, index: true },
  title: { type: String, required: true },
  topic: { type: String, index: true },        // free-text: 'linux' | 'networking' ...
  tags: [String],
  source: String,                               // ai giao / nguồn (optional)
  brief: String,                                // đề bài / yêu cầu (HTML-capable)
  estimatedMinutes: Number,
  guide: [Schema.Types.Mixed],                  // [{ step, instruction, command?, note? }]
  demo: [Schema.Types.Mixed],                   // [{ step, what, command?, output, note?, screenshot? }]
  references: [Schema.Types.Mixed],             // [{ label, url }]
  contentHash: String,
}, { timestamps: true });

// Auto-sync to Meilisearch on write (mirror lab-model). Dynamic import avoids
// circular dep; fire-and-forget so Meili downtime never crashes the Mongo write.
// Opt-out: `{ skipMeili: true }` in query options (bulk sync script).
async function pushToMeili(doc) {
  if (!doc?.slug) return;
  try {
    const { syncSingleExercise } = await import('../sync-search-index.js');
    await syncSingleExercise(doc.toObject ? doc.toObject() : doc);
  } catch (err) {
    console.warn('[meili] exercise sync failed:', err.message);
  }
}

async function removeFromMeili(slug) {
  if (!slug) return;
  try {
    const { deleteExerciseFromIndex } = await import('../sync-search-index.js');
    await deleteExerciseFromIndex(slug);
  } catch (err) {
    console.warn('[meili] exercise delete failed:', err.message);
  }
}

exerciseSchema.post('save', function (doc) {
  pushToMeili(doc);
});

exerciseSchema.post('findOneAndUpdate', async function () {
  if (this.getOptions?.().skipMeili) return;
  const fresh = await this.model.findOne(this.getFilter()).lean();
  pushToMeili(fresh);
});

exerciseSchema.post('findOneAndDelete', function (doc) {
  removeFromMeili(doc?.slug);
});

exerciseSchema.post('deleteOne', { document: true, query: false }, function (doc) {
  removeFromMeili(doc?.slug);
});

export const Exercise = mongoose.model('Exercise', exerciseSchema);
