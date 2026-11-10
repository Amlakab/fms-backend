"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes (if any)
router.get('/filter-options', auth_1.authenticate, walletController_1.getFilterOptions);
// Analytics routes
router.get('/stats/daily', auth_1.authenticate, walletController_1.getDailyStatistics);
router.get('/stats/weekly', auth_1.authenticate, walletController_1.getWeeklyStatistics);
router.get('/stats/monthly', auth_1.authenticate, walletController_1.getMonthlyStatistics);
router.get('/stats', auth_1.authenticate, walletController_1.getWalletStatistics);
// Export routes
router.get('/export', auth_1.authenticate, walletController_1.exportTransactions);
router.get('/export/pdf', auth_1.authenticate, walletController_1.exportToPDF);
// Transaction CRUD routes
router.get('/', auth_1.authenticate, walletController_1.getAllTransactions);
router.get('/:id', auth_1.authenticate, walletController_1.getTransaction);
router.post('/', auth_1.authenticate, walletController_1.createTransaction);
router.put('/:id', auth_1.authenticate, walletController_1.updateTransaction);
router.patch('/:id/status', auth_1.authenticate, walletController_1.updateTransactionStatus);
router.delete('/:id', auth_1.authenticate, walletController_1.deleteTransaction);
exports.default = router;
