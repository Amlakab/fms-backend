"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewReportController_1 = require("../controllers/reviewReportController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const router = express_1.default.Router();
// Reviews
router.get('/house/:houseId', reviewReportController_1.getHouseReviews);
router.post('/house', auth_1.authenticate, reviewReportController_1.addReview);
router.patch('/:id/moderate', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), reviewReportController_1.moderateReview);
// Listing Reports (Scam / Misleading)
router.post('/report', reviewReportController_1.submitReport);
router.get('/admin/reports', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), reviewReportController_1.getListingReports);
router.patch('/admin/reports/:id', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), reviewReportController_1.updateReportStatus);
exports.default = router;
