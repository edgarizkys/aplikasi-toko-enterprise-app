// src/utils/errorHandler.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} dengan ID ${id} tidak ditemukan` : `${resource} tidak ditemukan`;
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Akses tidak diizinkan') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Anda tidak memiliki izin untuk mengakses resource ini') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONFLICT', message, 409, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Terjadi kesalahan pada server', details?: Record<string, any>) {
    super('INTERNAL_SERVER_ERROR', message, 500, details);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Kesalahan database', details?: Record<string, any>) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('BAD_REQUEST', message, 400, details);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export const handlePrismaError = (error: any): AppError => {
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new ConflictError(`${field} sudah terdaftar dalam sistem`, { field });
  }
  if (error.code === 'P2025') {
    return new NotFoundError('Data');
  }
  if (error.code === 'P2003') {
    return new BadRequestError('Referensi data tidak valid');
  }
  return new DatabaseError('Kesalahan database tidak terduga', { prismaCode: error.code });
};

export const formatErrorResponse = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    };
  }

  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
    };
  }

  console.error('Unknown error:', error);
  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan yang tidak diketahui',
    },
  };
};

export const asyncHandler = (fn: Function) => {
  return (...args: any[]) => Promise.resolve(fn(...args)).catch(args[2]);
};