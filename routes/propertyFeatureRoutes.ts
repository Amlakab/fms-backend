import express from 'express';
import {
  toggleLikeProperty,
  compareProperties,
  getSimilarProperties,
  getTagSuggestions,
  getSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  getCategoryConfigs,
  saveCategoryConfig,
  getVerificationQueue,
  updatePropertyVerification,
  getAuditLogs
} from '../controllers/propertyFeatureController';
import { authenticate } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

const router = express.Router();

// Public / Authenticated Property Features
router.get('/tags/suggest', getTagSuggestions);
router.get('/compare', compareProperties);
router.get('/:id/similar', getSimilarProperties);
router.post('/:id/like', authenticate, toggleLikeProperty);

// Saved Searches
router.get('/saved-searches', authenticate, getSavedSearches);
router.post('/saved-searches', authenticate, createSavedSearch);
router.delete('/saved-searches/:id', authenticate, deleteSavedSearch);

// Dynamic Category Attributes & Schemas
router.get('/categories/config', getCategoryConfigs);
router.post('/categories/config', authenticate, checkRole(['admin']), saveCategoryConfig);

// Admin: Verification Queue & Audit Logs
router.get('/admin/verification-queue', authenticate, checkRole(['admin']), getVerificationQueue);
router.patch('/admin/:id/verification', authenticate, checkRole(['admin']), updatePropertyVerification);
router.get('/admin/audit-logs', authenticate, checkRole(['admin']), getAuditLogs);

export default router;
