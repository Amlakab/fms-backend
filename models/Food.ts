import mongoose, { Document, Schema } from 'mongoose';

export enum FoodCategory {
  BREAKFAST = "BREAKFAST",
  LUNCH = "LUNCH",
  DINNER = "DINNER",
  DRINK = "DRINK",
  SNACK = "SNACK"
}

export interface IFood extends Document {
  name: string;
  description: string;
  image?: string; // Keep for frontend compatibility
  imageData?: {
    data: Buffer;
    contentType: string;
    fileName: string;
  }; // Store actual image data
  category: FoodCategory;
  price: number;
  view: number;
  quantity_available: boolean;
  status: "AVAILABLE" | "UNAVAILABLE";
  created_at: Date;
  updated_at: Date;
}

const foodSchema = new Schema<IFood>({
  name: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true,
    minlength: [3, 'Food name must be at least 3 characters'],
    maxlength: [100, 'Food name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    default: ''
  },
  imageData: {
    data: Buffer,
    contentType: String,
    fileName: String
  },
  category: {
    type: String,
    enum: Object.values(FoodCategory),
    required: [true, 'Category is required']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  view: {
    type: Number,
    default: 0
  },
  quantity_available: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'UNAVAILABLE'],
    default: 'AVAILABLE'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
foodSchema.index({ category: 1 });
foodSchema.index({ status: 1 });
foodSchema.index({ quantity_available: 1 });
foodSchema.index({ price: 1 });
foodSchema.index({ created_at: -1 });
foodSchema.index({ name: 'text', description: 'text' });

// Static method to increment view count
foodSchema.statics.incrementView = async function(id: string) {
  return this.findByIdAndUpdate(
    id,
    { $inc: { view: 1 } },
    { new: true }
  );
};

// Virtual for checking if food is available
foodSchema.virtual('isAvailable').get(function() {
  return this.status === 'AVAILABLE' && this.quantity_available === true;
});

export default mongoose.model<IFood>('Food', foodSchema);