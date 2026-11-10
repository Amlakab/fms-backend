"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTxRef = exports.verifyWebhookSignature = exports.chapa = void 0;
const Chapa = require('chapa');
exports.chapa = new Chapa(process.env.CHAPA_SECRET_KEY || '');
const verifyWebhookSignature = (req) => {
    const signature = req.headers['x-chapa-signature'];
    if (!signature)
        return false;
    // In a real implementation, you would verify the webhook signature
    // For now, we'll return true for development
    return true;
};
exports.verifyWebhookSignature = verifyWebhookSignature;
const generateTxRef = (userId, type) => {
    return `${type}-${userId}-${Date.now()}`;
};
exports.generateTxRef = generateTxRef;
