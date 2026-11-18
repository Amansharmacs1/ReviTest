import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';

/**
 * Generate short-lived Access Token
 * @param {Object} user
 * @param {Object|null} organization
 * @returns {string}
 */
export const generateAccessToken = (user, organization = null) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
      ? user.organizationId.toString()
      : organization?._id?.toString() || null,
    orgSlug: organization?.slug || null,
  };

  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiry,
    issuer: env.appName,
  });
};

/**
 * Generate long-lived Refresh Token
 * @param {Object} user
 * @returns {string}
 */
export const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id.toString(),
    tokenVersion: user.tokenVersion || 0,
  };

  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
    issuer: env.appName,
  });
};

/**
 * Verify Access Token
 * @param {string} token
 * @returns {Object}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.accessSecret, { issuer: env.appName });
};

/**
 * Verify Refresh Token
 * @param {string} token
 * @returns {Object}
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwt.refreshSecret, { issuer: env.appName });
};

