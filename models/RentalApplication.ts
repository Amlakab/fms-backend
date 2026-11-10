import mongoose, { Document, Schema } from 'mongoose';

export enum ApplicationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

export interface IRentalApplication extends Document {
  houseId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  occupation: string;
  monthlyIncome: number;
  numberOfOccupants: number;
  preferredMoveInDate: Date;
  message?: string;
  documents?: Array<{
    data: Buffer;
    contentType: string;
    fileName: string;
    documentType: string;
  }>;
  status: ApplicationStatus;
  adminNotes?: string;
  created_at: Date;
  updated_at: Date;
}

const documentSchema = new Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  fileName: { type: String, required: true },
  documentType: { type: String, required: true }
});

const rentalApplicationSchema = new Schema<IRentalApplication>({
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  occupation: {
    type: String,
    required: [true, 'Occupation is required'],
    trim: true
  },
  monthlyIncome: {
    type: Number,
    required: [true, 'Monthly income is required'],
    min: [0, 'Income cannot be negative']
  },
  numberOfOccupants: {
    type: Number,
    required: [true, 'Number of occupants is required'],
    min: [1, 'At least one occupant is required']
  },
  preferredMoveInDate: {
    type: Date,
    required: [true, 'Preferred move-in date is required']
  },
  message: {
    type: String,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  documents: [documentSchema],
  status: {
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.PENDING
  },
  adminNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
rentalApplicationSchema.index({ houseId: 1 });
rentalApplicationSchema.index({ userId: 1 });
rentalApplicationSchema.index({ status: 1 });
rentalApplicationSchema.index({ email: 1 });

export default mongoose.model<IRentalApplication>('RentalApplication', rentalApplicationSchema);