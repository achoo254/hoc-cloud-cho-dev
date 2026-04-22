import mongoose from 'mongoose';

const { Schema } = mongoose;

const terminalAuditLogSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  details: { type: String, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

// TTL: purge entries older than 90 days.
terminalAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const TerminalAuditLog = mongoose.model('TerminalAuditLog', terminalAuditLogSchema);
