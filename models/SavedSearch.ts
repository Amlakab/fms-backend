import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedSearch extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  filters: {
    transactionType?: string;
    propertyType?: string;
    city?: string;
    neighborhood?: string;
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    minBathrooms?: number;
    tags?: string[];
    amenities?: string[];
  };
  notificationsEnabled: boolean;
  frequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  lastNotifiedAt?: Date;
  matchCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const savedSearchSchema = new Schema<ISavedSearch>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  filters: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  frequency: {
    type: String,
    enum: ['INSTANT', 'DAILY', 'WEEKLY'],
    default: 'INSTANT'
  },
  lastNotifiedAt: Date,
  matchCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

savedSearchSchema.index({ userId: 1 });

export default mongoose.model<ISavedSearch>('SavedSearch', savedSearchSchema);
