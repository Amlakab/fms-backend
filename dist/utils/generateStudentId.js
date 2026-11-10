"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudentId = void 0;
const Counter_1 = __importDefault(require("../models/Counter"));
const generateStudentId = async (batch) => {
    // Take last 2 digits of batch
    const batchSuffix = batch.slice(-2);
    const counter = await Counter_1.default.findOneAndUpdate({ name: 'student' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const paddedNumber = counter.seq.toString().padStart(4, '0');
    return `TGG/${paddedNumber}/${batchSuffix}`;
};
exports.generateStudentId = generateStudentId;
