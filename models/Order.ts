import mongoose, { Document, Schema } from 'mongoose';

export enum OrderType {
  PURCHASE = "PURCHASE",
  RENT = "RENT",
  INQUIRY = "INQUIRY",
  APPLICATION = "APPLICATION"
}

export enum OrderStatus {
  PENDING = "PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  COMPLETED = "COMPLETED"
}

export interface IOrder extends Document {
  houseId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: OrderType;
  details: {
    visitDate?: Date;
    visitTime?: string;
    numberOfPeople?: number;
    specialRequests?: string;
    preferredContactMethod: string[];
  };
  status: OrderStatus;
  timeline: Array<{
    status: OrderStatus;
    timestamp: Date;
    comment: string;
    updatedBy: mongoose.Types.ObjectId;
  }>;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentPlan?: 'FULL' | 'PARTIAL';
  advanceAmount?: number;
  finalAmount?: number;
  productionProgress?: number;
  productionStage?: string;
  productionNotes?: string;
  productTakenAt?: Date;
  created_at: Date;
  updated_at: Date;
}

const orderSchema = new Schema<IOrder>({
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    required: false
  },
  orderType: {
    type: String,
    enum: Object.values(OrderType),
    required: true
  },
  details: {
    visitDate: Date,
    visitTime: String,
    numberOfPeople: { type: Number, default: 1 },
    specialRequests: String,
    preferredContactMethod: [String]
  },
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING
  },
  timeline: [{
    status: {
      type: String,
      enum: Object.values(OrderStatus)
    },
    timestamp: { type: Date, default: Date.now },
    comment: String,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  paymentPlan: {
    type: String,
    enum: ['FULL', 'PARTIAL'],
    default: 'PARTIAL'
  },
  advanceAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  productionProgress: { type: Number, default: 0, min: 0, max: 100 },
  productionStage: { type: String, default: 'ORDER_PLACED' },
  productionNotes: { type: String, default: '' },
  productTakenAt: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
orderSchema.index({ houseId: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ created_at: -1 });

export default mongoose.model<IOrder>('Order', orderSchema);