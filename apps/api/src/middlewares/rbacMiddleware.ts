import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'sales:create',
    'sales:read',
    'sales:update',
    'sales:delete',
    'customers:create',
    'customers:read',
    'customers:update',
    'customers:delete',
    'reports:read',
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'settings:manage',
  ],
  manager: [
    'products:create',
    'products:read',
    'products:update',
    'sales:create',
    'sales:read',
    'sales:update',
    'customers:create',
    'customers:read',
    'customers:update',
    'reports:read',
  ],
  staff: [
    'products:read',
    'sales:create',
    'sales:read',
    'customers:read',
    'customers:update',
  ],
  customer: ['sales:read', 'customers:read'],
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token tidak ditemukan', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);

    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw new AppError('Token telah kadaluarsa', 401, 'TOKEN_EXPIRED');
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      permissions: ROLE_PERMISSIONS[decoded.role] || [],
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Token tidak valid', 401, 'INVALID_TOKEN');
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Pengguna tidak terautentikasi', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        'Anda tidak memiliki akses ke resource ini',
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Pengguna tidak terautentikasi', 401, 'UNAUTHORIZED');
    }

    if (!req.user.permissions.includes(permission)) {
      throw new AppError(
        'Anda tidak memiliki izin untuk aksi ini',
        403,
        'PERMISSION_DENIED'
      );
    }

    next();
  };
};

export const checkTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AppError('Pengguna tidak terautentikasi', 401, 'UNAUTHORIZED');
  }

  const tenantIdParam =
    req.query.tenantId ||
    req.params.tenantId ||
    (req.body && req.body.tenantId);

  if (tenantIdParam && tenantIdParam !== req.user.tenantId) {
    throw new AppError(
      'Akses ke tenant ini ditolak',
      403,
      'TENANT_MISMATCH'
    );
  }

  next();
};

export const validateRole = (role: string): boolean => {
  return Object.keys(ROLE_PERMISSIONS).includes(role);
};

export const getPermissionsByRole = (role: string): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};