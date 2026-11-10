"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.post('/register', auth_1.authenticate, userController_1.createUser);
// Protected  routes (require authentication)
router.get('/stats', auth_1.authenticate, userController_1.getUserStatistics);
router.get('/', auth_1.authenticate, userController_1.getAllUsers);
router.get('/:userId', auth_1.authenticate, userController_1.getUser);
router.put('/:userId', auth_1.authenticate, userController_1.updateUser);
router.patch('/:userId/status', auth_1.authenticate, userController_1.updateUserStatus);
router.delete('/:userId', auth_1.authenticate, userController_1.deleteUser);
router.put('/change-password', auth_1.authenticate, userController_1.changePassword);
router.get('/:userId/permissions', auth_1.authenticate, userController_1.getUserPermissions);
router.put('/:userId/permissions', auth_1.authenticate, userController_1.updateUserPermissions);
exports.default = router;
