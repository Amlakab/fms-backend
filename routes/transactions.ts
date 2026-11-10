import express, { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import Wallet from '../models/Wallet';
import User from '../models/User';
import House, { HouseStatus } from '../models/House';
import LeaseAgreement from '../models/LeaseAgreement';
import PurchaseOffer, { OfferStatus } from '../models/PurchaseOffer';
import Notification, { NotificationType } from '../models/Notification';
import { authenticate } from '../middleware/auth';
import { hydrateHouseRefs } from '../utils/houseRef';

const router = express.Router();

// Helper function to convert number to words
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convertBelowThousand = (n: number): string => {
    if (n === 0) return '';
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  };
  
  let words = '';
  let number = Math.floor(num);
  
  if (number >= 1000) {
    words += convertBelowThousand(Math.floor(number / 1000)) + ' Thousand ';
    number %= 1000;
  }
  if (number > 0) {
    words += convertBelowThousand(number) + ' ';
  }
  
  return words.trim() + ' Birr';
};

// Get all transactions with filters and role-based access
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, status, method, search, startDate, endDate, page = 1, limit = 10 } = req.query;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    
    const query: any = {};
    
    // ─── ROLE BASED FILTERING ──────────────────────────────────────
    if (userRole === 'customer' || userRole === 'user') {
      query.userId = userId;
    } 
    else if (userRole === 'agent') {
      const agentHouses = await House.find({ agentId: userId }).select('_id');
      query.houseId = { $in: agentHouses.map(h => h._id) };
    } 
    else if (userRole === 'owner') {
      const ownerHouses = await House.find({ ownerId: userId }).select('_id');
      query.houseId = { $in: ownerHouses.map(h => h._id) };
    }
    // admin and manager see all (no filter)
    // ───────────────────────────────────────────────────────────────

    if (type) query.type = type;
    if (status) query.status = status;
    if (method) query.method = method;
    
    if (search) {
      query.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } },
        { 'userId.phone': { $regex: search, $options: 'i' } },
        { senderPhone: { $regex: search, $options: 'i' } },
        { receiverPhone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const transactions = await Transaction.find(query)
      .populate('userId', 'phone name')
      .populate('houseId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: hydrateHouseRefs(transactions.map(t => t.toObject())),
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        count: transactions.length,
        totalRecords: total
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get transaction stats (scoped by role)
router.get('/stats/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    const query: any = {};

    // ─── ROLE BASED FILTERING ──────────────────────────────────────
    if (userRole === 'customer' || userRole === 'user') {
      query.userId = userId;
    } 
    else if (userRole === 'agent') {
      const agentHouses = await House.find({ agentId: userId }).select('_id');
      query.houseId = { $in: agentHouses.map(h => h._id) };
    } 
    else if (userRole === 'owner') {
      const ownerHouses = await House.find({ ownerId: userId }).select('_id');
      query.houseId = { $in: ownerHouses.map(h => h._id) };
    }
    // ───────────────────────────────────────────────────────────────

    // Note: For a specific agent/owner, the global Wallet balance might not make sense,
    // but we'll return it anyway if they have access.
    const wallet = await Wallet.findOne();
    
    const totalDepositsResult = await Transaction.aggregate([
      { $match: { ...query, type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalWithdrawalsResult = await Transaction.aggregate([
      { $match: { ...query, type: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalPropertyPurchasesResult = await Transaction.aggregate([
      { $match: { ...query, class: 'property_purchase', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const pendingDeposits = await Transaction.countDocuments({ ...query, type: 'deposit', status: 'pending' });
    const pendingPropertyPayments = await Transaction.countDocuments({ ...query, class: 'property_purchase', status: 'pending' });
    const totalTransactions = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        totalTransactions,
        totalDeposits: totalDepositsResult[0]?.total || 0,
        totalWithdrawals: totalWithdrawalsResult[0]?.total || 0,
        totalPropertyPurchases: totalPropertyPurchasesResult[0]?.total || 0,
        pendingDeposits,
        pendingPropertyPayments,
        netBalance: wallet?.wallet || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get transactions by user ID (Secured)
router.get('/user/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUser = (req as any).user;
    
    // Only admins, managers, or the user themselves can view this
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view these transactions' });
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const transactions = await Transaction.find({ userId })
      .populate('houseId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Transaction.countDocuments({ userId });
    
    res.json({
      success: true,
      data: hydrateHouseRefs(transactions.map(t => t.toObject())),
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        count: transactions.length,
        totalRecords: total
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create transaction (deposit/withdrawal/property payment)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      userId,
      houseId,
      orderId,
      amount,
      type,
      method,
      transactionId,
      senderPhone,
      senderName,
      receiverPhone,
      receiverName,
      description,
      amountInString
    } = req.body;
    
    // Validate required fields
    if (!userId || !amount || amount <= 0 || !type || !method) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const validTypes = ['deposit', 'withdrawal', 'game_purchase', 'winning', 'property_purchase'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }
    
    const validMethods = ['telebirr', 'cbe', 'cash'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ success: false, message: `Invalid method. Must be one of: ${validMethods.join(', ')}` });
    }
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    let transactionClass = type;
    if (houseId) {
      transactionClass = 'property_purchase';
    } else if (type === 'deposit' || type === 'withdrawal') {
      transactionClass = type;
    } else if (type === 'game_purchase') {
      transactionClass = 'game_purchase';
    } else if (type === 'winning') {
      transactionClass = 'winning';
    }
    
    const reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const finalAmountInString = amountInString || numberToWords(amount);
    
    const transactionData = {
      userId: user._id,
      houseId: houseId || undefined,
      orderId: orderId || undefined,
      class: transactionClass,
      type: type,
      amount: amount,
      amountInString: finalAmountInString,
      status: 'pending',
      availability: 'active',
      reference: reference,
      description: description || `${type} via ${method}${houseId ? ' for property purchase' : ''}`,
      transactionId: method !== 'cash' ? transactionId : undefined,
      senderPhone: method !== 'cash' ? senderPhone : undefined,
      senderName: senderName || user.name,
      receiverPhone: method !== 'cash' ? receiverPhone : undefined,
      receiverName: receiverName,
      method: method,
      metadata: {
        method,
        userPhone: user.phone,
        userName: user.name,
        userId: user._id,
        houseId: houseId || null,
        orderId: orderId || null,
        submittedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        ...(req.body.metadata || {})
      }
    };
    
    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();
    
    if (savedTransaction.houseId) await savedTransaction.populate('houseId', 'title');
    if (savedTransaction.orderId) await savedTransaction.populate('orderId', 'title');
    await savedTransaction.populate('userId', 'name phone email');
    
    res.status(201).json({
      success: true,
      data: savedTransaction,
      message: 'Transaction created successfully'
    });
    
  } catch (error: any) {
    console.error('Transaction creation error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate transaction reference' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve transaction (Secured)
router.put('/approve/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    
    const transaction = await Transaction.findById(id).populate('houseId', 'agentId ownerId');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction is not pending' });
    }

    // ─── SECURITY CHECK ────────────────────────────────────────────
    const house = transaction.houseId as any;
    if (userRole === 'agent' && house?.agentId && house.agentId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to approve this transaction' });
    }
    if (userRole === 'owner' && house?.ownerId && house.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to approve this transaction' });
    }
    // admin/manager bypass
    // ───────────────────────────────────────────────────────────────
    
    const user = (req as any).user || { name: 'Admin' };
    transaction.status = 'approved';
    transaction.approvedBy = user.name || user.username || 'Admin';
    transaction.approvedAt = new Date();
    if (reason) transaction.reason = reason;
    await transaction.save();

    // ─── IF TRANSACTION IS LINKED TO A LEASE INSTALLMENT, MARK IT PAID ─────────
    if (transaction.metadata?.leaseId && transaction.metadata?.installmentNumber !== undefined) {
      try {
        const lease = await LeaseAgreement.findById(transaction.metadata.leaseId);
        if (lease) {
          const installment = lease.paymentSchedule.find(
            (p: any) => p.installmentNumber === Number(transaction.metadata.installmentNumber)
          );
          if (installment) {
            installment.status = 'PAID';
            installment.paidAmount = transaction.amount;
            installment.paidDate = new Date();
            installment.receiptNumber = installment.receiptNumber || `RCP-${Date.now().toString().slice(-7)}`;
            installment.transactionReference = transaction.transactionId || transaction.reference;
            await lease.save();

            // Store receipt number in transaction metadata
            transaction.metadata.receiptNumber = installment.receiptNumber;
            transaction.markModified('metadata');
            await transaction.save();

            // Notify the tenant
            await Notification.create({
              userId: lease.tenantId,
              title: 'Rent Payment Approved',
              message: `Your payment of ETB ${transaction.amount.toLocaleString()} for Lease #${lease.agreementNumber} (Installment #${installment.installmentNumber}) has been approved! Official Receipt #${installment.receiptNumber} is now available.`,
              type: NotificationType.LEASE_UPDATE,
              link: '/admin/customer'
            });
          }
        }
      } catch (e) {
        console.error('Error updating lease installment on transaction approval:', e);
      }
    }

    // ─── IF TRANSACTION IS LINKED TO A PURCHASE OFFER MILESTONE, MARK IT PAID ─────────
    if (transaction.metadata?.offerId && transaction.metadata?.milestoneId) {
      try {
        const offer = await PurchaseOffer.findById(transaction.metadata.offerId).populate('houseId');
        if (offer) {
          const milestone = offer.milestones.find(
            (m: any) => m._id?.toString() === transaction.metadata.milestoneId || m.id === transaction.metadata.milestoneId
          );
          if (milestone) {
            milestone.status = 'PAID';
            milestone.paidAmount = transaction.amount;
            milestone.paidAt = new Date();
            milestone.receiptNumber = milestone.receiptNumber || `RCP-BUY-${Date.now().toString().slice(-7)}`;
            milestone.transactionReference = transaction.transactionId || transaction.reference;

            // Store receipt number in transaction metadata
            transaction.metadata.receiptNumber = milestone.receiptNumber;
            transaction.markModified('metadata');
            await transaction.save();

            // Progress offer and house status
            const allPaid = offer.milestones.every((m: any) => m.status === 'PAID' || m.status === 'VERIFIED');
            if (allPaid) {
              offer.status = OfferStatus.COMPLETED_SALE;
              offer.completedAt = new Date();
              offer.deedTransferDate = new Date();
              await House.findByIdAndUpdate(offer.houseId, { status: HouseStatus.SOLD });
            } else {
              const isFirstMilestone = offer.milestones[0]._id?.toString() === milestone._id?.toString() || offer.milestones[0].id === milestone.id;
              if (isFirstMilestone && offer.status === OfferStatus.OFFER_ACCEPTED) {
                offer.status = OfferStatus.RESERVATION_DEPOSIT_PAID;
              } else {
                offer.status = OfferStatus.PAYMENT_MILESTONES_ACTIVE;
              }
            }
            await offer.save();

            // Notify the buyer
            await Notification.create({
              userId: offer.buyerId,
              title: 'Property Purchase Payment Approved',
              message: `Your payment of ETB ${transaction.amount.toLocaleString()} for "${milestone.title}" on ${(offer.houseId as any)?.title || 'Property'} has been approved! Official Sales Receipt #${milestone.receiptNumber} is now available.`,
              type: NotificationType.OFFER_UPDATE,
              link: '/admin/customer'
            });
          }
        }
      } catch (e) {
        console.error('Error updating purchase offer milestone on transaction approval:', e);
      }
    }

    res.json({ success: true, data: transaction, message: 'Transaction approved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reject transaction (Secured)
router.put('/reject/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required for rejection' });
    
    const transaction = await Transaction.findById(id).populate('houseId', 'agentId ownerId');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Transaction is not pending' });
    }

    // ─── SECURITY CHECK ────────────────────────────────────────────
    const house = transaction.houseId as any;
    if (userRole === 'agent' && house?.agentId && house.agentId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to reject this transaction' });
    }
    if (userRole === 'owner' && house?.ownerId && house.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to reject this transaction' });
    }
    // ───────────────────────────────────────────────────────────────
    
    transaction.status = 'failed';
    transaction.reason = reason;
    await transaction.save();

    // ─── IF TRANSACTION IS LINKED TO A LEASE, REVERT STATUS BACK TO PENDING ───
    if (transaction.metadata?.leaseId && transaction.metadata?.installmentNumber !== undefined) {
      try {
        const lease = await LeaseAgreement.findById(transaction.metadata.leaseId);
        if (lease) {
          const installment = lease.paymentSchedule.find(
            (p: any) => p.installmentNumber === Number(transaction.metadata.installmentNumber)
          );
          if (installment && installment.status === 'UNDER_REVIEW') {
            installment.status = 'PENDING';
            await lease.save();

            // Notify the tenant
            await Notification.create({
              userId: lease.tenantId,
              title: 'Rent Payment Rejected',
              message: `Your rent payment for Lease #${lease.agreementNumber} (Installment #${installment.installmentNumber}) was rejected. Reason: ${reason}. Please review details and resubmit.`,
              type: NotificationType.LEASE_UPDATE,
              link: '/admin/customer'
            });
          }
        }
      } catch (e) {
        console.error('Error reverting lease installment on transaction rejection:', e);
      }
    }

    // ─── IF TRANSACTION IS LINKED TO A PURCHASE OFFER MILESTONE, REVERT STATUS ───
    if (transaction.metadata?.offerId && transaction.metadata?.milestoneId) {
      try {
        const offer = await PurchaseOffer.findById(transaction.metadata.offerId);
        if (offer) {
          const milestone = offer.milestones.find(
            (m: any) => m._id?.toString() === transaction.metadata.milestoneId || m.id === transaction.metadata.milestoneId
          );
          if (milestone && milestone.status === 'UNDER_REVIEW') {
            milestone.status = 'PENDING';
            await offer.save();

            // Notify the buyer
            await Notification.create({
              userId: offer.buyerId,
              title: 'Purchase Milestone Payment Rejected',
              message: `Your payment for "${milestone.title}" was rejected. Reason: ${reason}. Please review details and resubmit.`,
              type: NotificationType.OFFER_UPDATE,
              link: '/admin/customer'
            });
          }
        }
      } catch (e) {
        console.error('Error reverting purchase offer milestone on transaction rejection:', e);
      }
    }
    
    res.json({ success: true, data: transaction, message: 'Transaction rejected successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete transaction (Secured)
router.put('/complete/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    
    const transaction = await Transaction.findById(id).populate('houseId', 'agentId ownerId');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    
    if (transaction.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Transaction must be approved first' });
    }

    // ─── SECURITY CHECK ────────────────────────────────────────────
    const house = transaction.houseId as any;
    if (userRole === 'agent' && house?.agentId && house.agentId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to complete this transaction' });
    }
    if (userRole === 'owner' && house?.ownerId && house.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to complete this transaction' });
    }
    // ───────────────────────────────────────────────────────────────
    
    const user = (req as any).user || { name: 'Admin' };
    transaction.status = 'completed';
    transaction.completedBy = user.name || user.username || 'Admin';
    transaction.completedAt = new Date();
    if (transactionId) transaction.transactionId = transactionId;

    // ─── ENSURE LEASE INSTALLMENT IS PAID IF LINKED ───
    if (transaction.metadata?.leaseId && transaction.metadata?.installmentNumber !== undefined) {
      try {
        const lease = await LeaseAgreement.findById(transaction.metadata.leaseId);
        if (lease) {
          const installment = lease.paymentSchedule.find(
            (p: any) => p.installmentNumber === Number(transaction.metadata.installmentNumber)
          );
          if (installment && installment.status !== 'PAID') {
            installment.status = 'PAID';
            installment.paidAmount = transaction.amount;
            installment.paidDate = new Date();
            installment.receiptNumber = installment.receiptNumber || `RCP-${Date.now().toString().slice(-7)}`;
            installment.transactionReference = transaction.transactionId || transaction.reference;
            await lease.save();
          }
        }
      } catch (e) {
        console.error('Error updating lease on complete:', e);
      }
    }
    
    const wallet = await Wallet.findOne();
    if (!wallet) {
      const newWallet = new Wallet({
        wallet: transaction.type === 'deposit' ? transaction.amount : -transaction.amount,
        totalDeposit: transaction.type === 'deposit' ? transaction.amount : 0,
        totalWithdrawal: transaction.type === 'withdrawal' ? transaction.amount : 0
      });
      await newWallet.save();
    } else {
      if (transaction.type === 'deposit') {
        wallet.wallet += transaction.amount;
        wallet.totalDeposit += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        wallet.wallet -= transaction.amount;
        wallet.totalWithdrawal += transaction.amount;
      }
      await wallet.save();
    }
    
    await transaction.save();
    res.json({ success: true, data: transaction, message: 'Transaction completed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm withdrawal (Secured)
router.put('/confirm/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;
    
    const transaction = await Transaction.findById(id).populate('houseId', 'agentId ownerId');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    
    if (transaction.type !== 'withdrawal' || transaction.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed withdrawals can be confirmed' });
    }

    // ─── SECURITY CHECK ────────────────────────────────────────────
    const house = transaction.houseId as any;
    if (userRole === 'agent' && house?.agentId && house.agentId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to confirm this transaction' });
    }
    if (userRole === 'owner' && house?.ownerId && house.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to confirm this transaction' });
    }
    // ───────────────────────────────────────────────────────────────
    
    const user = (req as any).user || { name: 'Admin' };
    transaction.status = 'confirmed';
    transaction.confirmedBy = user.name || user.username || 'Admin';
    transaction.confirmedAt = new Date();
    
    await transaction.save();
    res.json({ success: true, data: transaction, message: 'Withdrawal confirmed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get wallet balance (Secured)
router.get('/wallet/balance', authenticate, async (req: Request, res: Response) => {
  try {
    // Wallet is typically a global escrow, but if you need individual user balances, 
    // this would filter by req.user._id. Assuming global for now.
    const wallet = await Wallet.findOne();
    res.json({
      success: true,
      data: {
        wallet: wallet?.wallet || 0,
        totalDeposit: wallet?.totalDeposit || 0,
        totalWithdrawal: wallet?.totalWithdrawal || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;