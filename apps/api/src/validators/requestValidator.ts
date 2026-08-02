import { z } from 'zod';

// ============================================================================
// PRODUCTS VALIDATION
// ============================================================================

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nama produk harus diisi').max(100),
  category: z.string().min(1, 'Kategori harus diisi').max(50),
  price: z.number().positive('Harga harus lebih dari 0'),
  stock: z.number().int().nonnegative('Stok tidak boleh negatif'),
});

export const updateProductSchema = createProductSchema.partial();

export const getProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(['name', 'price', 'stock', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const productParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const updateStockSchema = z.object({
  quantity: z.number().int(),
  type: z.enum(['add', 'reduce']),
  reason: z.string().optional(),
});

// ============================================================================
// SALES VALIDATION
// ============================================================================

export const createSaleSchema = z.object({
  product_name: z.string().min(1, 'Nama produk harus diisi').max(100),
  quantity: z.number().int().positive('Kuantitas harus lebih dari 0'),
  total: z.number().positive('Total harus lebih dari 0'),
  date: z.string().datetime().optional().or(z.string().date()).default(() => new Date().toISOString().split('T')[0]),
  customerId: z.number().int().positive().optional(),
  paymentMethod: z.enum(['cash', 'card', 'transfer']).optional(),
  notes: z.string().max(255).optional(),
});

export const updateSaleSchema = createSaleSchema.partial();

export const getSalesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  productName: z.string().optional(),
  sortBy: z.enum(['date', 'total', 'quantity', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const saleParamSchema = z.object({
  saleId: z.coerce.number().int().positive(),
});

export const getSalesReportSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

// ============================================================================
// CUSTOMERS VALIDATION
// ============================================================================

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan harus diisi').max(100),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit').max(15),
  email: z.string().email('Format email tidak valid').optional(),
  address: z.string().max(255).optional(),
  points: z.number().int().nonnegative().default(0),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const getCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'points', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const customerParamSchema = z.object({
  customerId: z.coerce.number().int().positive(),
});

export const updateCustomerPointsSchema = z.object({
  points: z.number().int(),
  type: z.enum(['add', 'redeem']),
  reason: z.string().optional(),
});

export const redeemPointsSchema = z.object({
  points: z.number().int().positive('Poin harus lebih dari 0'),
  description: z.string().max(255).optional(),
});

// ============================================================================
// AUTHENTICATION VALIDATION
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const registerSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').regex(/[A-Z]/, 'Password harus mengandung huruf besar').regex(/[0-9]/, 'Password harus mengandung angka'),
  name: z.string().min(1, 'Nama harus diisi').max(100),
  storeName: z.string().min(1, 'Nama toko harus diisi').max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Token tidak valid'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini harus diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter').regex(/[A-Z]/, 'Password harus mengandung huruf besar').regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

// ============================================================================
// BARCODE VALIDATION
// ============================================================================

export const generateBarcodeSchema = z.object({
  productId: z.coerce.number().int().positive(),
  format: z.enum(['CODE128', 'CODE39', 'EAN13', 'QR']).default('CODE128'),
});

export const scanBarcodeSchema = z.object({
  barcode: z.string().min(1, 'Barcode tidak boleh kosong'),
});

// ============================================================================
// PAYMENT VALIDATION
// ============================================================================

export const processPaymentSchema = z.object({
  saleId: z.coerce.number().int().positive(),
  amount: z.number().positive('Jumlah pembayaran harus lebih dari 0'),
  method: z.enum(['cash', 'card', 'transfer', 'qris']),
  referenceNumber: z.string().optional(),
});

// ============================================================================
// EXPORT VALIDATION
// ============================================================================

export const exportReportSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv']).default('pdf'),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  entityType: z.enum(['sales', 'products', 'customers']),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;
export type ProductParam = z.infer<typeof productParamSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
export type GetSalesQuery = z.infer<typeof getSalesQuerySchema>;
export type SaleParam = z.infer<typeof saleParamSchema>;
export type GetSalesReportQuery = z.infer<typeof getSalesReportSchema>;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type GetCustomersQuery = z.infer<typeof getCustomersQuerySchema>;
export type CustomerParam = z.infer<typeof customerParamSchema>;
export type UpdateCustomerPointsInput = z.infer<typeof updateCustomerPointsSchema>;
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type GenerateBarcodeInput = z.infer<typeof generateBarcodeSchema>;
export type ScanBarcodeInput = z.infer<typeof scanBarcodeSchema>;

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type ExportReportInput = z.infer<typeof exportReportSchema>;