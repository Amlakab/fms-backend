import express from 'express';
import {
  getHouseReviews,
  addReview,
  moderateReview,
  submitReport,
  getListingReports,
  updateReportStatus
} from '../controllers/reviewReportController';
import { authenticate } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

const router = express.Router();

// Reviews
router.get('/house/:houseId', getHouseReviews);
router.post('/house', authenticate, addReview);
router.patch('/:id/moderate', authenticate, checkRole(['admin']), moderateReview);

// Listing Reports (Scam / Misleading)
router.post('/report', submitReport);
router.get('/admin/reports', authenticate, checkRole(['admin']), getListingReports);
router.patch('/admin/reports/:id', authenticate, checkRole(['admin']), updateReportStatus);

export default router;
