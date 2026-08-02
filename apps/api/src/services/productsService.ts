import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { CreateProductSchema, UpdateProductSchema, GetProductsSchema } from '@/lib/validations/products';
import { z } from 'zod';

type CreateProductInput = z.infer<typeof CreateProductSchema>;
type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
type GetProductsInput = z.infer<typeof GetProductsSchema>;

export class ProductsService {
  async getAllProducts(tenantId: string, input: GetProductsInput) {
    try {
      const { page = 1, limit = 20, search, category } = input;
      const offset = (page - 1) * limit;

      const whereClause: Prisma.ProductWhereInput = {
        tenantId,
        deletedAt: null,
        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }),
        ...(category && {
          category: {
            contains: category,
            mode: 'insensitive',
          },
        }),
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
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
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.product.count({
          where: whereClause,
        }),
      ]);

      return {
        data: products,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        'Failed to fetch products',
        'PRODUCTS_FETCH_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async getProductById(tenantId: string, productId: number) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          stock: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!product) {
        throw new AppError('Produk tidak ditemukan', 'PRODUCT_NOT_FOUND', 404);
      }

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch product',
        'PRODUCT_FETCH_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async createProduct(tenantId: string, input: CreateProductInput) {
    try {
      const existingProduct = await prisma.product.findFirst({
        where: {
          tenantId,
          name: input.name,
          deletedAt: null,
        },
      });

      if (existingProduct) {
        throw new AppError(
          'Produk dengan nama yang sama sudah ada',
          'PRODUCT_DUPLICATE_NAME',
          409
        );
      }

      const product = await prisma.product.create({
        data: {
          tenantId,
          name: input.name,
          category: input.category,
          price: input.price,
          stock: input.stock,
        },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          stock: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to create product',
        'PRODUCT_CREATE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async updateProduct(
    tenantId: string,
    productId: number,
    input: UpdateProductInput
  ) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!product) {
        throw new AppError('Produk tidak ditemukan', 'PRODUCT_NOT_FOUND', 404);
      }

      if (input.name && input.name !== product.name) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            tenantId,
            name: input.name,
            deletedAt: null,
            NOT: {
              id: productId,
            },
          },
        });

        if (existingProduct) {
          throw new AppError(
            'Produk dengan nama yang sama sudah ada',
            'PRODUCT_DUPLICATE_NAME',
            409
          );
        }
      }

      const updatedProduct = await prisma.product.update({
        where: {
          id: productId,
        },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.category && { category: input.category }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.stock !== undefined && { stock: input.stock }),
        },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          stock: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedProduct;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update product',
        'PRODUCT_UPDATE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async deleteProduct(tenantId: string, productId: number) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!product) {
        throw new AppError('Produk tidak ditemukan', 'PRODUCT_NOT_FOUND', 404);
      }

      await prisma.product.update({
        where: {
          id: productId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to delete product',
        'PRODUCT_DELETE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async adjustStock(
    tenantId: string,
    productId: number,
    quantity: number,
    type: 'increase' | 'decrease'
  ) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!product) {
        throw new AppError('Produk tidak ditemukan', 'PRODUCT_NOT_FOUND', 404);
      }

      const newStock =
        type === 'increase' ? product.stock + quantity : product.stock - quantity;

      if (newStock < 0) {
        throw new AppError(
          'Stok tidak dapat negatif',
          'INVALID_STOCK_QUANTITY',
          400
        );
      }

      const updatedProduct = await prisma.product.update({
        where: {
          id: productId,
        },
        data: {
          stock: newStock,
        },
        select: {
          id: true,
          name: true,
          stock: true,
        },
      });

      return updatedProduct;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to adjust stock',
        'STOCK_ADJUST_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async getLowStockProducts(tenantId: string, threshold: number = 10) {
    try {
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
        },
      });

      return products;
    } catch (error) {
      throw new AppError(
        'Failed to fetch low stock products',
        'LOW_STOCK_FETCH_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async getProductsByCategory(
    tenantId: string,
    category: string,
    pagination: { page: number; limit: number }
  ) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: {
            tenantId,
            category: {
              contains: category,
              mode: 'insensitive',
            },
            deletedAt: null,
          },
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
          },
        }),
        prisma.product.count({
          where: {
            tenantId,
            category: {
              contains: category,
              mode: 'insensitive',
            },
            deletedAt: null,
          },
        }),
      ]);

      return {
        data: products,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        'Failed to fetch products by category',
        'PRODUCTS_BY_CATEGORY_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  async bulkUpdateStock(
    tenantId: string,
    updates: Array<{ productId: number; quantity: number; type: 'increase' | 'decrease' }>
  ) {
    try {
      const results = await Promise.all(
        updates.map((update) =>
          this.adjustStock(tenantId, update.productId, update.quantity, update.type)
        )
      );

      return results;
    } catch (error) {
      throw new AppError(
        'Failed to bulk update stock',
        'BULK_STOCK_UPDATE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }
}

export const productsService = new ProductsService();