import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * MigrationBatch — guards guest→user progress migration with idempotency.
 *
 * Two-phase protocol (Mongo standalone, no transactions):
 *   1. Insert { status: 'pending' }  — unique (userId, batchId) prevents replay
 *   2. bulkWrite progress docs       — idempotent via $setOnInsert + $min
 *   3. Update { status: 'completed', completedAt, imported }
 *
 * Replay of the same batchId reads status:
 *   - 'completed'   → return early (already_applied)
 *   - 'pending'     → in-flight or crashed; caller retries later (in_progress)
 */
const migrationBatchSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  batchId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed'], required: true, default: 'pending' },
  itemCount: { type: Number, default: 0 },
  imported: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
});

migrationBatchSchema.index({ userId: 1, batchId: 1 }, { unique: true });

export const MigrationBatch = mongoose.model('MigrationBatch', migrationBatchSchema);
