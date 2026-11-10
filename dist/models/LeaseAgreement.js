"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var LeaseStatus;
(function (LeaseStatus) {
    LeaseStatus["DRAFT"] = "DRAFT";
    LeaseStatus["ACTIVE"] = "ACTIVE";
    LeaseStatus["PENDING_SIGNATURE"] = "PENDING_SIGNATURE";
    LeaseStatus["TERMINATION_REQUESTED"] = "TERMINATION_REQUESTED";
    LeaseStatus["TERMINATED"] = "TERMINATED";
    LeaseStatus["RENEWED"] = "RENEWED";
    LeaseStatus["EXPIRED"] = "EXPIRED";
})(LeaseStatus || (exports.LeaseStatus = LeaseStatus = {}));
const terminationRequestSchema = new mongoose_1.Schema({
    requestedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByRole: { type: String, enum: ['tenant', 'landlord', 'agent', 'admin'], required: true },
    requestDate: { type: Date, default: Date.now },
    effectiveDate: Date,
    reason: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    responseNotes: String,
    respondedAt: Date,
    respondedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });
const leasePaymentScheduleSchema = new mongoose_1.Schema({
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'UNDER_REVIEW'], default: 'PENDING' },
    paidAmount: { type: Number, default: 0 },
    paidDate: Date,
    transactionReference: String,
    receiptNumber: String
}, { _id: true });
const leaseAgreementSchema = new mongoose_1.Schema({
    agreementNumber: {
        type: String,
        required: true,
        unique: true
    },
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: true,
        index: true
    },
    tenantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tenantName: { type: String, required: true },
    tenantEmail: { type: String, required: true },
    tenantPhone: { type: String, required: true },
    landlordId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    agentId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    terminatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
exports.default = mongoose_1.default.model('LeaseAgreement', leaseAgreementSchema);
