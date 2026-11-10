import express from 'express';
import {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStatistics,
  getMyOrders
} from '../controllers/orderController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getAllOrders);
router.get('/stats', authenticate, getOrderStatistics);
router.get('/my', authenticate, getMyOrders);
router.get('/:id', authenticate, getOrder);
router.post('/', authenticate, createOrder);
router.patch('/:id/status', authenticate, updateOrderStatus);
router.delete('/:id', authenticate, deleteOrder);

export default router;