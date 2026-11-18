import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [120, 'Organization name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Organization workspace slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        'Slug can only contain lowercase letters, numbers, and hyphens',
      ],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Organization access code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Organization code must be at least 3 characters'],
      maxlength: [16, 'Organization code cannot exceed 16 characters'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'COLLEGE_UNIVERSITY',
        'COACHING_INSTITUTE',
        'ENTERPRISE_RECRUITER',
        'ASSESSMENT_PROVIDER',
        'OTHER',
      ],
      default: 'COLLEGE_UNIVERSITY',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
      default: 'ACTIVE',
      index: true,
    },
    plan: {
      type: String,
      enum: ['FREE_TRIAL', 'PRO', 'ENTERPRISE'],
      default: 'FREE_TRIAL',
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    settings: {
      allowSelfRegistration: {
        type: Boolean,
        default: true,
      },
      maxConcurrentExaminees: {
        type: Number,
        default: 1000,
        min: 10,
        max: 50000,
      },
      requireProctoringByDefault: {
        type: Boolean,
        default: true,
      },
      defaultExamDurationMinutes: {
        type: Number,
        default: 60,
      },
      primaryColor: {
        type: String,
        default: '#2563EB',
      },
      logoUrl: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to sanitize organization before sending to client
organizationSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  return {
    _id: obj._id,
    name: obj.name,
    slug: obj.slug,
    code: obj.code,
    type: obj.type,
    status: obj.status,
    plan: obj.plan,
    contactEmail: obj.contactEmail,
    settings: obj.settings,
    createdAt: obj.createdAt,
  };
};

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
