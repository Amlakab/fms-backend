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
exports.OfferStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var OfferStatus;
(function (OfferStatus) {
    OfferStatus["INQUIRY"] = "INQUIRY";
    OfferStatus["OFFER_SUBMITTED"] = "OFFER_SUBMITTED";
    OfferStatus["UNDER_NEGOTIATION"] = "UNDER_NEGOTIATION";
    OfferStatus["PRICE_AGREED"] = "PRICE_AGREED";
    OfferStatus["OFFER_ACCEPTED"] = "OFFER_ACCEPTED";
    OfferStatus["OFFER_REJECTED"] = "OFFER_REJECTED";
    OfferStatus["RESERVATION_DEPOSIT_PAID"] = "RESERVATION_DEPOSIT_PAID";
    OfferStatus["ADVANCE_PAID"] = "ADVANCE_PAID";
    OfferStatus["FULL_PAID"] = "FULL_PAID";
    OfferStatus["IN_PRODUCTION"] = "IN_PRODUCTION";
    OfferStatus["PRODUCT_FINISHED"] = "PRODUCT_FINISHED";
    OfferStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    OfferStatus["PRODUCT_TAKEN"] = "PRODUCT_TAKEN";
    OfferStatus["SALE_AGREEMENT_SIGNED"] = "SALE_AGREEMENT_SIGNED";
    OfferStatus["PAYMENT_MILESTONES_ACTIVE"] = "PAYMENT_MILESTONES_ACTIVE";
    OfferStatus["COMPLETED_SALE"] = "COMPLETED_SALE";
    OfferStatus["CANCELLED"] = "CANCELLED";
})(OfferStatus || (exports.OfferStatus = OfferStatus = {}));
const paymentMilestoneSchema = new mongoose_1.Schema({
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
const purchaseOfferSchema = new mongoose_1.Schema({
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: true,
        index: true
    },
    buyerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String, required: true },
    buyerPhone: { type: String, required: true },
    sellerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    agentId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    productTakenConfirmedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    quantity: { type: Number, default: 1, min: 1 },
    productDetails: { type: mongoose_1.Schema.Types.Mixed, default: {} },
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
            senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
exports.default = mongoose_1.default.model('PurchaseOffer', purchaseOfferSchema);
