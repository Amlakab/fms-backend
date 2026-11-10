import { Request, Response } from 'express';
import Loan, { ILoan } from '../models/Loan';
import mongoose from 'mongoose';

// Helper functions
const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res: Response, message: string = 'Error', statusCode: number = 500) => {
  res.status(statusCode).json({
    success: false,
    message
  });
};

// Get all loans with pagination and filtering
export const getAllLoans = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const loanType = req.query.loanType as string || '';
    const status = req.query.status as string || '';
    const startDate = req.query.startDate as string || '';
    const endDate = req.query.endDate as string || '';
    const minAmount = req.query.minAmount as string || '';
    const maxAmount = req.query.maxAmount as string || '';

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    
    // Search in multiple fields
    if (search) {
      filter.$or = [
        { loanerId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (loanType) {
      filter.loanType = loanType;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) {
        filter.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter.amount.$lte = parseFloat(maxAmount);
      }
    }

    // For non-admin users, only show their created loans
    if (req.user && req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    const loans = await Loan.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalLoans = await Loan.countDocuments(filter);
    const totalPages = Math.ceil(totalLoans / limit);

    // Calculate totals
    const totalTaken = await Loan.aggregate([
      { $match: { ...filter, loanType: 'TAKEN', status: 'UNPAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalGiven = await Loan.aggregate([
      { $match: { ...filter, loanType: 'GIVEN', status: 'UNPAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    successResponse(res, {
      loans,
      totals: {
        totalTaken: totalTaken[0]?.total || 0,
        totalGiven: totalGiven[0]?.total || 0
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalLoans,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Loans retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching loans:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get single loan
export const getLoan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return errorResponse(res, 'Loan identifier is required', 400);
    }

    let loan = null;

    // Check if the ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      loan = await Loan.findById(id).populate('createdBy', 'firstName lastName email');
    }
    
    // If not found by _id, try by loanId
    if (!loan) {
      loan = await Loan.findOne({ 
        loanId: id 
      }).populate('createdBy', 'firstName lastName email');
    }

    if (!loan) {
      return errorResponse(res, 'Loan not found', 404);
    }

    // Check permission for non-admin users
    if (req.user && req.user.role !== 'admin' && loan.createdBy._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized access to this loan', 403);
    }

    successResponse(res, loan, 'Loan retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching loan:', error);
    errorResponse(res, error.message, 500);
  }
};

// Create new loan
export const createLoan = async (req: Request, res: Response) => {
  try {
    const {
      loanerId,
      name,
      amount,
      reason,
      loanType,
      date,
      status = 'UNPAID'
    } = req.body;

    // Validate amount
    if (amount <= 0) {
      return errorResponse(res, 'Amount must be greater than 0', 400);
    }

    // Get user from request (from auth middleware)
    const userId = req.user?._id;
    if (!userId) {
      return errorResponse(res, 'User authentication required', 401);
    }

    const newLoan = new Loan({
      loanerId,
      name,
      amount: parseFloat(amount),
      reason: reason || 'not specified',
      loanType,
      date: date ? new Date(date) : new Date(),
      status,
      createdBy: userId
    });

    await newLoan.save();
    
    // Populate createdBy field
    const populatedLoan = await Loan.findById(newLoan._id)
      .populate('createdBy', 'firstName lastName email');
    
    successResponse(res, populatedLoan, 'Loan created successfully', 201);
  } catch (error: any) {
    console.error('Error creating loan:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'Loan with this ID already exists', 400);
    }
    errorResponse(res, error.message, 500);
  }
};

// Update loan
export const updateLoan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid loan ID', 400);
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return errorResponse(res, 'Loan not found', 404);
    }

    // Check permission for non-admin users
    if (req.user && req.user.role !== 'admin' && loan.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to update this loan', 403);
    }

    // Prevent updating loanId
    if (req.body.loanId) {
      delete req.body.loanId;
    }

    // Prevent updating createdBy
    if (req.body.createdBy) {
      delete req.body.createdBy;
    }

    // Update amount if provided
    if (req.body.amount) {
      if (req.body.amount <= 0) {
        return errorResponse(res, 'Amount must be greater than 0', 400);
      }
      req.body.amount = parseFloat(req.body.amount);
    }

    // Update date if provided
    if (req.body.date) {
      req.body.date = new Date(req.body.date);
    }

    const updatedLoan = await Loan.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    successResponse(res, updatedLoan, 'Loan updated successfully');
  } catch (error: any) {
    console.error('Error updating loan:', error);
    errorResponse(res, error.message, 500);
  }
};

// Update loan status (mark as paid)
export const updateLoanStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['UNPAID', 'PAID'].includes(status)) {
      return errorResponse(res, 'Status must be either UNPAID or PAID', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid loan ID', 400);
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return errorResponse(res, 'Loan not found', 404);
    }

    // Check permission for non-admin users
    if (req.user && req.user.role !== 'admin' && loan.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to update this loan status', 403);
    }

    const updatedLoan = await Loan.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    successResponse(res, updatedLoan, `Loan marked as ${status.toLowerCase()} successfully`);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Mark loan as paid
export const markAsPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid loan ID', 400);
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return errorResponse(res, 'Loan not found', 404);
    }

    // Check permission for non-admin users
    if (req.user && req.user.role !== 'admin' && loan.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to mark this loan as paid', 403);
    }

    if (loan.status === 'PAID') {
      return errorResponse(res, 'Loan is already marked as paid', 400);
    }

    const updatedLoan = await Loan.findByIdAndUpdate(
      id,
      { status: 'PAID' },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    successResponse(res, updatedLoan, 'Loan marked as paid successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Delete loan
export const deleteLoan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid loan ID', 400);
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return errorResponse(res, 'Loan not found', 404);
    }

    // Check permission for non-admin users
    if (req.user && req.user.role !== 'admin' && loan.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to delete this loan', 403);
    }

    await Loan.findByIdAndDelete(id);

    successResponse(res, null, 'Loan deleted successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// Get loan statistics
export const getLoanStatistics = async (req: Request, res: Response) => {
  try {
    // Build filter for user-specific data if not admin
    const filter: any = {};
    if (req.user && req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    const totalLoans = await Loan.countDocuments(filter);
    const unpaidLoans = await Loan.countDocuments({ ...filter, status: 'UNPAID' });
    const paidLoans = await Loan.countDocuments({ ...filter, status: 'PAID' });
    
    // Total amounts
    const totalTaken = await Loan.aggregate([
      { $match: { ...filter, loanType: 'TAKEN' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalGiven = await Loan.aggregate([
      { $match: { ...filter, loanType: 'GIVEN' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalUnpaidTaken = await Loan.aggregate([
      { $match: { ...filter, loanType: 'TAKEN', status: 'UNPAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalUnpaidGiven = await Loan.aggregate([
      { $match: { ...filter, loanType: 'GIVEN', status: 'UNPAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Recent loans (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLoans = await Loan.countDocuments({
      ...filter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Group by status
    const statusStats = await Loan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Group by loan type
    const typeStats = await Loan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$loanType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Monthly statistics for the current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await Loan.aggregate([
      {
        $match: {
          ...filter,
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    successResponse(res, {
      summary: {
        totalLoans,
        unpaidLoans,
        paidLoans,
        recentLoans,
        totalTakenAmount: totalTaken[0]?.total || 0,
        totalGivenAmount: totalGiven[0]?.total || 0,
        totalUnpaidTakenAmount: totalUnpaidTaken[0]?.total || 0,
        totalUnpaidGivenAmount: totalUnpaidGiven[0]?.total || 0,
        netBalance: (totalUnpaidTaken[0]?.total || 0) - (totalUnpaidGiven[0]?.total || 0)
      },
      statusStats,
      typeStats,
      monthlyStats: monthlyStats.map(stat => ({
        month: stat._id,
        monthName: new Date(0, stat._id - 1).toLocaleString('default', { month: 'short' }),
        count: stat.count,
        totalAmount: stat.totalAmount
      }))
    }, 'Statistics retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching loan statistics:', error);
    errorResponse(res, error.message, 500);
  }
};

// Get unique values for filters
export const getFilterOptions = async (req: Request, res: Response) => {
  try {
    // Build filter for user-specific data if not admin
    const filter: any = {};
    if (req.user && req.user.role !== 'admin') {
      filter.createdBy = req.user._id;
    }

    const loanerIds = await Loan.distinct('loanerId', filter);
    const names = await Loan.distinct('name', filter);
    const reasons = await Loan.distinct('reason', filter);

    // Get min and max dates
    const dateRange = await Loan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' }
        }
      }
    ]);

    // Get min and max amounts
    const amountRange = await Loan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' }
        }
      }
    ]);

    successResponse(res, {
      loanerIds: loanerIds.filter(Boolean).sort(),
      names: names.filter(Boolean).sort(),
      reasons: reasons.filter(Boolean).sort(),
      dateRange: {
        minDate: dateRange[0]?.minDate || new Date(),
        maxDate: dateRange[0]?.maxDate || new Date()
      },
      amountRange: {
        minAmount: amountRange[0]?.minAmount || 0,
        maxAmount: amountRange[0]?.maxAmount || 0
      }
    }, 'Filter options retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching filter options:', error);
    errorResponse(res, error.message, 500);
  }
};

// Bulk mark as paid
export const bulkMarkAsPaid = async (req: Request, res: Response) => {
  try {
    const { loanIds } = req.body;

    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return errorResponse(res, 'Loan IDs array is required', 400);
    }

    // Validate all IDs
    const validIds = loanIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return errorResponse(res, 'No valid loan IDs provided', 400);
    }

    // Check permissions for non-admin users
    if (req.user && req.user.role !== 'admin') {
      const userLoans = await Loan.find({
        _id: { $in: validIds },
        createdBy: req.user._id
      });
      
      if (userLoans.length !== validIds.length) {
        return errorResponse(res, 'Unauthorized to update some loans', 403);
      }
    }

    const result = await Loan.updateMany(
      { _id: { $in: validIds } },
      { $set: { status: 'PAID' } }
    );

    successResponse(res, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    }, `${result.modifiedCount} loans marked as paid successfully`);
  } catch (error: any) {
    console.error('Error in bulk mark as paid:', error);
    errorResponse(res, error.message, 500);
  }
};