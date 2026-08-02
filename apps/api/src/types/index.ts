import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import saleRoutes from './routes/sale.routes';
import customerRoutes from './routes/customer.routes';
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { tenantMiddleware } from './middleware/tenant.middleware';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Aplikasi Toko Enterprise',
    },
  });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);

// Protected routes with tenant middleware
app.use('/api/v1/products', authMiddleware, tenantMiddleware, productRoutes);
app.use('/api/v1/sales', authMiddleware, tenantMiddleware, saleRoutes);
app.use('/api/v1/customers', authMiddleware, tenantMiddleware, customerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route tidak ditemukan',
    },
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`✓ Aplikasi Toko Enterprise running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Database: ${process.env.DATABASE_URL?.split('@')[1] || 'local'}`);
});

export { app, prisma, server };