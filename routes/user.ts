import express from 'express';
import { 
  getAllUsers,
  createUser,
  updateUserStatus,
  deleteUser,
  getUserStatistics,
  getUser,
  changePassword,
  updateUser,
  updateUserPermissions,
  getUserPermissions
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register',  authenticate, createUser);

// Protected  routes (require authentication)
router.get('/stats', authenticate, getUserStatistics);
router.get('/', authenticate, getAllUsers);
router.get('/:userId', authenticate, getUser);
router.put('/:userId', authenticate, updateUser);
router.patch('/:userId/status', authenticate, updateUserStatus);
router.delete('/:userId', authenticate, deleteUser);
router.put('/change-password', authenticate, changePassword);
router.get('/:userId/permissions', authenticate, getUserPermissions);
router.put('/:userId/permissions', authenticate, updateUserPermissions);


export default router;