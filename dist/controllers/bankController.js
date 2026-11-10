"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBank = exports.updateBank = exports.createBank = exports.getAllBanks = void 0;
const Bank_1 = __importDefault(require("../models/Bank"));
const getAllBanks = async (req, res) => {
    try {
        const { type, includeInactive } = req.query;
        const filter = {};
        if (type)
            filter.type = type;
        if (includeInactive !== 'true')
            filter.isActive = true;
        const banks = await Bank_1.default.find(filter).sort({ type: 1, name: 1 });
        res.json({ success: true, data: banks });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getAllBanks = getAllBanks;
const createBank = async (req, res) => {
    try {
        const { name, code, type } = req.body;
        if (!name || !code)
            return res.status(400).json({ success: false, message: 'name and code are required' });
        const bank = await Bank_1.default.create({ name, code, type: type || 'bank' });
        res.status(201).json({ success: true, data: bank });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.createBank = createBank;
const updateBank = async (req, res) => {
    try {
        const bank = await Bank_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!bank)
            return res.status(404).json({ success: false, message: 'Bank not found' });
        res.json({ success: true, data: bank });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateBank = updateBank;
const deleteBank = async (req, res) => {
    try {
        const bank = await Bank_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!bank)
            return res.status(404).json({ success: false, message: 'Bank not found' });
        res.json({ success: true, message: 'Bank deactivated', data: bank });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteBank = deleteBank;
