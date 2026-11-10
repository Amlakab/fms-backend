import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  background?: string;
  password: string;
  role:
    | 'user'
    | 'accountant'
    | 'admin'
    | 'customer'
    | 'manager'
    | 'owner'
    | 'agent';
  ownerId?: Types.ObjectId;
  permissions: Types.ObjectId[];
  isActive: boolean;
  isVerified: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  agencyName?: string;
  savedProperties: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^09\d{8}$/, 'Please enter a valid Ethiopian phone number'],
    },
    background: {
      type: String,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: [
        'user',
        'accountant',
        'admin',
        'customer',
        'manager',
        'owner',
        'agent',
      ],
      default: 'user',
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Menu',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
    },
    agencyName: String,
    savedProperties: [{
      type: Schema.Types.ObjectId,
      ref: 'House',
    }],
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);