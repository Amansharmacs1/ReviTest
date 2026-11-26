import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredVars = ['MONGODB_URI'];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.warn(
      `[CONFIG WARNING] Missing recommended environment variable: ${key}. Using fallback defaults if available.`
    );
  }
}

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  isDevelopment: !isProduction,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/revitest',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  appName: 'REVITEST',
  appVersion: '1.0.0',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200, // max 200 requests per 15 mins per IP
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      'revitest_dev_jwt_access_secret_super_secure_key_2026_xyz!',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'revitest_dev_jwt_refresh_secret_ultra_secure_key_2026_abc!',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || 'revitest_cookie_signing_dev_secret_key_9999',
    refreshTokenName: 'revitest_refresh_token',
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      path: '/api/auth', // restrict refresh cookie to auth endpoints
    },
  },
};

/**
 * Validates system environment variables and cryptographic key strengths
 * @returns {{ isValid: boolean, issues: string[], warnings: string[] }}
 */
export const validateEnvironment = () => {
  const issues = [];
  const warnings = [];

  if (!process.env.MONGODB_URI && !env.mongodbUri) {
    issues.push('MONGODB_URI is required.');
  }

  if (env.isProduction) {
    if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
      issues.push('JWT_ACCESS_SECRET must be at least 32 characters in production.');
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
      issues.push('JWT_REFRESH_SECRET must be at least 32 characters in production.');
    }
    if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 32) {
      issues.push('COOKIE_SECRET must be at least 32 characters in production.');
    }
  } else {
    if (!process.env.JWT_ACCESS_SECRET) {
      warnings.push('Using development default for JWT_ACCESS_SECRET.');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      warnings.push('Using development default for JWT_REFRESH_SECRET.');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  };
};
