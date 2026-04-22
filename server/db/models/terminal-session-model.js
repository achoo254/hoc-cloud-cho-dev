import mongoose from 'mongoose';

const { Schema } = mongoose;

const terminalSessionSchema = new Schema({
  _id: { type: String },
  userId: { type: String, default: null, index: true },
  labSlug: { type: String, required: true },
  projectName: { type: String, default: null },
  containerName: { type: String, default: null },
  status: {
    type: String,
    enum: ['queued', 'active', 'idle', 'terminated'],
    default: 'queued',
    index: true,
  },
  lastActiveAt: { type: Date, required: true, index: true },
  terminatedAt: { type: Date, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, _id: false });

export const TerminalSession = mongoose.model('TerminalSession', terminalSessionSchema);
