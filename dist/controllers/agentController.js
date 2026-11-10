"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = exports.getGames = exports.getUsers = exports.getDashboard = void 0;
const User_1 = __importDefault(require("../models/User"));
const Game_1 = __importDefault(require("../models/Game"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const helpers_1 = require("../utils/helpers");
const getDashboard = async (req, res) => {
    try {
        // Get users registered by this agent (if agents can register users)
        const usersCount = await User_1.default.countDocuments();
        // Get active games
        const activeGames = await Game_1.default.countDocuments({ status: 'active' });
        // Get recent  transactions
        const recentTransactions = await Transaction_1.default.find()
            .populate('userId', 'phone')
            .sort({ createdAt: -1 })
            .limit(10);
        (0, helpers_1.successResponse)(res, {
            usersCount,
            activeGames,
            recentTransactions
        }, 'Dashboard data retrieved successfully');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.getDashboard = getDashboard;
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const users = await User_1.default.find({ role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        const total = await User_1.default.countDocuments({ role: 'user' });
        (0, helpers_1.successResponse)(res, {
            users,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        }, 'Users retrieved successfully');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.getUsers = getUsers;
const getGames = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const games = await Game_1.default.find(filter)
            .populate('winner', 'phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        const total = await Game_1.default.countDocuments(filter);
        (0, helpers_1.successResponse)(res, {
            games,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        }, 'Games retrieved successfully');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.getGames = getGames;
const getTransactions = async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (type)
            filter.type = type;
        const transactions = await Transaction_1.default.find(filter)
            .populate('userId', 'phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        const total = await Transaction_1.default.countDocuments(filter);
        (0, helpers_1.successResponse)(res, {
            transactions,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        }, 'Transactions retrieved successfully');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.getTransactions = getTransactions;
