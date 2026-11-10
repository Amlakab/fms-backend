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
const loanSchema = new mongoose_1.Schema({
    loanerId: {
        type: String,
        required: [true, 'Loaner ID is required'],
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Loaner name is required'],
        trim: true,
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true,
    },
    loanType: {
        type: String,
        enum: ['TAKEN', 'GIVEN'],
        required: [true, 'Loan type is required']
    },
    date: {
        type: Date,
        required: [true, 'Loan date is required'],
        default: Date.now
    },
    status: {
        type: String,
        enum: ['UNPAID', 'PAID'],
        default: 'UNPAID'
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
});
// Generate loan ID before saving
loanSchema.pre('save', async function (next) {
    if (!this.isNew)
        return next();
    try {
        const Loan = mongoose_1.default.model('Loan');
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const baseId = `LOAN-${year}${month}${day}`;
        // Find the highest sequence number for today
        const lastLoan = await Loan.findOne({
            loanId: new RegExp(`^${baseId}-\\d+$`)
        }).sort({ loanId: -1 }).limit(1);
        let sequence = 1;
    }
    catch (error) {
        next(error);
    }
});
// Indexes for better query performance
loanSchema.index({ loanerId: 1 });
loanSchema.index({ name: 1 });
loanSchema.index({ loanType: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ date: -1 });
loanSchema.index({ createdBy: 1 });
loanSchema.index({ amount: 1 });
// Virtual for formatted date
loanSchema.virtual('formattedDate').get(function () {
    return this.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
});
// Virtual for formatted amount
loanSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('en-ET', {
        style: 'currency',
        currency: 'ETB'
    }).format(this.amount);
});
// Ensure virtuals are included in JSON output
loanSchema.set('toJSON', { virtuals: true });
loanSchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('Loan', loanSchema);
