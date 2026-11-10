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
const mongoose_1 = __importStar(require("mongoose"));
const transactionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: false,
    },
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
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
exports.default = mongoose_1.default.model('Transaction', transactionSchema);
