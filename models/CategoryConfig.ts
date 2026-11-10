import mongoose, { Document, Schema } from 'mongoose';

export interface ICategoryField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect';
  options?: string[];
  unit?: string; // e.g. "m²", "meters", "amps"
  required: boolean;
  filterEnabled: boolean;
}

export interface ICategoryConfig extends Document {
  categoryKey: string; // e.g. "APARTMENT", "WAREHOUSE", "OFFICE", "LAND"
  displayName: string;
  group: 'residential' | 'commercial' | 'industrial' | 'land' | 'hospitality';
  icon?: string;
  allowedTransactionTypes: string[];
  fields: ICategoryField[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categoryFieldSchema = new Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'number', 'boolean', 'select', 'multiselect'],
    default: 'text'
  },
  options: [String],
  unit: String,
  required: { type: Boolean, default: false },
  filterEnabled: { type: Boolean, default: true }
}, { _id: false });

const categoryConfigSchema = new Schema<ICategoryConfig>({
  categoryKey: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  group: {
    type: String,
    enum: ['residential', 'commercial', 'industrial', 'land', 'hospitality'],
    required: true
  },
  icon: String,
  allowedTransactionTypes: {
    type: [String],
    default: ['RENT', 'BUY', 'SHORT_STAY']
  },
  fields: [categoryFieldSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ICategoryConfig>('CategoryConfig', categoryConfigSchema);
