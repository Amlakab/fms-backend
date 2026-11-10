import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Accountant from '../models/Accountant';
import Bank from '../models/Bank';
import House from '../models/House';
import LeaseAgreement from '../models/LeaseAgreement';

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['admin', 'manager', 'owner', 'agent'];

const isAdminOrManager = (actor: any) =>
  actor.role === 'admin' || actor.role === 'manager';

type Actor = {
  _id: string;
  role: string;
  ownerId?: string;
};

function getActor(req: Request): Actor {
  if (!req.user) {
    throw { status: 401, message: 'Authentication required' };
  }
  return req.user as any;
}

function viewFilter(actor: Actor, base: any = {}) {
  if (!ALLOWED_ROLES.includes(actor.role)) {
    throw { status: 403, message: 'Not authorized' };
  }
  if (isAdminOrManager(actor)) return base;
  return { ...base, agentId: actor._id };
}

function blockFilter(actor: Actor, base: any = {}) {
  return viewFilter(actor, base);
}

function selfFilter(actor: Actor, base: any = {}) {
  if (!ALLOWED_ROLES.includes(actor.role)) {
    throw { status: 403, message: 'Not authorized' };
  }
  return { ...base, agentId: actor._id };
}

function deriveOwnership(actor: Actor) {
  if (!ALLOWED_ROLES.includes(actor.role)) {
    throw { status: 403, message: 'Not authorized' };
  }
  return {
    ownerId: String(actor.ownerId || actor._id),
    agentId: String(actor._id),
    createdBy: String(actor._id)
  };
}

async function resolveBank(bankId: string) {
  if (!mongoose.Types.ObjectId.isValid(bankId)) {
    throw { status: 400, message: `Invalid bank id: ${bankId}` };
  }
  const bank = await Bank.findById(bankId);
  if (!bank) throw { status: 400, message: `Bank not found: ${bankId}` };
  if (!bank.isActive) throw { status: 400, message: `Bank "${bank.name}" is inactive` };
  return bank;
}

async function buildAccountsPayload(rawAccounts: any[]) {
  if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
    throw { status: 400, message: 'At least one bank/wallet account is required' };
  }

  const seenBankIds = new Set<string>();
  const normalized: any[] = [];

  for (const raw of rawAccounts) {
    const { bankId, accountHolderName, accountNumber } = raw || {};

    if (!bankId || !accountHolderName || !accountNumber) {
      throw { status: 400, message: 'Each account requires bankId, accountHolderName, and accountNumber' };
    }

    const holder = String(accountHolderName).trim();
    const num = String(accountNumber).trim().toUpperCase();

    if (!holder) throw { status: 400, message: 'accountHolderName cannot be empty' };
    if (!/^[A-Za-z0-9]{6,25}$/.test(num)) {
      throw { status: 400, message: `Invalid account number: "${accountNumber}" (6-25 alphanumeric characters)` };
    }

    const key = String(bankId);
    if (seenBankIds.has(key)) {
      throw { status: 400, message: 'Only one account per bank/wallet is allowed — bank appears twice in the request' };
    }
    seenBankIds.add(key);

    const bank = await resolveBank(key);

    const clash = await Accountant.findOne({
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

function sendError(res: Response, err: any, fallbackMsg: string) {
  const status = err?.status || 500;
  const message = err?.message || fallbackMsg;
  console.error(fallbackMsg, err);
  res.status(status).json({ success: false, message });
}

// ─────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────

export const createAccountant = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    const { ownerId, agentId, createdBy } = deriveOwnership(actor);
    const accounts = await buildAccountsPayload(req.body.accounts);

    const accountant = new Accountant({ ownerId, agentId, createdBy, accounts });
    await accountant.save();
    await accountant.populate('accounts.bankId', 'name code type isActive');

    res.status(201).json({
      success: true,
      message: 'Accountant created successfully',
      data: accountant
    });
  } catch (err) {
    sendError(res, err, 'Error creating accountant');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────

export const getAllAccountants = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    const { blocked, bankId, bankType, q, agentId } = req.query as any;

    let filter: any;
    try {
      filter = viewFilter(actor);
    } catch (e: any) {
      return res.status(403).json({ success: false, message: e.message });
    }

    if (isAdminOrManager(actor) && agentId) {
      if (!mongoose.Types.ObjectId.isValid(agentId)) {
        return res.status(400).json({ success: false, message: 'Invalid agentId in query' });
      }
      filter.agentId = new mongoose.Types.ObjectId(agentId);
    }

    if (blocked !== undefined) filter.isBlocked = blocked === 'true';
    if (bankId && mongoose.Types.ObjectId.isValid(bankId)) {
      filter['accounts.bankId'] = new mongoose.Types.ObjectId(bankId);
    }
    if (bankType) {
      const ids = (await Bank.find({ type: bankType, isActive: true }).select('_id')).map(b => b._id);
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

    const accountants = await Accountant.find(filter)
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
  } catch (err) {
    sendError(res, err, 'Error fetching accountants');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// DETAIL
// ─────────────────────────────────────────────────────────────────────────

export const getAccountantById = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    let filter: any;
    try {
      filter = viewFilter(actor, { _id: req.params.id });
    } catch (e: any) {
      return res.status(403).json({ success: false, message: e.message });
    }

    const accountant = await Accountant.findOne(filter)
      .populate('accounts.bankId', 'name code type isActive');
    if (!accountant) {
      return res.status(404).json({ success: false, message: 'Accountant not found' });
    }
    res.json({ success: true, data: accountant });
  } catch (err) {
    sendError(res, err, 'Error fetching accountant');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────

export const updateAccountant = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);

    let accountant;
    try {
      accountant = await Accountant.findOne(selfFilter(actor, { _id: req.params.id }));
    } catch (e: any) {
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
      const existingById = new Map<string, any>();
      for (const a of accountant.accounts as any[]) {
        existingById.set(String(a._id), a.toObject ? a.toObject() : a);
      }

      const seenBankIds = new Set<string>();
      const rebuilt: any[] = [];

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

        const clash = await Accountant.findOne({
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

      accountant.accounts = rebuilt as any;
    }

    if (req.body.isBlocked !== undefined) accountant.isBlocked = req.body.isBlocked;

    await accountant.save();
    await accountant.populate('accounts.bankId', 'name code type isActive');

    res.json({ success: true, message: 'Accountant updated successfully', data: accountant });
  } catch (err) {
    sendError(res, err, 'Error updating accountant');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// BLOCK WHOLE ACCOUNTANT
// ─────────────────────────────────────────────────────────────────────────

export const blockAccountant = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    const { isBlocked } = req.body;
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isBlocked must be a boolean' });
    }

    let filter: any;
    try {
      filter = blockFilter(actor, { _id: req.params.id });
    } catch (e: any) {
      return res.status(403).json({ success: false, message: e.message });
    }

    const accountant = await Accountant.findOneAndUpdate(filter, { isBlocked }, { new: true })
      .populate('accounts.bankId', 'name code type isActive');
    if (!accountant) {
      return res.status(404).json({ success: false, message: 'Accountant not found' });
    }
    res.json({ success: true, message: `Accountant ${isBlocked ? 'blocked' : 'unblocked'}`, data: accountant });
  } catch (err) {
    sendError(res, err, 'Error blocking accountant');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// BLOCK ONE ACCOUNT
// ─────────────────────────────────────────────────────────────────────────

export const blockAccount = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    const { isBlocked } = req.body;
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isBlocked must be a boolean' });
    }

    let filter: any;
    try {
      filter = blockFilter(actor, { _id: req.params.id });
    } catch (e: any) {
      return res.status(403).json({ success: false, message: e.message });
    }

    const accountant = await Accountant.findOne(filter);
    if (!accountant) {
      return res.status(404).json({ success: false, message: 'Accountant not found' });
    }

    const account: any = (accountant.accounts as any[]).find(a => String(a._id) === req.params.accountId);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    account.isBlocked = isBlocked;
    await accountant.save();
    await accountant.populate('accounts.bankId', 'name code type isActive');

    res.json({ success: true, message: `Account ${isBlocked ? 'blocked' : 'unblocked'}`, data: accountant });
  } catch (err) {
    sendError(res, err, 'Error blocking account');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// DELETE ONE
// ─────────────────────────────────────────────────────────────────────────

export const deleteAccountant = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);

    let filter: any;
    try {
      filter = selfFilter(actor, { _id: req.params.id });
    } catch (e: any) {
      return res.status(403).json({ success: false, message: e.message });
    }

    const accountant = await Accountant.findOneAndDelete(filter);
    if (!accountant) {
      return res.status(404).json({
        success: false,
        message: 'Accountant not found or you do not own this record'
      });
    }
    res.json({ success: true, message: 'Accountant deleted successfully', data: accountant });
  } catch (err) {
    sendError(res, err, 'Error deleting accountant');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// DELETE ALL (only caller's own records)
// ─────────────────────────────────────────────────────────────────────────

export const deleteAllAccountants = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    if (!ALLOWED_ROLES.includes(actor.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const r = await Accountant.deleteMany({ agentId: actor._id });
    res.json({
      success: true,
      message: 'Your accountants were deleted',
      data: { deletedCount: r.deletedCount }
    });
  } catch (err) {
    sendError(res, err, 'Error deleting accountants');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// FETCH ACCOUNTS MATCHING AGENT ID (FOR RENT / PROPERTY PAYMENT)
// ─────────────────────────────────────────────────────────────────────────

export const getAccountantByAgentId = async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing agent ID' });
    }

    const accountants = await Accountant.find({
      agentId: new mongoose.Types.ObjectId(agentId),
      isBlocked: false
    }).populate('accounts.bankId', 'name code type isActive');

    const activeAccounts: any[] = [];
    accountants.forEach(acc => {
      (acc.accounts || []).forEach((a: any) => {
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
  } catch (err) {
    sendError(res, err, 'Error fetching accountant accounts by agent ID');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// FETCH ACCOUNTS FOR LEASE AGREEMENT (MATCHING HOUSE AGENT ID)
// ─────────────────────────────────────────────────────────────────────────

export const getAccountantForLease = async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;
    if (!leaseId || !mongoose.Types.ObjectId.isValid(leaseId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing lease ID' });
    }

    const lease = await LeaseAgreement.findById(leaseId).populate('houseId');
    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease agreement not found' });
    }

    const house: any = lease.houseId;
    const targetAgentId = house?.agentId || lease.agentId || house?.ownerId || lease.landlordId;

    if (!targetAgentId) {
      return res.status(404).json({ success: false, message: 'No agent or owner associated with this property' });
    }

    // Match accountant where agentId matches house agentId
    let accountants = await Accountant.find({
      agentId: targetAgentId,
      isBlocked: false
    }).populate('accounts.bankId', 'name code type isActive');

    // Fallback if no accountant under agentId, check ownerId
    if (accountants.length === 0 && (house?.ownerId || lease.landlordId)) {
      const ownerId = house?.ownerId || lease.landlordId;
      accountants = await Accountant.find({
        $or: [{ agentId: ownerId }, { ownerId: ownerId }],
        isBlocked: false
      }).populate('accounts.bankId', 'name code type isActive');
    }

    const activeAccounts: any[] = [];
    accountants.forEach(acc => {
      (acc.accounts || []).forEach((a: any) => {
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
  } catch (err) {
    sendError(res, err, 'Error fetching accountant accounts for lease');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// FETCH ACCOUNTS FOR HOUSE (MATCHING HOUSE AGENT ID)
// ─────────────────────────────────────────────────────────────────────────

export const getAccountantForHouse = async (req: Request, res: Response) => {
  try {
    const { houseId } = req.params;
    if (!houseId || !mongoose.Types.ObjectId.isValid(houseId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing house ID' });
    }

    const house: any = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const targetAgentId = house.agentId || house.ownerId;
    let accountants = await Accountant.find({
      agentId: targetAgentId,
      isBlocked: false
    }).populate('accounts.bankId', 'name code type isActive');

    if (accountants.length === 0 && house.ownerId) {
      accountants = await Accountant.find({
        $or: [{ agentId: house.ownerId }, { ownerId: house.ownerId }],
        isBlocked: false
      }).populate('accounts.bankId', 'name code type isActive');
    }

    const activeAccounts: any[] = [];
    accountants.forEach(acc => {
      (acc.accounts || []).forEach((a: any) => {
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
  } catch (err) {
    sendError(res, err, 'Error fetching accountant accounts for house');
  }
};