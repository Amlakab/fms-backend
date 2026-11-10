import mongoose, { Document, Schema } from 'mongoose';

export interface IListingReport extends Document {
  houseId: mongoose.Types.ObjectId;
  reporterId?: mongoose.Types.ObjectId;
  reporterEmail?: string;
  reason: 'MISLEADING_PRICE' | 'FAKE_PHOTOS' | 'ALREADY_SOLD_OR_RENTED' | 'FRAUD_SCAM' | 'INCORRECT_LOCATION' | 'OTHER';
  description: string;
  evidenceUrl?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED_ACTION_TAKEN' | 'DISMISSED';
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const listingReportSchema = new Schema<IListingReport>({
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true,
    index: true
  },
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reporterEmail: String,
  reason: {
    type: String,
    enum: ['MISLEADING_PRICE', 'FAKE_PHOTOS', 'ALREADY_SOLD_OR_RENTED', 'FRAUD_SCAM', 'INCORRECT_LOCATION', 'OTHER'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  evidenceUrl: String,
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED_ACTION_TAKEN', 'DISMISSED'],
    default: 'PENDING'
  },
  adminNotes: String,
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date
}, {
  timestamps: true
});

listingReportSchema.index({ status: 1 });
listingReportSchema.index({ houseId: 1 });

export default mongoose.model<IListingReport>('ListingReport', listingReportSchema);
