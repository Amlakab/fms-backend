import express from 'express';
import { authenticate } from '../middleware/auth';
import { getAllBanks, createBank, updateBank, deleteBank } from '../controllers/bankController';

const router = express.Router();

router.get('/', authenticate, getAllBanks);
router.post('/', authenticate, createBank);     // add admin check if you want
router.put('/:id', authenticate, updateBank);
router.delete('/:id', authenticate, deleteBank);

export default router;