import mongoose from 'mongoose';

const bankSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  type: { type: String, enum: ['bank', 'wallet'], default: 'bank', index: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

bankSchema.index({ isActive: 1 });

const Bank = mongoose.model('Bank', bankSchema);
export default Bank;