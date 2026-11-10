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
exports.PaymentStatus = exports.OrderStatus = exports.OrderType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var OrderType;
(function (OrderType) {
    OrderType["PURCHASE"] = "PURCHASE";
    OrderType["RENT"] = "RENT";
    OrderType["INQUIRY"] = "INQUIRY";
    OrderType["APPLICATION"] = "APPLICATION";
})(OrderType || (exports.OrderType = OrderType = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    OrderStatus["APPROVED"] = "APPROVED";
    OrderStatus["REJECTED"] = "REJECTED";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PARTIAL"] = "PARTIAL";
    PaymentStatus["COMPLETED"] = "COMPLETED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
const orderSchema = new mongoose_1.Schema({
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: true
    },
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
                type: mongoose_1.Schema.Types.ObjectId,
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
exports.default = mongoose_1.default.model('Order', orderSchema);
