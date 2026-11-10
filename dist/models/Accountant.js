"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bankAccountSubSchema = new mongoose_1.default.Schema({
    bankId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Bank', required: true },
    bankName: { type: String, required: true, trim: true },
    bankCode: { type: String, required: true, trim: true, uppercase: true },
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => /^[A-Za-z0-9]{6,25}$/.test(v),
            message: 'Account number must be 6-25 alphanumeric characters'
        }
    },
    isBlocked: { type: Boolean, default: false }
}, { _id: true, timestamps: true });
const accountantSchema = new mongoose_1.default.Schema({
    ownerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    isBlocked: { type: Boolean, default: false },
    accounts: {
        type: [bankAccountSubSchema],
        default: [],
        validate: {
            validator: function (accounts) {
                if (!accounts || accounts.length === 0)
                    return false;
                const bankIds = accounts.map(a => String(a.bankId));
                return new Set(bankIds).size === bankIds.length;
            },
            message: 'At least one account is required, and each bank/wallet can only appear once'
        }
    }
}, { timestamps: true });
accountantSchema.index({ ownerId: 1, isBlocked: 1 });
accountantSchema.index({ agentId: 1 });
accountantSchema.index({ 'accounts.bankId': 1 });
accountantSchema.index({ 'accounts.accountNumber': 1 });
accountantSchema.index({ 'accounts.accountHolderName': 1 });
accountantSchema.index({ createdAt: 1 });
const Accountant = mongoose_1.default.model('Accountant', accountantSchema);
exports.default = Accountant;
