"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getProfile = exports.loginWithOtp = exports.sendOtp = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Menu_1 = __importDefault(require("../models/Menu"));
const otpGenerator_1 = require("../utils/otpGenerator");
const helpers_1 = require("../utils/helpers");
// ─── Helper: build the auth payload returned to the client ─────────
// Admin bypasses the grant gate: they receive every active menu whose
// allowedRoles includes 'admin'. Everyone else receives only their
// granted menus (populated Menu documents).
async function buildUserPayload(user) {
    let permissions;
    if (user.role === 'admin') {
        permissions = await Menu_1.default.find({
            isActive: true,
            allowedRoles: 'admin',
        }).sort({ order: 1 });
    }
    else {
        await user.populate('permissions');
        permissions = user.permissions;
    }
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        background: user.background,
        role: user.role,
        isActive: user.isActive,
        ownerId: user.ownerId,
        permissions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
// ─── Register ──────────────────────────────────────────────────────
const register = async (req, res) => {
    try {
        const { name, email, phone, background, password, role } = req.body;
        if (!name || !email || !phone || !password) {
            return (0, helpers_1.errorResponse)(res, 'Name, email, phone, and password are required', 400);
        }
        const existingUserByPhone = await User_1.default.findOne({ phone });
        if (existingUserByPhone) {
            return (0, helpers_1.errorResponse)(res, 'User already exists with this phone number', 400);
        }
        const existingUserByEmail = await User_1.default.findOne({ email });
        if (existingUserByEmail) {
            return (0, helpers_1.errorResponse)(res, 'User already exists with this email', 400);
        }
        // ownerId comes from the authenticated creator (admin) — required on User
        const ownerId = req.user?._id;
        const userData = {
            name,
            email,
            phone,
            background: background || '',
            password,
            role: role || 'user',
            ownerId,
        };
        const user = new User_1.default(userData);
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const payload = await buildUserPayload(user);
        (0, helpers_1.successResponse)(res, { token, user: payload }, 'Registration successful', 201);
    }
    catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.email) {
                return (0, helpers_1.errorResponse)(res, 'Email is already registered', 400);
            }
            if (error.keyPattern?.phone) {
                return (0, helpers_1.errorResponse)(res, 'Phone number is already registered', 400);
            }
        }
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.register = register;
// ─── Login (phone + password) ──────────────────────────────────────
const login = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User_1.default.findOne({ phone });
        if (!user) {
            return (0, helpers_1.errorResponse)(res, 'Invalid credentials', 400);
        }
        if (!user.isActive) {
            return (0, helpers_1.errorResponse)(res, 'Your account has been deactivated. Please contact support.', 403);
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return (0, helpers_1.errorResponse)(res, 'Invalid credentials', 400);
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const payload = await buildUserPayload(user);
        (0, helpers_1.successResponse)(res, { token, user: payload }, 'Login successful');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.login = login;
// ─── Send OTP ──────────────────────────────────────────────────────
const sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await User_1.default.findOne({ phone });
        if (!user) {
            return (0, helpers_1.errorResponse)(res, 'User not found', 404);
        }
        const otp = (0, otpGenerator_1.generateOTP)();
        (0, otpGenerator_1.storeOTP)(phone, otp);
        console.log(`OTP for ${phone}: ${otp}`);
        (0, helpers_1.successResponse)(res, { otp: process.env.NODE_ENV === 'development' ? otp : null }, 'OTP sent successfully');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.sendOtp = sendOtp;
// ─── Login with OTP ────────────────────────────────────────────────
const loginWithOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const user = await User_1.default.findOne({ phone });
        if (!user) {
            return (0, helpers_1.errorResponse)(res, 'User not found', 404);
        }
        if (!(0, otpGenerator_1.verifyOTP)(phone, otp)) {
            return (0, helpers_1.errorResponse)(res, 'Invalid or expired OTP', 400);
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const payload = await buildUserPayload(user);
        (0, helpers_1.successResponse)(res, { token, user: payload }, 'Login successful');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.loginWithOtp = loginWithOtp;
// ─── Get profile (used by /auth/me) ───────────────────────────────
const getProfile = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return (0, helpers_1.errorResponse)(res, 'User not found', 404);
        }
        // Re-fetch to guarantee we have the latest permissions + populate
        const fresh = await User_1.default.findById(user._id);
        if (!fresh) {
            return (0, helpers_1.errorResponse)(res, 'User not found', 404);
        }
        const payload = await buildUserPayload(fresh);
        (0, helpers_1.successResponse)(res, payload, 'Profile retrieved successfully');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.getProfile = getProfile;
// ─── Change password ──────────────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return (0, helpers_1.errorResponse)(res, 'User not found', 404);
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return (0, helpers_1.errorResponse)(res, 'Current password is incorrect', 400);
        }
        user.password = newPassword;
        await user.save();
        (0, helpers_1.successResponse)(res, null, 'Password updated successfully');
    }
    catch (error) {
        (0, helpers_1.errorResponse)(res, error.message, 500);
    }
};
exports.changePassword = changePassword;
