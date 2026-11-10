import mongoose, { Document, Schema } from 'mongoose';

export type MenuPlatformType = 'web' | 'mobile';

export interface IMenu extends Document {
  name: string;
  href: string;
  icon: string;
  type: MenuPlatformType;
  allowedRoles: string[];
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuSchema = new Schema<IMenu>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    href: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['web', 'mobile'],
      default: 'web',
      index: true,
    },
    allowedRoles: {
      type: [String],
      required: true,
      enum: ['user', 'accountant', 'admin', 'customer', 'manager', 'owner', 'agent'],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

menuSchema.index({ name: 1, type: 1 }, { unique: true });
menuSchema.index({ order: 1 });
menuSchema.index({ type: 1, order: 1 });

export default mongoose.model<IMenu>('Menu', menuSchema);