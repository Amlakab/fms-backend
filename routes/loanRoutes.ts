import express from 'express';
import {
  getAllLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  updateLoanStatus,
  markAsPaid,
  getLoanStatistics,
  getFilterOptions,
  bulkMarkAsPaid
} from '../controllers/loanController';
import { authenticate } from '../middleware/auth';
const router = express.Router();

// Public routes (if any)
router.get('/filter-options', authenticate, getFilterOptions);

// Protected routes
router.get('/', authenticate, getAllLoans);
router.get('/stats', authenticate, getLoanStatistics);
router.get('/:id', authenticate, getLoan);
router.post('/', authenticate, createLoan);
router.post('/bulk-mark-paid', authenticate, bulkMarkAsPaid);
router.put('/:id', authenticate, updateLoan);
router.patch('/:id/status', authenticate, updateLoanStatus);
router.patch('/:id/mark-paid', authenticate, markAsPaid);
router.delete('/:id', authenticate, deleteLoan);

export default router;