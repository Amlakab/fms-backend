// controllers/userController.ts
import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Menu from '../models/Menu';
import { PERMISSION_DEFAULTS_BY_ROLE } from '../config/permissionDefaults';

// ─────────────────────────────────────────────────────────────
// SCOPE HELPER
// admin / manager → global (no ownerId restriction)
// everyone else   → ownerId === their own _id
// ─────────────────────────────────────────────────────────────
const getScope = (req: Request) => {
  const user = (req as any).user;
  if (!user?._id) return { isGlobal: false, ownerId: null, ownerFilter: null as any };

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
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;

    const { ownerId, ownerFilter } = getScope(req);
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const query: any = { ...ownerFilter };

    if (role) query.role = role;

    if (status) {
      if (status === 'active') query.isActive = true;
      else if (status === 'inactive') query.isActive = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('permissions')
      .exec();

    const totalUsers = await User.countDocuments(query);

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
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE USER
// ─────────────────────────────────────────────────────────────
export const getUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { ownerId, ownerFilter } = getScope(req);
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const user = await User.findOne({ _id: userId, ...ownerFilter }).populate('permissions');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// CREATE USER
// admin/manager: ownerId can be supplied in body (or null for platform staff)
// owner/others: ownerId forced to their own _id
// ─────────────────────────────────────────────────────────────
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, background, password, role, ownerId: bodyOwnerId } = req.body;
    const { isGlobal, ownerId } = getScope(req);
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Global roles may target any owner (or platform-level user if omitted)
    const effectiveOwnerId = isGlobal
      ? (bodyOwnerId ?? null)
      : ownerId;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already exists' : 'Phone number already exists',
      });
    }

    const targetRole = role || 'user';

    // Derive permissions
    let permissions: any[] = [];
    if (Array.isArray(req.body.permissions) && req.body.permissions.length > 0) {
      const menus = await Menu.find({ _id: { $in: req.body.permissions } });
      permissions = menus.filter(m => m.allowedRoles.includes(targetRole)).map(m => m._id);
    } else {
      const defaultNames = PERMISSION_DEFAULTS_BY_ROLE[targetRole] ?? [];
      if (defaultNames.length > 0) {
        const menus = await Menu.find({ name: { $in: defaultNames }, isActive: true });
        permissions = menus.filter(m => m.allowedRoles.includes(targetRole)).map(m => m._id);
      }
    }

    const user = new User({
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
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE USER STATUS
// ─────────────────────────────────────────────────────────────
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const { ownerId, ownerFilter } = getScope(req);
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findOneAndUpdate(
      { _id: userId, ...ownerFilter },
      { isActive },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: user,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE USER
// ─────────────────────────────────────────────────────────────
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, background, role } = req.body;
    const { ownerId, ownerFilter, isGlobal } = getScope(req);
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findOne({ _id: userId, ...ownerFilter });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Global uniqueness checks
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }
    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: 'Phone number already exists' });
      }
    }

    const update: any = { name, email, phone, background, role };

    // Admin/manager may reassign owner; others cannot
    if (isGlobal && req.body.ownerId !== undefined) {
      update.ownerId = req.body.ownerId;
    }

    // If role changed, re-derive permissions (prevents stale elevated menus)
    if (role && role !== user.role) {
      const defaultNames = PERMISSION_DEFAULTS_BY_ROLE[role] ?? [];
      let permissions: any[] = [];
      if (defaultNames.length > 0) {
        const menus = await Menu.find({ name: { $in: defaultNames }, isActive: true });
        permissions = menus.filter(m => m.allowedRoles.includes(role)).map(m => m._id);
      }
      update.permissions = permissions;
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, ...ownerFilter },
      update,
      { new: true }
    ).populate('permissions');

    res.json({ success: true, data: updatedUser, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;
    const { ownerId, ownerFilter } = getScope(req);
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findOne({ _id: userId, ...ownerFilter });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE USER
// ─────────────────────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { ownerId, ownerFilter } = getScope(req);
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findOneAndDelete({ _id: userId, ...ownerFilter });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// USER STATISTICS
// ─────────────────────────────────────────────────────────────
export const getUserStatistics = async (req: Request, res: Response) => {
  try {
    const { ownerId, ownerFilter } = getScope(req);
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const totalUsers = await User.countDocuments(ownerFilter);
    const activeUsers = await User.countDocuments({ ...ownerFilter, isActive: true });
    const blockedUsers = await User.countDocuments({ ...ownerFilter, isActive: false });

    const roles = await User.aggregate([
      { $match: { ...ownerFilter } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: { totalUsers, activeUsers, blockedUsers, roles },
    });
  } catch (error: any) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET USER PERMISSIONS
// ─────────────────────────────────────────────────────────────
export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    const { ownerId, ownerFilter } = getScope(req);
    const { userId } = req.params;
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findOne({ _id: userId, ...ownerFilter })
      .select('role permissions')
      .populate('permissions');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: { _id: user._id, role: user.role, permissions: user.permissions },
    });
  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE USER PERMISSIONS
// ─────────────────────────────────────────────────────────────
export const updateUserPermissions = async (req: Request, res: Response) => {
  try {
    const { ownerId, ownerFilter } = getScope(req);
    const { userId } = req.params;
    const { permissions } = req.body;
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'permissions must be an array' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findOne({ _id: userId, ...ownerFilter });
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    const validIds = permissions.filter((id: string) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    const menus = await Menu.find({ _id: { $in: validIds } });

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
  } catch (error: any) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};