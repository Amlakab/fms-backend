import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createAccountant,
  getAllAccountants,
  getAccountantById,
  getAccountantByAgentId,
  getAccountantForLease,
  getAccountantForHouse,
  updateAccountant,
  blockAccountant,
  blockAccount,
  deleteAccountant,
  deleteAllAccountants
} from '../controllers/accountantController';

const router = express.Router();

router.post('/', authenticate, createAccountant);
router.get('/', authenticate, getAllAccountants);
router.get('/agent/:agentId', authenticate, getAccountantByAgentId);
router.get('/for-lease/:leaseId', authenticate, getAccountantForLease);
router.get('/for-house/:houseId', authenticate, getAccountantForHouse);
router.get('/:id', authenticate, getAccountantById);
router.put('/:id', authenticate, updateAccountant);
router.patch('/:id/block', authenticate, blockAccountant);
router.patch('/:id/accounts/:accountId/block', authenticate, blockAccount);
router.delete('/:id', authenticate, deleteAccountant);
router.delete('/', authenticate, deleteAllAccountants);

export default router;