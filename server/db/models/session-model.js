import mongoose from 'mongoose';

const { Schema } = mongoose;

const sessionSchema = new Schema({
  tokenHash: { type: String, unique: true, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
