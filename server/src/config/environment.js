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

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/revitest',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  appName: 'REVITEST',
  appVersion: '1.0.0-phase1',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200, // max 200 requests per 15 mins per IP
  },
};
