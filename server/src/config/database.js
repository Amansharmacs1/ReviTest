import mongoose from 'mongoose';
import { env } from './environment.js';
import { logger } from '../utils/logger.js';

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Configure Mongoose event listeners
 */
const setupMongooseListeners = () => {
  mongoose.connection.on('connected', () => {
    logger.info(
      `MongoDB connected to: ${mongoose.connection.host}/${mongoose.connection.name}`
    );
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost. Attempting reconnection...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully.');
  });
};

/**
 * Connect to MongoDB database
 * @returns {Promise<typeof mongoose>}
 */
export const connectDatabase = async () => {
  setupMongooseListeners();

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50, // Scalable pool sizing for concurrent examination workloads
  };

  try {
    logger.info(`Attempting to connect to MongoDB...`);
    const conn = await mongoose.connect(env.mongodbUri, options);
    logger.info(`MongoDB connection established [Database: ${conn.connection.name}]`);
    return conn;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB at ${env.mongodbUri}`, error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database (for graceful shutdown)
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed cleanly.');
  } catch (error) {
    logger.error('Error during MongoDB disconnect:', error);
  }
};

/**
 * Check and report detailed MongoDB status
 * @returns {Promise<Object>}
 */
export const getDatabaseStatus = async () => {
  const readyState = mongoose.connection.readyState;
  const stateName = connectionStates[readyState] || 'unknown';
  const isConnected = readyState === 1;

  let pingMs = null;
  let error = null;

  if (isConnected && mongoose.connection.db) {
    try {
      const startTime = performance.now();
      await mongoose.connection.db.admin().ping();
      pingMs = Math.round(performance.now() - startTime);
    } catch (err) {
      error = err.message;
    }
  }

  return {
    connected: isConnected,
    state: stateName,
    readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    pingMs,
    ...(error && { error }),
    timestamp: new Date().toISOString(),
  };
};
