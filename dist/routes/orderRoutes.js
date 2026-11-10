"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, orderController_1.getAllOrders);
router.get('/stats', auth_1.authenticate, orderController_1.getOrderStatistics);
router.get('/my', auth_1.authenticate, orderController_1.getMyOrders);
router.get('/:id', auth_1.authenticate, orderController_1.getOrder);
router.post('/', auth_1.authenticate, orderController_1.createOrder);
router.patch('/:id/status', auth_1.authenticate, orderController_1.updateOrderStatus);
router.delete('/:id', auth_1.authenticate, orderController_1.deleteOrder);
exports.default = router;
