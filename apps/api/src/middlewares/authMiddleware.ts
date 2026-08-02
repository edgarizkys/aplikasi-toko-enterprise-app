import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

export interface AuthPayload {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'staff' | 'cashier';
  name: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      tenantId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token tidak ditemukan', 'AUTH_MISSING_TOKEN', 401);
    }

    const token = authHeader.slice(7);

    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    req.user = decoded;
    req.tenantId = decoded.tenantId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token sudah kadaluarsa', 'AUTH_TOKEN_EXPIRED', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Token tidak valid', 'AUTH_INVALID_TOKEN', 401);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Autentikasi gagal', 'AUTH_FAILED', 401);
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
      req.user = decoded;
      req.tenantId = decoded.tenantId;
    }

    next();
  } catch (error) {
    next();
  }
};

export const requireRole = (...roles: AuthPayload['role'][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Autentikasi diperlukan', 'AUTH_REQUIRED', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Akses ditolak. Role tidak sesuai', 'AUTH_INSUFFICIENT_PERMISSION', 403);
    }

    next();
  };
};

export const generateAccessToken = (payload: Omit<AuthPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: Omit<AuthPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyRefreshToken = (token: string): AuthPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as AuthPayload;
  } catch (error) {
    throw new AppError('Refresh token tidak valid', 'AUTH_INVALID_REFRESH_TOKEN', 401);
  }
};

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !req.tenantId) {
    throw new AppError('Tenant context tidak ditemukan', 'AUTH_MISSING_TENANT', 401);
  }

  if (req.user.tenantId !== req.tenantId) {
    throw new AppError('Akses ke tenant lain ditolak', 'AUTH_TENANT_MISMATCH', 403);
  }

  next();
};