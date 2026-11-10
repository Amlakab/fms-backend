"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const foodController_1 = require("../controllers/foodController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
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
        }
        else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});
// Public routes (No authentication required)
router.get('/public/available', foodController_1.getAvailableFoods);
router.get('/public/filter-options', foodController_1.getPublicFilterOptions);
router.get('/public/:id', foodController_1.getPublicFood);
router.get('/:id/view', foodController_1.incrementView);
// Get food image by ID (public access)
router.get('/:id/image', foodController_1.getFoodImageById);
// Protected routes (require authentcation)
router.get('/', auth_1.authenticate, foodController_1.getAllFoods);
router.get('/filter-options', auth_1.authenticate, foodController_1.getFilterOptions);
router.get('/stats', auth_1.authenticate, foodController_1.getFoodStatistics);
router.get('/:id', auth_1.authenticate, foodController_1.getFood);
router.post('/', auth_1.authenticate, upload.single('image'), foodController_1.createFood);
router.put('/:id', auth_1.authenticate, upload.single('image'), foodController_1.updateFood);
router.patch('/:id/status', auth_1.authenticate, foodController_1.updateFoodStatus);
router.patch('/:id/quantity', auth_1.authenticate, foodController_1.toggleQuantityAvailable);
router.delete('/:id', auth_1.authenticate, foodController_1.deleteFood);
exports.default = router;
