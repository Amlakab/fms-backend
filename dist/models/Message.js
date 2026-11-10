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
const messageSchema = new mongoose_1.Schema({
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    houseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'House',
        required: true
    },
    phone: {
        type: String,
        required: function () {
            return !this.email && !this.orderId;
        },
        match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number'],
        sparse: true
    },
    email: {
        type: String,
        required: function () {
            return !this.phone && !this.orderId;
        },
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        sparse: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    subject: {
        type: String,
        required: true,
        enum: [
            'general',
            'property-inquiry',
            'booking-request',
            'payment-issue',
            'order-message',
            'support',
            'other'
        ],
        default: 'general'
    },
    message: {
        type: String,
        required: true,
        maxlength: 2000
    },
    response: {
        type: String,
        maxlength: 2000
    },
    status: {
        type: String,
        enum: ['pending', 'responded'],
        default: 'pending'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    respondedAt: {
        type: Date
    }
}, {
    timestamps: true
});
// Update respondedAt when response is added
messageSchema.pre('save', function (next) {
    if (this.isModified('response') && this.response && this.response.length > 0) {
        this.status = 'responded';
        this.respondedAt = new Date();
    }
    next();
});
// Indexes
messageSchema.index({ houseId: 1 });
messageSchema.index({ orderId: 1 });
messageSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.model('Message', messageSchema);
