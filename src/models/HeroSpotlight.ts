import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { IHeroSpotlight } from '../types';

const heroSpotlightSchema = new mongoose.Schema({
  id:         { type: String, default: uuidv4, unique: true, required: true },
  title:      { type: String, required: true },
  subtitle:   { type: String, default: '' },
  body:       { type: String, default: '' },
  badgeText:  { type: String, default: '' },
  badgeColor: { type: String, default: '#C0392B' },
  imageUrl:   { type: String, required: true },
  ctaText:    { type: String, default: '' },
  ctaUrl:     { type: String, default: '' },
  type:       { type: String, default: 'ad', enum: ['ad', 'event', 'news', 'promo'] },
  active:     { type: Boolean, default: true },
  order:      { type: Number, default: 0 },
  startDate:  { type: Date, default: null },
  endDate:    { type: Date, default: null },
  createdBy:  { type: String, default: '' },
  deleted:    { type: Boolean, default: false },
  deletedAt:  { type: Date, default: null },
  createdAt:  { type: Date, default: Date.now },
}, { collection: 'hero_spotlights' });

heroSpotlightSchema.index({ active: 1, order: 1, createdAt: -1 });

export default mongoose.model<IHeroSpotlight>('HeroSpotlight', heroSpotlightSchema);
