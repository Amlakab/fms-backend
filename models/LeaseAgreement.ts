import mongoose, { Document, Schema } from 'mongoose';

export enum LeaseStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  TERMINATION_REQUESTED = 'TERMINATION_REQUESTED',
  TERMINATED = 'TERMINATED',
  RENEWED = 'RENEWED',
  EXPIRED = 'EXPIRED'
}

export interface ITerminationRequest {
  requestedBy: mongoose.Types.ObjectId;
  requestedByRole: 'tenant' | 'landlord' | 'agent' | 'admin';
  requestDate: Date;
  effectiveDate?: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  responseNotes?: string;
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId;
}

export interface ILeasePaymentSchedule {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'UNDER_REVIEW';
  paidAmount?: number;
  paidDate?: Date;
  transactionReference?: string;
  receiptNumber?: string;
}

export interface ILeaseAgreement extends Document {
  agreementNumber: string;
  houseId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  landlordId: mongoose.Types.ObjectId;
  agentId?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  billingFrequency: 'daily' | 'weekly' | 'monthly';
  securityDeposit: number;
  securityDepositRefunded: boolean;
  terms: string;
  signedByTenant: boolean;
  signedByLandlord: boolean;
  tenantSignedAt?: Date;
  landlordSignedAt?: Date;
  status: LeaseStatus;
  paymentSchedule: ILeasePaymentSchedule[];
  terminationRequest?: ITerminationRequest;
  terminationReason?: string;
  terminatedAt?: Date;
  terminatedBy?: mongoose.Types.ObjectId;
  moveInInspection: Array<{
    item: string;
    condition: 'excellent' | 'good' | 'fair' | 'damaged';
    notes?: string;
  }>;
  moveOutInspection: Array<{
    item: string;
    condition: 'excellent' | 'good' | 'fair' | 'damaged';
    notes?: string;
    deductionAmount?: number;
  }>;
  moveOutDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const terminationRequestSchema = new Schema({
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByRole: { type: String, enum: ['tenant', 'landlord', 'agent', 'admin'], required: true },
  requestDate: { type: Date, default: Date.now },
  effectiveDate: Date,
  reason: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
  responseNotes: String,
  respondedAt: Date,
  respondedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const leasePaymentScheduleSchema = new Schema({
  installmentNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'UNDER_REVIEW'], default: 'PENDING' },
  paidAmount: { type: Number, default: 0 },
  paidDate: Date,
  transactionReference: String,
  receiptNumber: String
}, { _id: true });

const leaseAgreementSchema = new Schema<ILeaseAgreement>({
  agreementNumber: {
    type: String,
    required: true,
    unique: true
  },
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: true,
    index: true
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantName: { type: String, required: true },
  tenantEmail: { type: String, required: true },
  tenantPhone: { type: String, required: true },
  landlordId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rentAmount: { type: Number, required: true },
  billingFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'monthly'
  },
  securityDeposit: { type: Number, default: 0 },
  securityDepositRefunded: { type: Boolean, default: false },
  terms: {
    type: String,
    default: 'Standard residential lease agreement terms. Utilities paid by tenant. 30 days notice for termination.'
  },
  signedByTenant: { type: Boolean, default: false },
  signedByLandlord: { type: Boolean, default: false },
  tenantSignedAt: Date,
  landlordSignedAt: Date,
  status: {
    type: String,
    enum: Object.values(LeaseStatus),
    default: LeaseStatus.PENDING_SIGNATURE
  },
  paymentSchedule: [leasePaymentScheduleSchema],
  terminationRequest: terminationRequestSchema,
  terminationReason: String,
  terminatedAt: Date,
  terminatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moveInInspection: [{
    item: String,
    condition: { type: String, enum: ['excellent', 'good', 'fair', 'damaged'], default: 'good' },
    notes: String
  }],
  moveOutInspection: [{
    item: String,
    condition: { type: String, enum: ['excellent', 'good', 'fair', 'damaged'], default: 'good' },
    notes: String,
    deductionAmount: { type: Number, default: 0 }
  }],
  moveOutDate: Date
}, {
  timestamps: true
});

leaseAgreementSchema.index({ tenantId: 1, status: 1 });
leaseAgreementSchema.index({ landlordId: 1, status: 1 });
leaseAgreementSchema.index({ agreementNumber: 1 }, { unique: true });

export default mongoose.model<ILeaseAgreement>('LeaseAgreement', leaseAgreementSchema);
