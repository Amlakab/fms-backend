"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const houseController_1 = require("../controllers/houseController");
const rentalApplicationController_1 = require("../controllers/rentalApplicationController");
const auth_1 = require("../middleware/auth");
const roleCheck_1 = require("../middleware/roleCheck");
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
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
        }
        else if (file.fieldname === 'threeDModels') {
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
        }
        else {
            cb(new Error('Unexpected field'));
            return;
        }
    }
});
// ─── RENTAL LEASE APPLICATIONS ───────────────────────────────
router.post('/apply', auth_1.optionalAuth, rentalApplicationController_1.submitRentalApplication);
router.get('/applications', auth_1.authenticate, rentalApplicationController_1.getRentalApplications);
router.get('/applications/:id', auth_1.authenticate, rentalApplicationController_1.getRentalApplicationById);
router.patch('/applications/:id', auth_1.authenticate, rentalApplicationController_1.updateRentalApplicationStatus);
router.delete('/applications/:id', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'manager']), rentalApplicationController_1.deleteRentalApplication);
router.get('/', auth_1.authenticate, houseController_1.getAllHouses);
router.get('/stats', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'owner', 'agent', 'manager']), houseController_1.getHouseStatistics);
router.get('/filter-options', auth_1.authenticate, houseController_1.getFilterOptions);
router.get('/:id', auth_1.authenticate, houseController_1.getHouse);
router.get('/:id/view', houseController_1.incrementView);
// Get house image for admin
router.get('/:id/image', houseController_1.getAdminHouseImage);
router.get('/:id/model', houseController_1.getAdminHouseModel);
router.get('/:id/debug-image', auth_1.authenticate, houseController_1.debugHouseImage);
router.post('/', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'owner', 'agent', 'manager']), upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'threeDModels', maxCount: 5 }
]), houseController_1.createHouse);
router.put('/:id', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'owner', 'agent', 'manager']), upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'threeDModels', maxCount: 5 }
]), houseController_1.updateHouse);
router.patch('/:id/approve', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin']), houseController_1.approveHouse);
router.patch('/:id/status', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'owner', 'agent', 'manager']), houseController_1.updateHouseStatus);
router.delete('/:id', auth_1.authenticate, (0, roleCheck_1.checkRole)(['admin', 'owner', 'agent', 'manager']), houseController_1.deleteHouse);
exports.default = router;
