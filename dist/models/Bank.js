"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bankSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    type: { type: String, enum: ['bank', 'wallet'], default: 'bank', index: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
bankSchema.index({ isActive: 1 });
const Bank = mongoose_1.default.model('Bank', bankSchema);
exports.default = Bank;
