import { Request, Response } from 'express';
import Bank from '../models/Bank';

export const getAllBanks = async (req: Request, res: Response) => {
  try {
    const { type, includeInactive } = req.query as any;
    const filter: any = {};
    if (type) filter.type = type;
    if (includeInactive !== 'true') filter.isActive = true;
    const banks = await Bank.find(filter).sort({ type: 1, name: 1 });
    res.json({ success: true, data: banks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createBank = async (req: Request, res: Response) => {
  try {
    const { name, code, type } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'name and code are required' });
    const bank = await Bank.create({ name, code, type: type || 'bank' });
    res.status(201).json({ success: true, data: bank });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBank = async (req: Request, res: Response) => {
  try {
    const bank = await Bank.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bank) return res.status(404).json({ success: false, message: 'Bank not found' });
    res.json({ success: true, data: bank });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteBank = async (req: Request, res: Response) => {
  try {
    const bank = await Bank.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!bank) return res.status(404).json({ success: false, message: 'Bank not found' });
    res.json({ success: true, message: 'Bank deactivated', data: bank });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};