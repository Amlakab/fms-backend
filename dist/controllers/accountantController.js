"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountantForHouse = exports.getAccountantForLease = exports.getAccountantByAgentId = exports.deleteAllAccountants = exports.deleteAccountant = exports.blockAccount = exports.blockAccountant = exports.updateAccountant = exports.getAccountantById = exports.getAllAccountants = exports.createAccountant = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Accountant_1 = __importDefault(require("../models/Accountant"));
const Bank_1 = __importDefault(require("../models/Bank"));
const House_1 = __importDefault(require("../models/House"));
const LeaseAgreement_1 = __importDefault(require("../models/LeaseAgreement"));
// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────
const ALLOWED_ROLES = ['admin', 'manager', 'owner', 'agent'];
const isAdminOrManager = (actor) => actor.role === 'admin' || actor.role === 'manager';
function getActor(req) {
    if (!req.user) {
        throw { status: 401, message: 'Authentication required' };
    }
    return req.user;
}
function viewFilter(actor, base = {}) {
    if (!ALLOWED_ROLES.includes(actor.role)) {
        throw { status: 403, message: 'Not authorized' };
    }
    if (isAdminOrManager(actor))
        return base;
    return { ...base, agentId: actor._id };
}
function blockFilter(actor, base = {}) {
    return viewFilter(actor, base);
}
function selfFilter(actor, base = {}) {
    if (!ALLOWED_ROLES.includes(actor.role)) {
        throw { status: 403, message: 'Not authorized' };
    }
    return { ...base, agentId: actor._id };
}
function deriveOwnership(actor) {
    if (!ALLOWED_ROLES.includes(actor.role)) {
        throw { status: 403, message: 'Not authorized' };
    }
    return {
        ownerId: String(actor.ownerId || actor._id),
        agentId: String(actor._id),
        createdBy: String(actor._id)
    };
}
async function resolveBank(bankId) {
    if (!mongoose_1.default.Types.ObjectId.isValid(bankId)) {
        throw { status: 400, message: `Invalid bank id: ${bankId}` };
    }
    const bank = await Bank_1.default.findById(bankId);
    if (!bank)
        throw { status: 400, message: `Bank not found: ${bankId}` };
    if (!bank.isActive)
        throw { status: 400, message: `Bank "${bank.name}" is inactive` };
    return bank;
}
async function buildAccountsPayload(rawAccounts) {
    if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
        throw { status: 400, message: 'At least one bank/wallet account is required' };
    }
    const seenBankIds = new Set();
    const normalized = [];
    for (const raw of rawAccounts) {
        const { bankId, accountHolderName, accountNumber } = raw || {};
        if (!bankId || !accountHolderName || !accountNumber) {
            throw { status: 400, message: 'Each account requires bankId, accountHolderName, and accountNumber' };
        }
        const holder = String(accountHolderName).trim();
        const num = String(accountNumber).trim().toUpperCase();
        if (!holder)
            throw { status: 400, message: 'accountHolderName cannot be empty' };
        if (!/^[A-Za-z0-9]{6,25}$/.test(num)) {
            throw { status: 400, message: `Invalid account number: "${accountNumber}" (6-25 alphanumeric characters)` };
        }
        const key = String(bankId);
        if (seenBankIds.has(key)) {
            throw { status: 400, message: 'Only one account per bank/wallet is allowed — bank appears twice in the request' };
        }
        seenBankIds.add(key);
        const bank = await resolveBank(key);
        const clash = await Accountant_1.default.findOne({
            'accounts.bankId': bank._id,
            'accounts.accountNumber': num
        });
        if (clash) {
            throw { status: 400, message: `Account number ${num} is already registered at ${bank.name}` };
        }
        normalized.push({
            bankId: bank._id,
            bankName: bank.name,
            bankCode: bank.code,
            accountHolderName: holder,
            accountNumber: num,
            isBlocked: false
        });
    }
    return normalized;
}
function sendError(res, err, fallbackMsg) {
    const status = err?.status || 500;
    const message = err?.message || fallbackMsg;
    console.error(fallbackMsg, err);
    res.status(status).json({ success: false, message });
}
// ─────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────
const createAccountant = async (req, res) => {
    try {
        const actor = getActor(req);
        const { ownerId, agentId, createdBy } = deriveOwnership(actor);
        const accounts = await buildAccountsPayload(req.body.accounts);
        const accountant = new Accountant_1.default({ ownerId, agentId, createdBy, accounts });
        await accountant.save();
        await accountant.populate('accounts.bankId', 'name code type isActive');
        res.status(201).json({
            success: true,
            message: 'Accountant created successfully',
            data: accountant
        });
    }
    catch (err) {
        sendError(res, err, 'Error creating accountant');
    }
};
exports.createAccountant = createAccountant;
// ─────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────
const getAllAccountants = async (req, res) => {
    try {
        const actor = getActor(req);
        const { blocked, bankId, bankType, q, agentId } = req.query;
        let filter;
        try {
            filter = viewFilter(actor);
        }
        catch (e) {
            return res.status(403).json({ success: false, message: e.message });
        }
        if (isAdminOrManager(actor) && agentId) {
            if (!mongoose_1.default.Types.ObjectId.isValid(agentId)) {
                return res.status(400).json({ success: false, message: 'Invalid agentId in query' });
            }
            filter.agentId = new mongoose_1.default.Types.ObjectId(agentId);
        }
        if (blocked !== undefined)
            filter.isBlocked = blocked === 'true';
        if (bankId && mongoose_1.default.Types.ObjectId.isValid(bankId)) {
            filter['accounts.bankId'] = new mongoose_1.default.Types.ObjectId(bankId);
        }
        if (bankType) {
            const ids = (await Bank_1.default.find({ type: bankType, isActive: true }).select('_id')).map(b => b._id);
            filter['accounts.bankId'] = { $in: ids };
        }
        if (q && String(q).trim()) {
            const rx = new RegExp(String(q).trim(), 'i');
            filter.$or = [
                { 'accounts.accountHolderName': rx },
                { 'accounts.accountNumber': rx },
                { 'accounts.bankName': rx }
            ];
        }
        const accountants = await Accountant_1.default.find(filter)
            .populate('accounts.bankId', 'name code type isActive')
            .sort({ createdAt: -1 });
        const data = accountants.map(a => {
            const obj = a.toObject();
            const isOwn = String(obj.agentId) === String(actor._id);
            return {
                ...obj,
                accountsCount: obj.accounts?.length || 0,
                canEdit: isOwn,
                canDelete: isOwn,
                canBlock: true
            };
        });
        res.json({ success: true, message: 'Accountants retrieved successfully', data });
    }
    catch (err) {
        sendError(res, err, 'Error fetching accountants');
    }
};
exports.getAllAccountants = getAllAccountants;
// ─────────────────────────────────────────────────────────────────────────
// DETAIL
// ─────────────────────────────────────────────────────────────────────────
const getAccountantById = async (req, res) => {
    try {
        const actor = getActor(req);
        let filter;
        try {
            filter = viewFilter(actor, { _id: req.params.id });
        }
        catch (e) {
            return res.status(403).json({ success: false, message: e.message });
        }
        const accountant = await Accountant_1.default.findOne(filter)
            .populate('accounts.bankId', 'name code type isActive');
        if (!accountant) {
            return res.status(404).json({ success: false, message: 'Accountant not found' });
        }
        res.json({ success: true, data: accountant });
    }
    catch (err) {
        sendError(res, err, 'Error fetching accountant');
    }
};
exports.getAccountantById = getAccountantById;
// ─────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────
const updateAccountant = async (req, res) => {
    try {
        const actor = getActor(req);
        let accountant;
        try {
            accountant = await Accountant_1.default.findOne(selfFilter(actor, { _id: req.params.id }));
        }
        catch (e) {
            return res.status(403).json({ success: false, message: e.message });
        }
        if (!accountant) {
            return res.status(404).json({
                success: false,
                message: 'Accountant not found or you do not own this record'
            });
        }
        if (req.body.accounts !== undefined) {
            const incoming = Array.isArray(req.body.accounts) ? req.body.accounts : [];
            const existingById = new Map();
            for (const a of accountant.accounts) {
                existingById.set(String(a._id), a.toObject ? a.toObject() : a);
            }
            const seenBankIds = new Set();
            const rebuilt = [];
            for (const raw of incoming) {
                const { _id, bankId, accountHolderName, accountNumber } = raw || {};
                if (!bankId || !accountHolderName || !accountNumber) {
                    throw { status: 400, message: 'Each account requires bankId, accountHolderName, and accountNumber' };
                }
                const key = String(bankId);
                if (seenBankIds.has(key)) {
                    throw { status: 400, message: 'Only one account per bank/wallet is allowed — bank appears twice' };
                }
                seenBankIds.add(key);
                const bank = await resolveBank(key);
                const holder = String(accountHolderName).trim();
                const num = String(accountNumber).trim().toUpperCase();
                if (!/^[A-Za-z0-9]{6,25}$/.test(num)) {
                    throw { status: 400, message: `Invalid account number: "${accountNumber}"` };
                }
                const clash = await Accountant_1.default.findOne({
                    _id: { $ne: accountant._id },
                    'accounts.bankId': bank._id,
                    'accounts.accountNumber': num
                });
                if (clash) {
                    throw { status: 400, message: `Account number ${num} is already registered at ${bank.name}` };
                }
                const previous = _id ? existingById.get(String(_id)) : null;
                rebuilt.push({
                    _id: previous?._id || undefined,
                    bankId: bank._id,
                    bankName: bank.name,
                    bankCode: bank.code,
                    accountHolderName: holder,
                    accountNumber: num,
                    isBlocked: previous?.isBlocked ?? false
                });
            }
            if (rebuilt.length === 0) {
                throw { status: 400, message: 'At least one bank/wallet account is required' };
            }
            accountant.accounts = rebuilt;
        }
        if (req.body.isBlocked !== undefined)
            accountant.isBlocked = req.body.isBlocked;
        await accountant.save();
        await accountant.populate('accounts.bankId', 'name code type isActive');
        res.json({ success: true, message: 'Accountant updated successfully', data: accountant });
    }
    catch (err) {
        sendError(res, err, 'Error updating accountant');
    }
};
exports.updateAccountant = updateAccountant;
// ─────────────────────────────────────────────────────────────────────────
// BLOCK WHOLE ACCOUNTANT
// ─────────────────────────────────────────────────────────────────────────
const blockAccountant = async (req, res) => {
    try {
        const actor = getActor(req);
        const { isBlocked } = req.body;
        if (typeof isBlocked !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isBlocked must be a boolean' });
        }
        let filter;
        try {
            filter = blockFilter(actor, { _id: req.params.id });
        }
        catch (e) {
            return res.status(403).json({ success: false, message: e.message });
        }
        const accountant = await Accountant_1.default.findOneAndUpdate(filter, { isBlocked }, { new: true })
            .populate('accounts.bankId', 'name code type isActive');
        if (!accountant) {
            return res.status(404).json({ success: false, message: 'Accountant not found' });
        }
        res.json({ success: true, message: `Accountant ${isBlocked ? 'blocked' : 'unblocked'}`, data: accountant });
    }
    catch (err) {
        sendError(res, err, 'Error blocking accountant');
    }
};
exports.blockAccountant = blockAccountant;
// ─────────────────────────────────────────────────────────────────────────
// BLOCK ONE ACCOUNT
// ─────────────────────────────────────────────────────────────────────────
const blockAccount = async (req, res) => {
    try {
        const actor = getActor(req);
        const { isBlocked } = req.body;
        if (typeof isBlocked !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isBlocked must be a boolean' });
        }
        let filter;
        try {
            filter = blockFilter(actor, { _id: req.params.id });
        }
        catch (e) {
            return res.status(403).json({ success: false, message: e.message });
        }
        const accountant = await Accountant_1.default.findOne(filter);
        if (!accountant) {
            return res.status(404).json({ success: false, message: 'Accountant not found' });
        }
        const account = accountant.accounts.find(a => String(a._id) === req.params.accountId);
        if (!account)
            return res.status(404).json({ success: false, message: 'Account not found' });
        account.isBlocked = isBlocked;
        await accountant.save();
        await accountant.populate('accounts.bankId', 'name code type isActive');
        res.json({ success: true, message: `Account ${isBlocked ? 'blocked' : 'unblocked'}`, data: accountant });
    }
    catch (err) {
        sendError(res, err, 'Error blocking account');
    }
};
exports.blockAccount = blockAccount;
// ─────────────────────────────────────────────────────────────────────────
// DELETE ONE
// ─────────────────────────────────────────────────────────────────────────
const deleteAccountant = async (req, res) => {
    try {
        const actor = getActor(req);
        let filter;
        try {
            filter = selfFilter(actor, { _id: req.params.id });
        }
        catch (e) {
            return res.status(403).json({ success: false, message: e.message });
        }
        const accountant = await Accountant_1.default.findOneAndDelete(filter);
        if (!accountant) {
            return res.status(404).json({
                success: false,
                message: 'Accountant not found or you do not own this record'
            });
        }
        res.json({ success: true, message: 'Accountant deleted successfully', data: accountant });
    }
    catch (err) {
        sendError(res, err, 'Error deleting accountant');
    }
};
exports.deleteAccountant = deleteAccountant;
// ─────────────────────────────────────────────────────────────────────────
// DELETE ALL (only caller's own records)
// ─────────────────────────────────────────────────────────────────────────
const deleteAllAccountants = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!ALLOWED_ROLES.includes(actor.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const r = await Accountant_1.default.deleteMany({ agentId: actor._id });
        res.json({
            success: true,
            message: 'Your accountants were deleted',
            data: { deletedCount: r.deletedCount }
        });
    }
    catch (err) {
        sendError(res, err, 'Error deleting accountants');
    }
};
exports.deleteAllAccountants = deleteAllAccountants;
// ─────────────────────────────────────────────────────────────────────────
// FETCH ACCOUNTS MATCHING AGENT ID (FOR RENT / PROPERTY PAYMENT)
// ─────────────────────────────────────────────────────────────────────────
const getAccountantByAgentId = async (req, res) => {
    try {
        const { agentId } = req.params;
        if (!agentId || !mongoose_1.default.Types.ObjectId.isValid(agentId)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing agent ID' });
        }
        const accountants = await Accountant_1.default.find({
            agentId: new mongoose_1.default.Types.ObjectId(agentId),
            isBlocked: false
        }).populate('accounts.bankId', 'name code type isActive');
        const activeAccounts = [];
        accountants.forEach(acc => {
            (acc.accounts || []).forEach((a) => {
                if (!a.isBlocked) {
                    activeAccounts.push({
                        _id: a._id,
                        accountantId: acc._id,
                        agentId: acc.agentId,
                        ownerId: acc.ownerId,
                        bankId: a.bankId?._id || a.bankId,
                        bankName: a.bankName,
                        bankCode: a.bankCode,
                        type: a.bankId?.type || 'bank',
                        accountHolderName: a.accountHolderName,
                        accountNumber: a.accountNumber
                    });
                }
            });
        });
        res.json({
            success: true,
            data: activeAccounts,
            accountants
        });
    }
    catch (err) {
        sendError(res, err, 'Error fetching accountant accounts by agent ID');
    }
};
exports.getAccountantByAgentId = getAccountantByAgentId;
// ─────────────────────────────────────────────────────────────────────────
// FETCH ACCOUNTS FOR LEASE AGREEMENT (MATCHING HOUSE AGENT ID)
// ─────────────────────────────────────────────────────────────────────────
const getAccountantForLease = async (req, res) => {
    try {
        const { leaseId } = req.params;
        if (!leaseId || !mongoose_1.default.Types.ObjectId.isValid(leaseId)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing lease ID' });
        }
        const lease = await LeaseAgreement_1.default.findById(leaseId).populate('houseId');
        if (!lease) {
            return res.status(404).json({ success: false, message: 'Lease agreement not found' });
        }
        const house = lease.houseId;
        const targetAgentId = house?.agentId || lease.agentId || house?.ownerId || lease.landlordId;
        if (!targetAgentId) {
            return res.status(404).json({ success: false, message: 'No agent or owner associated with this property' });
        }
        // Match accountant where agentId matches house agentId
        let accountants = await Accountant_1.default.find({
            agentId: targetAgentId,
            isBlocked: false
        }).populate('accounts.bankId', 'name code type isActive');
        // Fallback if no accountant under agentId, check ownerId
        if (accountants.length === 0 && (house?.ownerId || lease.landlordId)) {
            const ownerId = house?.ownerId || lease.landlordId;
            accountants = await Accountant_1.default.find({
                $or: [{ agentId: ownerId }, { ownerId: ownerId }],
                isBlocked: false
            }).populate('accounts.bankId', 'name code type isActive');
        }
        const activeAccounts = [];
        accountants.forEach(acc => {
            (acc.accounts || []).forEach((a) => {
                if (!a.isBlocked) {
                    activeAccounts.push({
                        _id: a._id,
                        accountantId: acc._id,
                        agentId: acc.agentId,
                        ownerId: acc.ownerId,
                        bankId: a.bankId?._id || a.bankId,
                        bankName: a.bankName,
                        bankCode: a.bankCode,
                        type: a.bankId?.type || 'bank',
                        accountHolderName: a.accountHolderName,
                        accountNumber: a.accountNumber
                    });
                }
            });
        });
        res.json({
            success: true,
            agentId: targetAgentId,
            houseTitle: house?.title,
            data: activeAccounts,
            accountants
        });
    }
    catch (err) {
        sendError(res, err, 'Error fetching accountant accounts for lease');
    }
};
exports.getAccountantForLease = getAccountantForLease;
// ─────────────────────────────────────────────────────────────────────────
// FETCH ACCOUNTS FOR HOUSE (MATCHING HOUSE AGENT ID)
// ─────────────────────────────────────────────────────────────────────────
const getAccountantForHouse = async (req, res) => {
    try {
        const { houseId } = req.params;
        if (!houseId || !mongoose_1.default.Types.ObjectId.isValid(houseId)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing house ID' });
        }
        const house = await House_1.default.findById(houseId);
        if (!house) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const targetAgentId = house.agentId || house.ownerId;
        let accountants = await Accountant_1.default.find({
            agentId: targetAgentId,
            isBlocked: false
        }).populate('accounts.bankId', 'name code type isActive');
        if (accountants.length === 0 && house.ownerId) {
            accountants = await Accountant_1.default.find({
                $or: [{ agentId: house.ownerId }, { ownerId: house.ownerId }],
                isBlocked: false
            }).populate('accounts.bankId', 'name code type isActive');
        }
        const activeAccounts = [];
        accountants.forEach(acc => {
            (acc.accounts || []).forEach((a) => {
                if (!a.isBlocked) {
                    activeAccounts.push({
                        _id: a._id,
                        accountantId: acc._id,
                        agentId: acc.agentId,
                        ownerId: acc.ownerId,
                        bankId: a.bankId?._id || a.bankId,
                        bankName: a.bankName,
                        bankCode: a.bankCode,
                        type: a.bankId?.type || 'bank',
                        accountHolderName: a.accountHolderName,
                        accountNumber: a.accountNumber
                    });
                }
            });
        });
        res.json({
            success: true,
            agentId: targetAgentId,
            data: activeAccounts,
            accountants
        });
    }
    catch (err) {
        sendError(res, err, 'Error fetching accountant accounts for house');
    }
};
exports.getAccountantForHouse = getAccountantForHouse;
