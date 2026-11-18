import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';
import { env } from '../config/environment.js';

/**
 * Set HTTP-Only Refresh Token Cookie
 */
const setRefreshTokenCookie = (res, token) => {
  res.cookie(env.cookie.refreshTokenName, token, env.cookie.options);
};

/**
 * Clear Refresh Token Cookie
 */
const clearRefreshTokenCookie = (res) => {
  res.clearCookie(env.cookie.refreshTokenName, {
    path: env.cookie.options.path,
  });
};

/**
 * @desc    Register a new Organization and its initial Org Admin
 * @route   POST /api/auth/register-org
 * @access  Public
 */
export const registerOrganization = asyncHandler(async (req, res) => {
  const {
    organizationName,
    organizationSlug,
    organizationCode,
    organizationType,
    adminName,
    adminEmail,
    adminPassword,
    contactEmail,
  } = req.body;

  // Basic Validation
  if (
    !organizationName ||
    !organizationSlug ||
    !organizationCode ||
    !adminName ||
    !adminEmail ||
    !adminPassword
  ) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Please provide all required organization and admin details.',
      error: { code: 'VALIDATION_ERROR' },
    });
  }

  // Check slug uniqueness
  const slugClean = organizationSlug.trim().toLowerCase();
  const codeClean = organizationCode.trim().toUpperCase();

  const existingOrg = await Organization.findOne({
    $or: [{ slug: slugClean }, { code: codeClean }],
  });

  if (existingOrg) {
    const isSlugMatch = existingOrg.slug === slugClean;
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.CONFLICT,
      message: isSlugMatch
        ? `Organization workspace slug '${slugClean}' is already taken.`
        : `Organization access code '${codeClean}' is already registered.`,
      error: { code: 'ORGANIZATION_EXISTS' },
    });
  }

  // Create Organization
  const organization = await Organization.create({
    name: organizationName.trim(),
    slug: slugClean,
    code: codeClean,
    type: organizationType || 'COLLEGE_UNIVERSITY',
    contactEmail: (contactEmail || adminEmail).trim().toLowerCase(),
  });

  // Create initial ORG_ADMIN user
  const adminUser = await User.create({
    organizationId: organization._id,
    name: adminName.trim(),
    email: adminEmail.trim().toLowerCase(),
    password: adminPassword,
    role: ROLES.ORG_ADMIN,
  });

  // Generate tokens
  const accessToken = generateAccessToken(adminUser, organization);
  const refreshToken = generateRefreshToken(adminUser);

  setRefreshTokenCookie(res, refreshToken);

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Organization workspace and administrator account created successfully.',
    data: {
      user: adminUser.toSafeObject(),
      organization: organization.toSafeObject(),
      accessToken,
    },
  });
});

/**
 * @desc    Register a Candidate/Student under an Organization
 * @route   POST /api/auth/register-candidate
 * @access  Public
 */
export const registerCandidate = asyncHandler(async (req, res) => {
  const {
    organizationIdentifier, // slug or code
    name,
    email,
    password,
    studentId,
    department,
    phone,
  } = req.body;

  if (!organizationIdentifier || !name || !email || !password) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Organization identifier, name, email, and password are required.',
      error: { code: 'VALIDATION_ERROR' },
    });
  }

  // Find organization by slug or code
  const identifier = organizationIdentifier.trim();
  const organization = await Organization.findOne({
    $or: [{ slug: identifier.toLowerCase() }, { code: identifier.toUpperCase() }],
  });

  if (!organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: `Organization '${identifier}' does not exist.`,
      error: { code: 'TENANT_NOT_FOUND' },
    });
  }

  if (organization.status !== 'ACTIVE') {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: 'This organization workspace is not accepting new registrations.',
      error: { code: 'TENANT_INACTIVE' },
    });
  }

  if (!organization.settings.allowSelfRegistration) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message:
        'Self-registration is disabled for this organization. Please contact your administrator.',
      error: { code: 'SELF_REGISTRATION_DISABLED' },
    });
  }

  // Check if candidate already registered in this organization
  const emailClean = email.trim().toLowerCase();
  const existingUser = await User.findOne({
    email: emailClean,
    organizationId: organization._id,
  });

  if (existingUser) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.CONFLICT,
      message: 'An account with this email address already exists in this organization.',
      error: { code: 'EMAIL_ALREADY_REGISTERED' },
    });
  }

  // Create Candidate
  const candidateUser = await User.create({
    organizationId: organization._id,
    name: name.trim(),
    email: emailClean,
    password,
    role: ROLES.CANDIDATE,
    profile: {
      studentId: studentId ? studentId.trim() : '',
      department: department ? department.trim() : '',
      phone: phone ? phone.trim() : '',
    },
  });

  const accessToken = generateAccessToken(candidateUser, organization);
  const refreshToken = generateRefreshToken(candidateUser);

  setRefreshTokenCookie(res, refreshToken);

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Candidate account created successfully.',
    data: {
      user: candidateUser.toSafeObject(),
      organization: organization.toSafeObject(),
      accessToken,
    },
  });
});

/**
 * @desc    Authenticate User (Admin, Proctor, or Candidate)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, organizationIdentifier } = req.body;

  if (!email || !password) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Please provide both email and password.',
      error: { code: 'CREDENTIALS_REQUIRED' },
    });
  }

  const emailClean = email.trim().toLowerCase();

  // If organization identifier is provided, resolve organization first
  let organization = null;
  if (organizationIdentifier) {
    const ident = organizationIdentifier.trim();
    organization = await Organization.findOne({
      $or: [{ slug: ident.toLowerCase() }, { code: ident.toUpperCase() }],
    });

    if (!organization) {
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: `Organization '${organizationIdentifier}' was not found.`,
        error: { code: 'TENANT_NOT_FOUND' },
      });
    }
  }

  // Build query
  const query = { email: emailClean };
  if (organization) {
    query.organizationId = organization._id;
  }

  // Find user with password included
  const user = await User.findOne(query).select('+password');

  if (!user) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Invalid email address or password.',
      error: { code: 'INVALID_CREDENTIALS' },
    });
  }

  // Validate Password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Invalid email address or password.',
      error: { code: 'INVALID_CREDENTIALS' },
    });
  }

  // Check User Status
  if (user.status !== 'ACTIVE') {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: `Account is ${user.status.toLowerCase()}. Please contact your administrator.`,
      error: { code: 'ACCOUNT_SUSPENDED' },
    });
  }

  // Fetch or verify Organization status
  if (!organization && user.organizationId) {
    organization = await Organization.findById(user.organizationId);
  }

  if (organization && organization.status !== 'ACTIVE') {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: `Organization workspace is currently ${organization.status.toLowerCase()}. Access denied.`,
      error: { code: 'TENANT_INACTIVE' },
    });
  }

  // Update Last Login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate Tokens
  const accessToken = generateAccessToken(user, organization);
  const refreshToken = generateRefreshToken(user);

  setRefreshTokenCookie(res, refreshToken);

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Authentication successful. Welcome to REVITEST.',
    data: {
      user: user.toSafeObject(),
      organization: organization ? organization.toSafeObject() : null,
      accessToken,
    },
  });
});

/**
 * @desc    Refresh Access Token using HTTP-Only Refresh Cookie
 * @route   POST /api/auth/refresh
 * @access  Public (Requires Refresh Token)
 */
export const refreshSession = asyncHandler(async (req, res) => {
  const refreshToken =
    req.cookies?.[env.cookie.refreshTokenName] || req.body?.refreshToken;

  if (!refreshToken) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Refresh token is missing. Please log in again.',
      error: { code: 'REFRESH_TOKEN_MISSING' },
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId).select('+tokenVersion');
    if (!user) {
      clearRefreshTokenCookie(res);
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'User session has expired.',
        error: { code: 'USER_NOT_FOUND' },
      });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      clearRefreshTokenCookie(res);
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Session has been invalidated. Please log in again.',
        error: { code: 'TOKEN_REVOKED' },
      });
    }

    let organization = null;
    if (user.organizationId) {
      organization = await Organization.findById(user.organizationId);
    }

    // Generate new Access Token
    const newAccessToken = generateAccessToken(user, organization);

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Session refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        user: user.toSafeObject(),
        organization: organization ? organization.toSafeObject() : null,
      },
    });
  } catch {
    clearRefreshTokenCookie(res);
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Invalid or expired refresh token. Please sign in again.',
      error: { code: 'INVALID_REFRESH_TOKEN' },
    });
  }
});

/**
 * @desc    Log out current session
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = asyncHandler(async (req, res) => {
  clearRefreshTokenCookie(res);

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out successfully.',
    data: null,
  });
});

/**
 * @desc    Get Current Authenticated User & Workspace
 * @route   GET /api/auth/me
 * @access  Private (Authenticated)
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'User profile not found.',
      error: { code: 'USER_NOT_FOUND' },
    });
  }

  let organization = null;
  if (user.organizationId) {
    organization = await Organization.findById(user.organizationId);
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'User session verified.',
    data: {
      user: user.toSafeObject(),
      organization: organization ? organization.toSafeObject() : null,
    },
  });
});
