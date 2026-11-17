import http from 'http';
import app from './app.js';
import { env } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

let server;

/**
 * Initialize application and start HTTP server
 */
const startServer = async () => {
  try {
    logger.info(`Starting ${env.appName} [Environment: ${env.nodeEnv}]...`);

    // Ensure database connection succeeds before listening for HTTP traffic
    await connectDatabase();

    const httpServer = http.createServer(app);

    server = httpServer.listen(env.port, () => {
      logger.info(`=======================================================`);
      logger.info(`  🚀 ${env.appName} API Server is running!`);
      logger.info(`  📡 Local:        http://localhost:${env.port}`);
      logger.info(`  🩺 Health Check: http://localhost:${env.port}/api/health`);
      logger.info(`  🗄️  DB Health:    http://localhost:${env.port}/api/health/db`);
      logger.info(`  🌐 Client URL:   ${env.clientUrl}`);
      logger.info(`=======================================================`);
    });

    server.on('error', (error) => {
      logger.error('HTTP Server runtime error:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal initialization error. Aborting server startup.', error);
    process.exit(1);
  }
};

/**
 * Handle graceful termination
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP Server closed to new incoming requests.');
      await disconnectDatabase();
      logger.info('Graceful shutdown completed successfully. Exiting.');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes more than 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown: Timed out waiting for connections to close.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Listen for process termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled exceptions and rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', promise);
  logger.error('Reason:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  gracefulShutdown('uncaughtException');
});

// Boot the server
startServer();
