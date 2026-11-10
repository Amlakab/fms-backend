import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Menu from '../models/Menu';
import { generateOTP, storeOTP, verifyOTP } from '../utils/otpGenerator';
import { successResponse, errorResponse } from '../utils/helpers';

// ─── Helper: build the auth payload returned to the client ─────────
// Admin bypasses the grant gate: they receive every active menu whose
// allowedRoles includes 'admin'. Everyone else receives only their
// granted menus (populated Menu documents).
async function buildUserPayload(user: any) {
  let permissions;

  if (user.role === 'admin') {
    permissions = await Menu.find({
      isActive: true,
      allowedRoles: 'admin',
    }).sort({ order: 1 });
  } else {
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
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, background, password, role } = req.body;

    if (!name || !email || !phone || !password) {
      return errorResponse(res, 'Name, email, phone, and password are required', 400);
    }

    const existingUserByPhone = await User.findOne({ phone });
    if (existingUserByPhone) {
      return errorResponse(res, 'User already exists with this phone number', 400);
    }

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return errorResponse(res, 'User already exists with this email', 400);
    }

    // ownerId comes from the authenticated creator (admin) — required on User
    const ownerId = (req as any).user?._id;

    const userData: any = {
      name,
      email,
      phone,
      background: background || '',
      password,
      role: role || 'user',
      ownerId,
    };

    const user = new User(userData);
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const payload = await buildUserPayload(user);

    successResponse(
      res,
      { token, user: payload },
      'Registration successful',
      201
    );
  } catch (error: any) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return errorResponse(res, 'Email is already registered', 400);
      }
      if (error.keyPattern?.phone) {
        return errorResponse(res, 'Phone number is already registered', 400);
      }
    }
    errorResponse(res, error.message, 500);
  }
};

// ─── Login (phone + password) ──────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 400);
    }

    if (!user.isActive) {
      return errorResponse(
        res,
        'Your account has been deactivated. Please contact support.',
        403
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 400);
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const payload = await buildUserPayload(user);

    successResponse(res, { token, user: payload }, 'Login successful');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// ─── Send OTP ──────────────────────────────────────────────────────
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const otp = generateOTP();
    storeOTP(phone, otp);

    console.log(`OTP for ${phone}: ${otp}`);

    successResponse(
      res,
      { otp: process.env.NODE_ENV === 'development' ? otp : null },
      'OTP sent successfully'
    );
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// ─── Login with OTP ────────────────────────────────────────────────
export const loginWithOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (!verifyOTP(phone, otp)) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const payload = await buildUserPayload(user);

    successResponse(res, { token, user: payload }, 'Login successful');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// ─── Get profile (used by /auth/me) ───────────────────────────────
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Re-fetch to guarantee we have the latest permissions + populate
    const fresh = await User.findById(user._id);
    if (!fresh) {
      return errorResponse(res, 'User not found', 404);
    }

    const payload = await buildUserPayload(fresh);

    successResponse(res, payload, 'Profile retrieved successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

// ─── Change password ──────────────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById((req as any).user!._id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    successResponse(res, null, 'Password updated successfully');
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};