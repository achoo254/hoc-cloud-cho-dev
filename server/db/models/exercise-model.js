import mongoose from 'mongoose';

const { Schema } = mongoose;

// Collection riêng cho mục "Bài Tập" (owner-gated). Content subdocs dùng Mixed —
// shape do FE/seed quản (giống lab-model). KHÔNG có Meili post-save hook (đã chốt
// no-search). KHÔNG gắn lab (độc lập theo topic).
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

export const Exercise = mongoose.model('Exercise', exerciseSchema);
