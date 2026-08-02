import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { validateRequest } from '../utils/validateRequest';

// Zod schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(255),
  category: z.string().min(1, 'Kategori wajib diisi').max(100),
  price: z.number().positive('Harga harus lebih dari 0'),
  stock: z.number().int().min(0, 'Stok tidak boleh negatif'),
  description: z.string().optional(),
  barcode: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
});

const productIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;
type ListProductsQuery = z.infer<typeof listProductsSchema>;

// Get all products with pagination, search, and filtering
export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const query = validateRequest(listProductsSchema, req.query);

  const { page, limit, category, search } = query;
  const offset = (page - 1) * limit;

  // Build where clause
  const where: any = {
    tenantId,
    deletedAt: null,
  };

  if (category) {
    where.category = {
      contains: category,
      mode: 'insensitive',
    };
  }

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        barcode: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        barcode: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.product.count({
      where,
    }),
  ]);

  res.json({
    success: true,
    data: products,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single product by ID
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = validateRequest(productIdSchema, req.params);

  const product = await prisma.product.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      barcode: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  res.json({
    success: true,
    data: product,
  });
});

// Create new product
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const body = validateRequest(createProductSchema, req.body);

  const existingProduct = await prisma.product.findFirst({
    where: {
      tenantId,
      barcode: body.barcode,
      deletedAt: null,
    },
  });

  if (existingProduct && body.barcode) {
    throw new AppError('Barcode sudah terdaftar', 409, 'BARCODE_ALREADY_EXISTS');
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      name: body.name,
      category: body.category,
      price: body.price,
      stock: body.stock,
      description: body.description,
      barcode: body.barcode,
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      barcode: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

// Update product
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = validateRequest(productIdSchema, req.params);
  const body = validateRequest(updateProductSchema, req.body);

  const product = await prisma.product.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  if (body.barcode && body.barcode !== product.barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: {
        tenantId,
        barcode: body.barcode,
        deletedAt: null,
        id: { not: id },
      },
    });

    if (existingBarcode) {
      throw new AppError('Barcode sudah terdaftar', 409, 'BARCODE_ALREADY_EXISTS');
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      ...body,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      barcode: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: updatedProduct,
  });
});

// Delete product (soft delete)
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = validateRequest(productIdSchema, req.params);

  const product = await prisma.product.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: { id, message: 'Produk berhasil dihapus' },
  });
});

// Update stock
export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = validateRequest(productIdSchema, req.params);

  const stockSchema = z.object({
    quantity: z.number().int().refine(
      (val) => val !== 0,
      'Jumlah tidak boleh 0',
    ),
    type: z.enum(['in', 'out']),
  });

  const { quantity, type } = validateRequest(stockSchema, req.body);

  const product = await prisma.product.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  const newStock = type === 'in' ? product.stock + quantity : product.stock - quantity;

  if (newStock < 0) {
    throw new AppError('Stok tidak cukup', 400, 'INSUFFICIENT_STOCK');
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      stock: newStock,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      stock: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: updatedProduct,
  });
});

// Get low stock products
export const getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

  const thresholdSchema = z.object({
    threshold: z.coerce.number().int().min(0).default(10),
  });

  const { threshold } = validateRequest(thresholdSchema, req.query);

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      deletedAt: null,
      stock: {
        lte: threshold,
      },
    },
    orderBy: {
      stock: 'asc',
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      barcode: true,
    },
  });

  res.json({
    success: true,
    data: products,
    meta: {
      total: products.length,
      threshold,
    },
  });
});