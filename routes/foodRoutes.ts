import express from 'express';
import multer from 'multer';
import {
  getAllFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  updateFoodStatus,
  toggleQuantityAvailable,
  incrementView,
  getFoodStatistics,
  getFilterOptions,
  getAvailableFoods,
  getPublicFood,
  getPublicFilterOptions,
  getFoodImageById
} from '../controllers/foodController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Public routes (No authentication required)
router.get('/public/available', getAvailableFoods);
router.get('/public/filter-options', getPublicFilterOptions);
router.get('/public/:id', getPublicFood);
router.get('/:id/view', incrementView);

// Get food image by ID (public access)
router.get('/:id/image', getFoodImageById);

// Protected routes (require authentcation)
router.get('/', authenticate, getAllFoods);
router.get('/filter-options', authenticate, getFilterOptions);
router.get('/stats', authenticate, getFoodStatistics);
router.get('/:id', authenticate, getFood);
router.post('/', authenticate, upload.single('image'), createFood);
router.put('/:id', authenticate, upload.single('image'), updateFood);
router.patch('/:id/status', authenticate, updateFoodStatus);
router.patch('/:id/quantity', authenticate, toggleQuantityAvailable);
router.delete('/:id', authenticate, deleteFood);

export default router;