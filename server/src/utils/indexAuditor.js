import mongoose from 'mongoose';
import { logger } from './logger.js';

/**
 * Audits and ensures compound indexes across all registered Mongoose models
 * @returns {Promise<Object>}
 */
export const auditDatabaseIndexes = async () => {
  const modelNames = mongoose.modelNames();
  const report = {};

  for (const name of modelNames) {
    try {
      const model = mongoose.model(name);
      await model.init(); // ensure schema indexes are synchronized
      const indexes = await model.collection.indexes();
      report[name] = {
        modelName: name,
        count: indexes.length,
        indexes: indexes.map((idx) => ({
          name: idx.name,
          key: idx.key,
          unique: Boolean(idx.unique),
          partial: Boolean(idx.partialFilterExpression),
        })),
      };
    } catch (err) {
      report[name] = {
        modelName: name,
        error: err.message,
      };
    }
  }

  logger.info(`Audit complete: verified database indexes for ${modelNames.length} models.`);
  return report;
};
