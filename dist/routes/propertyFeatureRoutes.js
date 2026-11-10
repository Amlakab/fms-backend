"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const propertyFeatureController_1 = require("../controllers/propertyFeatureController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const router = express_1.default.Router();
// Public / Authenticated Property Features
router.get('/tags/suggest', propertyFeatureController_1.getTagSuggestions);
router.get('/compare', propertyFeatureController_1.compareProperties);
router.get('/:id/similar', propertyFeatureController_1.getSimilarProperties);
router.post('/:id/like', auth_1.authenticate, propertyFeatureController_1.toggleLikeProperty);
// Saved Searches
router.get('/saved-searches', auth_1.authenticate, propertyFeatureController_1.getSavedSearches);
router.post('/saved-searches', auth_1.authenticate, propertyFeatureController_1.createSavedSearch);
router.delete('/saved-searches/:id', auth_1.authenticate, propertyFeatureController_1.deleteSavedSearch);
// Dynamic Category Attributes & Schemas
router.get('/categories/config', propertyFeatureController_1.getCategoryConfigs);
router.post('/categories/config', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), propertyFeatureController_1.saveCategoryConfig);
// Admin: Verification Queue & Audit Logs
router.get('/admin/verification-queue', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), propertyFeatureController_1.getVerificationQueue);
router.patch('/admin/:id/verification', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), propertyFeatureController_1.updatePropertyVerification);
router.get('/admin/audit-logs', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), propertyFeatureController_1.getAuditLogs);
exports.default = router;
