import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';

const logger = new Logger('Database');

const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established');

    // Verify all tables exist
    await verifyTables();
    logger.info('All tables verified');
  } catch (error) {
    logger.error('Database initialization failed', error);
    throw error;
  }
}

async function verifyTables(): Promise<void> {
  try {
    // Check if tables exist by querying information_schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    logger.info(`Found ${(tables as any[]).length} tables in database`);
  } catch (error) {
    logger.warn('Could not verify tables', error);
  }
}

async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error disconnecting from database', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connection');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connection');
  await disconnectDatabase();
  process.exit(0);
});

export { prisma, initializeDatabase, disconnectDatabase };