import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  houseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  isVerifiedResident: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    default: 'customer'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: String,
  comment: {
    type: String,
    required: true,
    maxlength: 1500
  },
  isVerifiedResident: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'APPROVED'
  },
  adminNotes: String,
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

reviewSchema.index({ houseId: 1, status: 1 });
reviewSchema.index({ userId: 1, houseId: 1 });

export default mongoose.model<IReview>('Review', reviewSchema);
