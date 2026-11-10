import express from 'express';
import multer from 'multer';
import {
  getAllHouses,
  getHouse,
  createHouse,
  updateHouse,
  deleteHouse,
  approveHouse,
  updateHouseStatus,
  getHouseStatistics,
  getFilterOptions,
  incrementView,
  getAdminHouseImage,
  debugHouseImage,
  getAdminHouseModel
} from '../controllers/houseController';
import {
  submitRentalApplication,
  getRentalApplications,
  getRentalApplicationById,
  updateRentalApplicationStatus,
  deleteRentalApplication
} from '../controllers/rentalApplicationController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB
    fieldSize: 50 * 1024 * 1024 // Also increase field size
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'images') {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const isValid = allowedTypes.test(file.mimetype);
      if (!isValid) {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        return;
      }
      cb(null, true);
    } else if (file.fieldname === 'threeDModels') {
      const allowedTypes = /gltf|glb|obj/;
      const isValid = allowedTypes.test(file.mimetype) || 
                      file.originalname.endsWith('.glb') ||
                      file.originalname.endsWith('.gltf') ||
                      file.originalname.endsWith('.obj');
      if (!isValid) {
        cb(new Error('Only 3D model files are allowed (.glb, .gltf, .obj)'));
        return;
      }
      cb(null, true);
    } else {
      cb(new Error('Unexpected field'));
      return;
    }
  }
});

// ─── RENTAL LEASE APPLICATIONS ───────────────────────────────
router.post('/apply', optionalAuth, submitRentalApplication);
router.get('/applications', authenticate, getRentalApplications);
router.get('/applications/:id', authenticate, getRentalApplicationById);
router.patch('/applications/:id', authenticate, updateRentalApplicationStatus);
router.delete('/applications/:id', authenticate, checkRole(['admin', 'manager']), deleteRentalApplication);

router.get('/', authenticate, getAllHouses);
router.get('/stats', authenticate, checkRole(['admin', 'owner', 'agent', 'manager']), getHouseStatistics);
router.get('/filter-options', authenticate, getFilterOptions);
router.get('/:id', authenticate, getHouse);
router.get('/:id/view', incrementView);
// Get house image for admin
router.get('/:id/image', getAdminHouseImage);
router.get('/:id/model', getAdminHouseModel);
router.get('/:id/debug-image', authenticate, debugHouseImage);

router.post(
  '/',
  authenticate,
  checkRole(['admin', 'owner', 'agent', 'manager']),
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'threeDModels', maxCount: 5 }
  ]),
  createHouse
);

router.put(
  '/:id',
  authenticate,
  checkRole(['admin', 'owner', 'agent', 'manager']),
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'threeDModels', maxCount: 5 }
  ]),
  updateHouse
);

router.patch(
  '/:id/approve',
  authenticate,
  checkRole(['admin']),
  approveHouse
);

router.patch(
  '/:id/status',
  authenticate,
  checkRole(['admin', 'owner', 'agent', 'manager']),
  updateHouseStatus
);

router.delete(
  '/:id',
  authenticate,
  checkRole(['admin', 'owner', 'agent', 'manager']),
  deleteHouse
);

export default router;