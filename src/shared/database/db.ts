import mongoose from 'mongoose';
import { config } from '../config';
import logger from '../utils/logger';
import { seedBasicPlan } from './seeders/planSeeder';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB');

    await seedBasicPlan();
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    logger.warn('Bot will continue without MongoDB - payment pages will still work');
    // Don't exit process, let the app continue
    // process.exit(1);
  }
}
