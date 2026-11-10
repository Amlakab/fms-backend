"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const loanController_1 = require("../controllers/loanController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes (if any)
router.get('/filter-options', auth_1.authenticate, loanController_1.getFilterOptions);
// Protected routes
router.get('/', auth_1.authenticate, loanController_1.getAllLoans);
router.get('/stats', auth_1.authenticate, loanController_1.getLoanStatistics);
router.get('/:id', auth_1.authenticate, loanController_1.getLoan);
router.post('/', auth_1.authenticate, loanController_1.createLoan);
router.post('/bulk-mark-paid', auth_1.authenticate, loanController_1.bulkMarkAsPaid);
router.put('/:id', auth_1.authenticate, loanController_1.updateLoan);
router.patch('/:id/status', auth_1.authenticate, loanController_1.updateLoanStatus);
router.patch('/:id/mark-paid', auth_1.authenticate, loanController_1.markAsPaid);
router.delete('/:id', auth_1.authenticate, loanController_1.deleteLoan);
exports.default = router;
