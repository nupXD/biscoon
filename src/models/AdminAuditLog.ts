import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const adminAuditLogSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  actorId: { type: String, required: true, index: true },
  actorName: { type: String },
  actorEmail: { type: String },
  actorRole: { type: String },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true, index: true },
  targetId: { type: String, default: '', index: true },
  targetTitle: { type: String, default: '' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
}, { collection: 'admin_audit_logs' });

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ actorId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export default mongoose.model('AdminAuditLog', adminAuditLogSchema);
