import mongoose from 'mongoose';

const { Schema } = mongoose;

const progressSchema = new Schema({
  userUuid: { type: String, index: true },
  labSlug: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  openedAt: Date,        // first-mount timestamp — set once via $setOnInsert
  lastOpenedAt: Date,    // latest-mount timestamp — updated every /touch + POST
  completedAt: Date,
  quizScore: { type: Number, min: 0, max: 100 },
}, { timestamps: { createdAt: false, updatedAt: 'lastUpdated' } });

progressSchema.index({ userUuid: 1, labSlug: 1 }, { unique: true, sparse: true });
progressSchema.index({ userId: 1, labSlug: 1 }, { unique: true, sparse: true });

export const Progress = mongoose.model('Progress', progressSchema);
