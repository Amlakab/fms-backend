"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get wallet stats
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const wallet = await Wallet_1.default.findOne();
        if (!wallet) {
            // Create default wallet if not exists
            const newWallet = new Wallet_1.default({
                wallet: 0,
                totalDeposit: 0,
                totalWithdrawal: 0
            });
            await newWallet.save();
            return res.json({ success: true, data: newWallet });
        }
        res.json({ success: true, data: wallet });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get wallet stats for overview
router.get('/stats', auth_1.authenticate, async (req, res) => {
    try {
        const wallet = await Wallet_1.default.findOne();
        if (!wallet) {
            return res.json({
                success: true,
                data: {
                    wallet: 0,
                    totalDeposit: 0,
                    totalWithdrawal: 0
                }
            });
        }
        // Calculate recent transactions
        const recentTransactions = await Transaction_1.default.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'phone name');
        // Calculate pending counts
        const pendingDeposits = await Transaction_1.default.countDocuments({
            type: 'deposit',
            status: 'pending'
        });
        const pendingWithdrawals = await Transaction_1.default.countDocuments({
            type: 'withdrawal',
            status: 'pending'
        });
        res.json({
            success: true,
            data: {
                wallet: wallet.wallet,
                totalDeposit: wallet.totalDeposit,
                totalWithdrawal: wallet.totalWithdrawal,
                pendingDeposits,
                pendingWithdrawals,
                recentTransactions
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// Update wallet (admin only)
router.put('/update', auth_1.authenticate, async (req, res) => {
    try {
        const { wallet, totalDeposit, totalWithdrawal } = req.body;
        // Check if user is admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const walletDoc = await Wallet_1.default.findOne();
        if (!walletDoc) {
            const newWallet = new Wallet_1.default({
                wallet: wallet || 0,
                totalDeposit: totalDeposit || 0,
                totalWithdrawal: totalWithdrawal || 0
            });
            await newWallet.save();
            return res.json({ success: true, data: newWallet });
        }
        if (wallet !== undefined)
            walletDoc.wallet = wallet;
        if (totalDeposit !== undefined)
            walletDoc.totalDeposit = totalDeposit;
        if (totalWithdrawal !== undefined)
            walletDoc.totalWithdrawal = totalWithdrawal;
        await walletDoc.save();
        res.json({ success: true, data: walletDoc });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// Add to wallet (for completed deposits)
router.post('/deposit', auth_1.authenticate, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        const wallet = await Wallet_1.default.findOne();
        if (!wallet) {
            const newWallet = new Wallet_1.default({
                wallet: amount,
                totalDeposit: amount,
                totalWithdrawal: 0
            });
            await newWallet.save();
            return res.json({ success: true, data: newWallet });
        }
        wallet.wallet += amount;
        wallet.totalDeposit += amount;
        await wallet.save();
        res.json({ success: true, data: wallet });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// Withdraw from wallet (for completed withdrawals)
router.post('/withdraw', auth_1.authenticate, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        const wallet = await Wallet_1.default.findOne();
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        if (wallet.wallet < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }
        wallet.wallet -= amount;
        wallet.totalWithdrawal += amount;
        await wallet.save();
        res.json({ success: true, data: wallet });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
