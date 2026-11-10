import mongoose, { Document, Schema } from 'mongoose';

export enum OfferStatus {
  INQUIRY = 'INQUIRY',
  OFFER_SUBMITTED = 'OFFER_SUBMITTED',
  UNDER_NEGOTIATION = 'UNDER_NEGOTIATION',
  PRICE_AGREED = 'PRICE_AGREED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  RESERVATION_DEPOSIT_PAID = 'RESERVATION_DEPOSIT_PAID',
  ADVANCE_PAID = 'ADVANCE_PAID',
  FULL_PAID = 'FULL_PAID',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PRODUCT_FINISHED = 'PRODUCT_FINISHED',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  PRODUCT_TAKEN = 'PRODUCT_TAKEN',
  SALE_AGREEMENT_SIGNED = 'SALE_AGREEMENT_SIGNED',
  PAYMENT_MILESTONES_ACTIVE = 'PAYMENT_MILESTONES_ACTIVE',
  COMPLETED_SALE = 'COMPLETED_SALE',
  CANCELLED = 'CANCELLED'
}

export interface IPaymentMilestone {
  _id?: any;
  id?: string;
  title: string;
  amount: number;
  percentage: number;
  dueDate: Date;
  status: 'PENDING' | 'UNDER_REVIEW' | 'PAID' | 'VERIFIED';
  paidAt?: Date;
  paidAmount?: number;
  transactionReference?: string;
  receiptNumber?: string;
  method?: string;
  proofDocumentUrl?: string;
}

export interface IPurchaseOffer extends Document {
  houseId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  sellerId: mongoose.Types.ObjectId; // Owner
  agentId?: mongoose.Types.ObjectId;
  initialOfferAmount: number;
  currentOfferAmount: number;
  askingPriceAtOffer: number;
  earnestDepositAmount: number;
  paymentPlan: 'FULL' | 'PARTIAL';
  advancePercentage: number;
  advanceAmount: number;
  finalAmount: number;
  productionProgress: number;
  productionStage: 'ORDER_PLACED' | 'MATERIALS_PREPARATION' | 'IN_PRODUCTION' | 'QUALITY_CHECK' | 'PRODUCT_FINISHED' | 'READY_FOR_PICKUP' | 'TAKEN_BY_CUSTOMER';
  productionNotes?: string;
  productTakenAt?: Date;
  productTakenConfirmedBy?: mongoose.Types.ObjectId;
  quantity: number;
  productDetails?: Record<string, any>;
  proposedClosingDate?: Date;
  financingType: 'CASH' | 'BANK_MORTGAGE' | 'INSTALLMENT_PLAN' | 'OTHER';
  status: OfferStatus;
  contingencies: string[];
  negotiationTimeline: Array<{
    senderId: mongoose.Types.ObjectId;
    senderRole: 'buyer' | 'seller' | 'agent';
    proposedAmount: number;
    message: string;
    timestamp: Date;
  }>;
  milestones: IPaymentMilestone[];
  saleAgreementDocUrl?: string;
  deedTransferDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMilestoneSchema = new Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  percentage: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'PAID', 'VERIFIED'], default: 'PENDING' },
  paidAt: Date,
  paidAmount: { type: Number, default: 0 },
  transactionReference: String,
  receiptNumber: String,
  method: String,
  proofDocumentUrl: String
}, { _id: true });

const purchaseOfferSchema = new Schema<IPurchaseOffer>({
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true,
    index: true
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  buyerName: { type: String, required: true },
  buyerEmail: { type: String, required: true },
  buyerPhone: { type: String, required: true },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  initialOfferAmount: { type: Number, required: true },
  currentOfferAmount: { type: Number, required: true },
  askingPriceAtOffer: { type: Number, required: true },
  earnestDepositAmount: { type: Number, default: 0 },
  paymentPlan: {
    type: String,
    enum: ['FULL', 'PARTIAL'],
    default: 'PARTIAL'
  },
  advancePercentage: { type: Number, default: 25 },
  advanceAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  productionProgress: { type: Number, default: 0, min: 0, max: 100 },
  productionStage: {
    type: String,
    enum: ['ORDER_PLACED', 'MATERIALS_PREPARATION', 'IN_PRODUCTION', 'QUALITY_CHECK', 'PRODUCT_FINISHED', 'READY_FOR_PICKUP', 'TAKEN_BY_CUSTOMER'],
    default: 'ORDER_PLACED'
  },
  productionNotes: { type: String, default: '' },
  productTakenAt: Date,
  productTakenConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  quantity: { type: Number, default: 1, min: 1 },
  productDetails: { type: Schema.Types.Mixed, default: {} },
  proposedClosingDate: Date,
  financingType: {
    type: String,
    enum: ['CASH', 'BANK_MORTGAGE', 'INSTALLMENT_PLAN', 'OTHER'],
    default: 'CASH'
  },
  status: {
    type: String,
    enum: Object.values(OfferStatus),
    default: OfferStatus.OFFER_SUBMITTED
  },
  contingencies: [String],
  negotiationTimeline: [{
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    senderRole: { type: String, enum: ['buyer', 'seller', 'agent'] },
    proposedAmount: Number,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  milestones: [paymentMilestoneSchema],
  saleAgreementDocUrl: String,
  deedTransferDate: Date,
  completedAt: Date
}, {
  timestamps: true
});

purchaseOfferSchema.index({ buyerId: 1, status: 1 });
purchaseOfferSchema.index({ sellerId: 1, status: 1 });
purchaseOfferSchema.index({ houseId: 1, status: 1 });

export default mongoose.model<IPurchaseOffer>('PurchaseOffer', purchaseOfferSchema);
