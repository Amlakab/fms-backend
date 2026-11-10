import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: Schema.Types.ObjectId;
  houseId?: Schema.Types.ObjectId;
  orderId?: Schema.Types.ObjectId;
  class: string;
  type: 'deposit' | 'withdrawal' | 'property_purchase' | 'winning' | 'rent' | 'rent_payment' | string;
  amount: number;
  amountInString?: string;
  status: 'pending' | 'approved' | 'completed' | 'confirmed' | 'failed';
  availability?: 'active' | 'closed' | 'hidden' | 'pending';
  reference: string;
  description: string;
  transactionId?: string;
  senderPhone?: string;
  senderName?: string;
  receiverPhone?: string;
  receiverName?: string;
  method?: string;
  reason?: string;
  metadata?: any;
  approvedBy?: string;
  completedBy?: string;
  confirmedBy?: string;
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  confirmedAt?: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: false,
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: false,
  },
  class: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'game_purchase', 'winning', 'property_purchase', 'rent', 'rental_payment'],
    default: 'deposit'
  },
  type: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'property_purchase', 'winning', 'rent', 'rent_payment'],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  amountInString: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'approved', 'confirmed'],
    default: 'pending',
  },
  availability: {
    type: String,
    enum: ['active', 'closed', 'hidden', 'pending'],
    default: 'active',
  },
  reference: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  transactionId: {
    type: String,
    sparse: true,
  },
  senderPhone: {
    type: String,
  },
  senderName: {
    type: String,
  },
  receiverPhone: {
    type: String,
  },
  receiverName: {
    type: String,
  },
  method: {
    type: String,
  },
  reason: {
    type: String,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
  approvedBy: {
    type: String,
  },
  completedBy: {
    type: String,
  },
  confirmedBy: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  confirmedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for faster queries
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ houseId: 1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ status: 1 });

export default mongoose.model<ITransaction>('Transaction', transactionSchema);