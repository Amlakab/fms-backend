"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const router = express_1.default.Router();
router.post('/register', rateLimit_1.authLimiter, validation_1.validateRegistration, authController_1.register);
router.post('/login', rateLimit_1.authLimiter, validation_1.validateLogin, authController_1.login);
router.post('/send-otp', rateLimit_1.authLimiter, authController_1.sendOtp);
router.post('/login-otp', rateLimit_1.authLimiter, authController_1.loginWithOtp);
router.get('/profile', auth_1.authenticate, authController_1.getProfile);
router.put('/change-password', auth_1.authenticate, authController_1.changePassword);
exports.default = router;
