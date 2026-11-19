import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: function () {
        return this.role !== ROLES.SUPER_ADMIN;
      },
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CANDIDATE,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    profile: {
      studentId: {
        type: String,
        trim: true,
        default: '',
      },
      department: {
        type: String,
        trim: true,
        default: '',
      },
      phone: {
        type: String,
        trim: true,
        default: '',
      },
      avatarUrl: {
        type: String,
        default: '',
      },
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0, // For instantaneous token invalidation on password reset or logout
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee email uniqueness within an organization
userSchema.index({ email: 1, organizationId: 1 }, { unique: true });

// Performance indexes for organization-scoped member filtering, search, and sorting
userSchema.index({ organizationId: 1, role: 1, status: 1 });
userSchema.index({ organizationId: 1, createdAt: -1 });

// Pre-save password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to return safe user object (excluding password and version)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tokenVersion;
  return obj;
};

export const User = mongoose.model('User', userSchema);
export default User;
