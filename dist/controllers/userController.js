"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPermissions = exports.getUserPermissions = exports.getUserStatistics = exports.deleteUser = exports.changePassword = exports.updateUser = exports.updateUserStatus = exports.createUser = exports.getUser = exports.getAllUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const Menu_1 = __importDefault(require("../models/Menu"));
const permissionDefaults_1 = require("../config/permissionDefaults");
// ─────────────────────────────────────────────────────────────
// SCOPE HELPER
// admin / manager → global (no ownerId restriction)
// everyone else   → ownerId === their own _id
// ─────────────────────────────────────────────────────────────
const getScope = (req) => {
    const user = req.user;
    if (!user?._id)
        return { isGlobal: false, ownerId: null, ownerFilter: null };
    const isGlobal = user.role === 'admin' || user.role === 'manager';
    return {
        isGlobal,
        ownerId: user._id,
        ownerFilter: isGlobal ? {} : { ownerId: user._id },
    };
};
// ─────────────────────────────────────────────────────────────
// GET ALL USERS
// ─────────────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
        const { ownerId, ownerFilter } = getScope(req);
        if (!ownerId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const query = { ...ownerFilter };
        if (role)
            query.role = role;
        if (status) {
            if (status === 'active')
                query.isActive = true;
            else if (status === 'inactive')
                query.isActive = false;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }
        const users = await User_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('permissions')
            .exec();
        const totalUsers = await User_1.default.countDocuments(query);
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(totalUsers / Number(limit)),
                    totalUsers,
                    hasNext: Number(page) * Number(limit) < totalUsers,
                    hasPrev: Number(page) > 1,
                },
            },
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllUsers = getAllUsers;
// ─────────────────────────────────────────────────────────────
// GET SINGLE USER
// ─────────────────────────────────────────────────────────────
const getUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { ownerId, ownerFilter } = getScope(req);
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }
        const user = await User_1.default.findOne({ _id: userId, ...ownerFilter }).populate('permissions');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUser = getUser;
// ─────────────────────────────────────────────────────────────
// CREATE USER
// admin/manager: ownerId can be supplied in body (or null for platform staff)
// owner/others: ownerId forced to their own _id
// ─────────────────────────────────────────────────────────────
const createUser = async (req, res) => {
    try {
        const { name, email, phone, background, password, role, ownerId: bodyOwnerId } = req.body;
        const { isGlobal, ownerId } = getScope(req);
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        // Global roles may target any owner (or platform-level user if omitted)
        const effectiveOwnerId = isGlobal
            ? (bodyOwnerId ?? null)
            : ownerId;
        const existingUser = await User_1.default.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? 'Email already exists' : 'Phone number already exists',
            });
        }
        const targetRole = role || 'user';
        // Derive permissions
        let permissions = [];
        if (Array.isArray(req.body.permissions) && req.body.permissions.length > 0) {
            const menus = await Menu_1.default.find({ _id: { $in: req.body.permissions } });
            permissions = menus.filter(m => m.allowedRoles.includes(targetRole)).map(m => m._id);
        }
        else {
            const defaultNames = permissionDefaults_1.PERMISSION_DEFAULTS_BY_ROLE[targetRole] ?? [];
            if (defaultNames.length > 0) {
                const menus = await Menu_1.default.find({ name: { $in: defaultNames }, isActive: true });
                permissions = menus.filter(m => m.allowedRoles.includes(targetRole)).map(m => m._id);
            }
        }
        const user = new User_1.default({
            name,
            email,
            phone,
            background,
            password,
            role: targetRole,
            ownerId: effectiveOwnerId,
            permissions,
            isActive: true,
        });
        await user.save();
        await user.populate('permissions');
        res.status(201).json({ success: true, data: user, message: 'User created successfully' });
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createUser = createUser;
// ─────────────────────────────────────────────────────────────
// UPDATE USER STATUS
// ─────────────────────────────────────────────────────────────
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        const { ownerId, ownerFilter } = getScope(req);
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const user = await User_1.default.findOneAndUpdate({ _id: userId, ...ownerFilter }, { isActive }, { new: true });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.json({
            success: true,
            data: user,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        });
    }
    catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
// ─────────────────────────────────────────────────────────────
// UPDATE USER
// ─────────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, phone, background, role } = req.body;
        const { ownerId, ownerFilter, isGlobal } = getScope(req);
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const user = await User_1.default.findOne({ _id: userId, ...ownerFilter });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        // Global uniqueness checks
        if (email && email !== user.email) {
            const existingEmail = await User_1.default.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
        }
        if (phone && phone !== user.phone) {
            const existingPhone = await User_1.default.findOne({ phone });
            if (existingPhone) {
                return res.status(400).json({ success: false, message: 'Phone number already exists' });
            }
        }
        const update = { name, email, phone, background, role };
        // Admin/manager may reassign owner; others cannot
        if (isGlobal && req.body.ownerId !== undefined) {
            update.ownerId = req.body.ownerId;
        }
        // If role changed, re-derive permissions (prevents stale elevated menus)
        if (role && role !== user.role) {
            const defaultNames = permissionDefaults_1.PERMISSION_DEFAULTS_BY_ROLE[role] ?? [];
            let permissions = [];
            if (defaultNames.length > 0) {
                const menus = await Menu_1.default.find({ name: { $in: defaultNames }, isActive: true });
                permissions = menus.filter(m => m.allowedRoles.includes(role)).map(m => m._id);
            }
            update.permissions = permissions;
        }
        const updatedUser = await User_1.default.findOneAndUpdate({ _id: userId, ...ownerFilter }, update, { new: true }).populate('permissions');
        res.json({ success: true, data: updatedUser, message: 'User updated successfully' });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUser = updateUser;
// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const { ownerId, ownerFilter } = getScope(req);
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const user = await User_1.default.findOne({ _id: userId, ...ownerFilter });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const salt = await bcryptjs_1.default.genSalt(10);
        user.password = await bcryptjs_1.default.hash(newPassword, salt);
        await user.save();
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.changePassword = changePassword;
// ─────────────────────────────────────────────────────────────
// DELETE USER
// ─────────────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { ownerId, ownerFilter } = getScope(req);
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const user = await User_1.default.findOneAndDelete({ _id: userId, ...ownerFilter });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteUser = deleteUser;
// ─────────────────────────────────────────────────────────────
// USER STATISTICS
// ─────────────────────────────────────────────────────────────
const getUserStatistics = async (req, res) => {
    try {
        const { ownerId, ownerFilter } = getScope(req);
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const totalUsers = await User_1.default.countDocuments(ownerFilter);
        const activeUsers = await User_1.default.countDocuments({ ...ownerFilter, isActive: true });
        const blockedUsers = await User_1.default.countDocuments({ ...ownerFilter, isActive: false });
        const roles = await User_1.default.aggregate([
            { $match: { ...ownerFilter } },
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        res.json({
            success: true,
            data: { totalUsers, activeUsers, blockedUsers, roles },
        });
    }
    catch (error) {
        console.error('Error getting user statistics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserStatistics = getUserStatistics;
// ─────────────────────────────────────────────────────────────
// GET USER PERMISSIONS
// ─────────────────────────────────────────────────────────────
const getUserPermissions = async (req, res) => {
    try {
        const { ownerId, ownerFilter } = getScope(req);
        const { userId } = req.params;
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        const user = await User_1.default.findOne({ _id: userId, ...ownerFilter })
            .select('role permissions')
            .populate('permissions');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.json({
            success: true,
            data: { _id: user._id, role: user.role, permissions: user.permissions },
        });
    }
    catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserPermissions = getUserPermissions;
// ─────────────────────────────────────────────────────────────
// UPDATE USER PERMISSIONS
// ─────────────────────────────────────────────────────────────
const updateUserPermissions = async (req, res) => {
    try {
        const { ownerId, ownerFilter } = getScope(req);
        const { userId } = req.params;
        const { permissions } = req.body;
        if (!ownerId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, message: 'permissions must be an array' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        const target = await User_1.default.findOne({ _id: userId, ...ownerFilter });
        if (!target)
            return res.status(404).json({ success: false, message: 'User not found' });
        const validIds = permissions.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        const menus = await Menu_1.default.find({ _id: { $in: validIds } });
        const allowedIds = menus
            .filter(m => m.allowedRoles.includes(target.role))
            .map(m => m._id);
        target.permissions = allowedIds;
        await target.save();
        await target.populate('permissions');
        res.json({
            success: true,
            data: { _id: target._id, role: target.role, permissions: target.permissions },
            message: 'Permissions updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserPermissions = updateUserPermissions;
