import { Prisma, Product } from '@prisma/client';
import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';

export class ProductsRepository {
  /**
   * Fetch all products with pagination and filters
   */
  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const whereCondition: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.category && { category: options.category }),
      ...(options.search && {
        OR: [
          { name: { contains: options.search, mode: 'insensitive' } },
          { category: { contains: options.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where: whereCondition,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where: whereCondition }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find product by ID
   */
  async findById(tenantId: string, id: string): Promise<Product> {
    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Produk tidak ditemukan', 404);
    }

    return product;
  }

  /**
   * Find product by name
   */
  async findByName(tenantId: string, name: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: {
        name,
        tenantId,
        deletedAt: null,
      },
    });
  }

  /**
   * Create new product
   */
  async create(
    tenantId: string,
    data: {
      name: string;
      category: string;
      price: number;
      stock: number;
      sku?: string;
      description?: string;
    }
  ): Promise<Product> {
    // Check for duplicate name
    const existing = await this.findByName(tenantId, data.name);
    if (existing) {
      throw new AppError(
        'PRODUCT_DUPLICATE',
        'Produk dengan nama ini sudah ada',
        409
      );
    }

    return prisma.product.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Update product
   */
  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string;
      category: string;
      price: number;
      stock: number;
      sku: string;
      description: string;
    }>
  ): Promise<Product> {
    // Verify product exists
    await this.findById(tenantId, id);

    // Check for duplicate name if updating name
    if (data.name) {
      const existing = await prisma.product.findFirst({
        where: {
          name: data.name,
          tenantId,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(
          'PRODUCT_DUPLICATE',
          'Nama produk sudah digunakan',
          409
        );
      }
    }

    return prisma.product.update({
      where: { id },
      data,
    });
  }

  /**
   * Update product stock
   */
  async updateStock(
    tenantId: string,
    id: string,
    quantityChange: number
  ): Promise<Product> {
    const product = await this.findById(tenantId, id);

    const newStock = product.stock + quantityChange;
    if (newStock < 0) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        'Stok tidak cukup untuk transaksi ini',
        400
      );
    }

    return prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
  }

  /**
   * Get low stock products
   */
  async getLowStock(tenantId: string, threshold: number = 10) {
    return prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        stock: { lte: threshold },
      },
      orderBy: { stock: 'asc' },
    });
  }

  /**
   * Get products by category
   */
  async findByCategory(
    tenantId: string,
    category: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const whereCondition: Prisma.ProductWhereInput = {
      tenantId,
      category,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where: whereCondition,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where: whereCondition }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all unique categories
   */
  async getCategories(tenantId: string): Promise<string[]> {
    const result = await prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: { category: true },
      distinct: ['category'],
    });

    return result.map((r) => r.category).filter(Boolean);
  }

  /**
   * Soft delete product
   */
  async delete(tenantId: string, id: string): Promise<Product> {
    await this.findById(tenantId, id);

    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Hard delete product (admin only)
   */
  async hardDelete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);

    await prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Get product statistics
   */
  async getStats(tenantId: string) {
    const [total, lowStock, categories] = await Promise.all([
      prisma.product.count({
        where: { tenantId, deletedAt: null },
      }),
      prisma.product.count({
        where: { tenantId, deletedAt: null, stock: { lte: 10 } },
      }),
      prisma.product.findMany({
        where: { tenantId, deletedAt: null },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    const totalValue = await prisma.product.aggregate({
      where: { tenantId, deletedAt: null },
      _sum: { price: true },
    });

    return {
      total,
      lowStock,
      categories: categories.length,
      totalInventoryValue: totalValue._sum.price || 0,
    };
  }

  /**
   * Bulk update stock levels
   */
  async bulkUpdateStock(
    tenantId: string,
    updates: Array<{ id: string; stock: number }>
  ): Promise<void> {
    const validIds = await prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        id: { in: updates.map((u) => u.id) },
      },
      select: { id: true },
    });

    const validIdSet = new Set(validIds.map((p) => p.id));
    const invalidIds = updates
      .map((u) => u.id)
      .filter((id) => !validIdSet.has(id));

    if (invalidIds.length > 0) {
      throw new AppError(
        'INVALID_PRODUCT_IDS',
        `Produk tidak ditemukan: ${invalidIds.join(', ')}`,
        404
      );
    }

    await Promise.all(
      updates.map((update) =>
        prisma.product.update({
          where: { id: update.id },
          data: { stock: update.stock },
        })
      )
    );
  }
}

export const productsRepository = new ProductsRepository();