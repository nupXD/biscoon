import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { IAnnouncement } from '../types';

const announcementSchema = new mongoose.Schema({
  id:        { type: String, default: uuidv4, unique: true, required: true },
  title:     { type: String, required: true },
  body:      { type: String, required: true },
  type:      { type: String, default: 'info', enum: ['info', 'warning', 'success'] },
  active:    { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  createdBy: { type: String, default: '' },
  deleted:   { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'announcements' });

announcementSchema.index({ active: 1, expiresAt: 1, createdAt: -1 });

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
