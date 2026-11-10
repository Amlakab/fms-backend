import express from 'express';
import {
  getMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
} from '../controllers/menuController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = express.Router();

// Any authenticated user can read menus (needed for sidebar + dialog)
router.get('/', authenticate, getMenus);
router.get('/:menuId', authenticate, getMenu);

// Only admin can mutate menus
router.post('/', authenticate, requireAdmin, createMenu);
router.put('/:menuId', authenticate, requireAdmin, updateMenu);
router.delete('/:menuId', authenticate, requireAdmin, deleteMenu);

export default router;