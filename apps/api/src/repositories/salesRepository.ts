import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';

export class SalesRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    tenantId: string,
    data: Prisma.SalesCreateInput & { tenantId: string }
  ) {
    try {
      const sales = await this.prisma.sales.create({
        data: {
          ...data,
          tenantId,
        },
        include: {
          product: true,
          customer: true,
        },
      });
      return sales;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('DUPLICATE_ENTRY', 'Penjualan dengan data yang sama sudah ada', 409);
        }
        if (error.code === 'P2025') {
          throw new AppError('NOT_FOUND', 'Produk atau pelanggan tidak ditemukan', 404);
        }
      }
      throw error;
    }
  }

  async findById(tenantId: string, id: string) {
    try {
      const sales = await this.prisma.sales.findFirst({
        where: {
          id,
          tenantId,
          deletedAt: null,
        },
        include: {
          product: true,
          customer: true,
        },
      });

      if (!sales) {
        throw new AppError('NOT_FOUND', 'Penjualan tidak ditemukan', 404);
      }

      return sales;
    } catch (error) {
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      startDate?: Date;
      endDate?: Date;
      productId?: string;
      customerId?: string;
    } = {}
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        startDate,
        endDate,
        productId,
        customerId,
      } = options;

      const skip = (page - 1) * limit;

      const where: Prisma.SalesWhereInput = {
        tenantId,
        deletedAt: null,
        ...(startDate && { date: { gte: startDate } }),
        ...(endDate && { date: { lte: endDate } }),
        ...(productId && { productId }),
        ...(customerId && { customerId }),
      };

      const [sales, total] = await Promise.all([
        this.prisma.sales.findMany({
          where,
          include: {
            product: true,
            customer: true,
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        this.prisma.sales.count({ where }),
      ]);

      return {
        data: sales,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async update(tenantId: string, id: string, data: Prisma.SalesUpdateInput) {
    try {
      const sales = await this.prisma.sales.update({
        where: {
          id,
          tenantId,
        },
        data,
        include: {
          product: true,
          customer: true,
        },
      });
      return sales;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('NOT_FOUND', 'Penjualan tidak ditemukan', 404);
        }
      }
      throw error;
    }
  }

  async softDelete(tenantId: string, id: string) {
    try {
      const sales = await this.prisma.sales.update({
        where: {
          id,
          tenantId,
        },
        data: {
          deletedAt: new Date(),
        },
        include: {
          product: true,
          customer: true,
        },
      });
      return sales;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('NOT_FOUND', 'Penjualan tidak ditemukan', 404);
        }
      }
      throw error;
    }
  }

  async hardDelete(tenantId: string, id: string) {
    try {
      await this.prisma.sales.delete({
        where: {
          id,
          tenantId,
        },
      });
      return { success: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('NOT_FOUND', 'Penjualan tidak ditemukan', 404);
        }
      }
      throw error;
    }
  }

  async getSalesByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    options: { page?: number; limit?: number } = {}
  ) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.SalesWhereInput = {
        tenantId,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      const [sales, total] = await Promise.all([
        this.prisma.sales.findMany({
          where,
          include: {
            product: true,
            customer: true,
          },
          orderBy: {
            date: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.sales.count({ where }),
      ]);

      return {
        data: sales,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getTotalSalesByDateRange(tenantId: string, startDate: Date, endDate: Date) {
    try {
      const result = await this.prisma.sales.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          total: true,
          quantity: true,
        },
        _count: {
          id: true,
        },
      });

      return {
        totalRevenue: result._sum.total || 0,
        totalQuantity: result._sum.quantity || 0,
        totalTransactions: result._count.id,
      };
    } catch (error) {
      throw error;
    }
  }

  async getSalesByProduct(tenantId: string, productId: string, options: { page?: number; limit?: number } = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.SalesWhereInput = {
        tenantId,
        deletedAt: null,
        productId,
      };

      const [sales, total] = await Promise.all([
        this.prisma.sales.findMany({
          where,
          include: {
            product: true,
            customer: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.sales.count({ where }),
      ]);

      return {
        data: sales,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getSalesByCustomer(
    tenantId: string,
    customerId: string,
    options: { page?: number; limit?: number } = {}
  ) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const where: Prisma.SalesWhereInput = {
        tenantId,
        deletedAt: null,
        customerId,
      };

      const [sales, total] = await Promise.all([
        this.prisma.sales.findMany({
          where,
          include: {
            product: true,
            customer: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.sales.count({ where }),
      ]);

      return {
        data: sales,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getTopProducts(
    tenantId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      const where: Prisma.SalesWhereInput = {
        tenantId,
        deletedAt: null,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
      };

      const result = await this.prisma.sales.groupBy({
        by: ['productId'],
        where,
        _sum: {
          quantity: true,
          total: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });

      const topProducts = await Promise.all(
        result.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });
          return {
            product,
            totalQuantity: item._sum.quantity || 0,
            totalRevenue: item._sum.total || 0,
            transactionCount: item._count.id,
          };
        })
      );

      return topProducts;
    } catch (error) {
      throw error;
    }
  }

  async getSalesReport(
    tenantId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'day' | 'week' | 'month';
    } = {}
  ) {
    try {
      const { startDate, endDate, groupBy = 'day' } = filters;

      const where: Prisma.SalesWhereInput = {
        tenantId,
        deletedAt: null,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
      };

      const sales = await this.prisma.sales.findMany({
        where,
        include: {
          product: true,
          customer: true,
        },
        orderBy: {
          date: 'asc',
        },
      });

      const grouped = this.groupSalesReport(sales, groupBy);
      return grouped;
    } catch (error) {
      throw error;
    }
  }

  private groupSalesReport(
    sales: any[],
    groupBy: 'day' | 'week' | 'month'
  ) {
    const grouped: Record<string, any> = {};

    sales.forEach((sale) => {
      const date = new Date(sale.date);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week ${weekStart.toISOString().split('T')[0]}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          totalRevenue: 0,
          totalQuantity: 0,
          transactionCount: 0,
          sales: [],
        };
      }

      grouped[key].totalRevenue += sale.total;
      grouped[key].totalQuantity += sale.quantity;
      grouped[key].transactionCount += 1;
      grouped[key].sales.push(sale);
    });

    return Object.values(grouped);
  }
}