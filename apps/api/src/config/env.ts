// env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server configuration
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().url('Database URL must be a valid PostgreSQL connection string'),

  // JWT secrets
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // API configuration
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),

  // Pagination
  DEFAULT_PAGE_SIZE: z.coerce.number().default(20).max(100),
  MAX_PAGE_SIZE: z.coerce.number().default(100),

  // File upload
  MAX_FILE_SIZE: z.coerce.number().default(5242880), // 5MB
  UPLOAD_DIR: z.string().default('./uploads'),

  // Barcode
  BARCODE_PREFIX: z.string().default('TKO'),

  // Business rules
  LOYALTY_POINTS_MULTIPLIER: z.coerce.number().default(0.01), // 1 point per Rp 100
  TAX_RATE: z.coerce.number().default(0.1), // 10% tax
  MINIMUM_STOCK_THRESHOLD: z.coerce.number().default(10),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Features
  ENABLE_BARCODE_SCANNING: z.string().default('true').transform(v => v === 'true'),
  ENABLE_CUSTOMER_POINTS: z.string().default('true').transform(v => v === 'true'),
  ENABLE_MULTI_BRANCH: z.string().default('false').transform(v => v === 'true'),
});

type Environment = z.infer<typeof envSchema>;

let env: Environment;

export function loadEnv(): Environment {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  env = parsed.data;
  return env;
}

export function getEnv(): Environment {
  if (!env) {
    return loadEnv();
  }
  return env;
}

// Export individual env values with getters
export const config = {
  get nodeEnv() {
    return getEnv().NODE_ENV;
  },
  get port() {
    return getEnv().PORT;
  },
  get host() {
    return getEnv().HOST;
  },
  get databaseUrl() {
    return getEnv().DATABASE_URL;
  },
  get jwtAccessSecret() {
    return getEnv().JWT_ACCESS_SECRET;
  },
  get jwtRefreshSecret() {
    return getEnv().JWT_REFRESH_SECRET;
  },
  get jwtAccessExpiry() {
    return getEnv().JWT_ACCESS_EXPIRY;
  },
  get jwtRefreshExpiry() {
    return getEnv().JWT_REFRESH_EXPIRY;
  },
  get apiPrefix() {
    return getEnv().API_PREFIX;
  },
  get corsOrigin() {
    return getEnv().CORS_ORIGIN;
  },
  get encryptionKey() {
    return getEnv().ENCRYPTION_KEY;
  },
  get defaultPageSize() {
    return getEnv().DEFAULT_PAGE_SIZE;
  },
  get maxPageSize() {
    return getEnv().MAX_PAGE_SIZE;
  },
  get maxFileSize() {
    return getEnv().MAX_FILE_SIZE;
  },
  get uploadDir() {
    return getEnv().UPLOAD_DIR;
  },
  get barcodePrefix() {
    return getEnv().BARCODE_PREFIX;
  },
  get loyaltyPointsMultiplier() {
    return getEnv().LOYALTY_POINTS_MULTIPLIER;
  },
  get taxRate() {
    return getEnv().TAX_RATE;
  },
  get minimumStockThreshold() {
    return getEnv().MINIMUM_STOCK_THRESHOLD;
  },
  get logLevel() {
    return getEnv().LOG_LEVEL;
  },
  get enableBarcodeScanning() {
    return getEnv().ENABLE_BARCODE_SCANNING;
  },
  get enableCustomerPoints() {
    return getEnv().ENABLE_CUSTOMER_POINTS;
  },
  get enableMultiBranch() {
    return getEnv().ENABLE_MULTI_BRANCH;
  },
  get isDevelopment() {
    return getEnv().NODE_ENV === 'development';
  },
  get isProduction() {
    return getEnv().NODE_ENV === 'production';
  },
  get isTest() {
    return getEnv().NODE_ENV === 'test';
  },
};

export type { Environment };