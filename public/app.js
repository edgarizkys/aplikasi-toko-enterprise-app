I'll generate the production-ready Express.js backend for the Toko Enterprise application. This will be chunked according to the mandatory protocol.

**First chunk - app.js (lines 1-300):**
<function_calls>
<invoke name="write_to_file">
<parameter name="file_path">app.js</parameter>
<parameter name="content">import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize Turso SQLite Client
const db = createClient({
  url: process.env.TURSO_CONNECTION_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.',
});

app.use(limiter);

// Tenant middleware
app.use((req, res, next) => {
  req.tenantId = req.headers['x-tenant-id'] || 'default';
  next();
});

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database initialization
const initializeDatabase = async () => {
  try {
    // Products table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        reorder_point INTEGER NOT NULL DEFAULT 5,
        supplier_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        order_date DATE NOT NULL,
        total_amount REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        delivery_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Customers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        credit_limit REAL NOT NULL,
        credit_used REAL DEFAULT 0,
        payment_terms TEXT,
        tax_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Suppliers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        payment_terms TEXT,
        rating REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Invoices table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        invoice_number TEXT UNIQUE NOT NULL,
        order_id INTEGER NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);

    // Order items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Payments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        invoice_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_date DATE NOT NULL,
        reference_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
      )
    `);

    // Create indices
    await db.execute('CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id)');

    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    throw error;
  }
};

// Helper: Get paginated query
const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page || 1));
  const limit = Math.min(100, parseInt(req.query.limit || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Helper: Format response
const formatResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

// ===== PRODUCTS ENDPOINTS =====

// Get all products with pagination
app.get('/api/products', asyncHandler(async (req, res) => {
  const { limit, offset } = getPaginationParams(req);
  const { category, status } = req.query;

  let query = 'SELECT * FROM products WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const products = await db.execute({
    sql: query,
    args: params,
  });

  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM products WHERE tenant_id = ?',
    args: [req.tenantId],
  });

  const total = countResult.rows[0].total;

  res.json(formatResponse(
    {
      items: products.rows,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
    'Produk berhasil diambil'
  ));
}));

// Get product by ID
app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (!result.rows.length) {
    return res.status(404).json(formatResponse(
      null,
      'Produk tidak ditemukan',
      404
    ));
  }

  res.json(formatResponse(result.rows[0], 'Produk ditemukan'));
}));

// Create product
app.post('/api/products', asyncHandler(async (req, res) => {
  const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;

  if (!sku || !name || !category || !price) {
    return res.status(400).json(formatResponse(
      null,
      'SKU, nama, kategori, dan harga harus diisi',
      400
    ));
  }

  const result = await db.execute({
    sql: `INSERT INTO products (tenant_id, sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [req.tenantId, sku, name, category, description || null, price, cost || 0, stock || 0, reorder_point || 5, supplier_id || null, status || 'active'],
  });

  res.status(201).json(formatResponse(
    { id: result.lastInsertRowid, ...req.body },
    'Produk berhasil dibuat'
  ));
}));

// Update product
app.put('/api/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;

  // Check if product exists
  const existing = await db.execute({
    sql: 'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
    args: [id, req.tenantId],
  });

  if (!existing.rows.length) {
    return res.status(404).json(formatResponse(null, 'Produk tidak ditemukan', 404));
  }

  await db.execute({
    sql: `UPDATE products SET sku = ?, name = ?, category = ?, description = ?, price = ?, cost = ?, stock = ?, reorder_point = ?, supplier_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND tenant_id = ?`,
    args: [sku, name, category, description || null, price, cost || 0, stock || 0, reorder_point || 5, supplier_id || null, status || 'active', id, req.tenantId],
  });

  res.json(formatResponse(req.body, 'Produk berhasil diperbarui'));
}));

// Delete product
app.delete('/api/products/:id', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'DELETE FROM products WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (result.rowsAffected === 0) {
    return res.status(404).json(formatResponse(null, 'Produk tidak ditemukan', 404));
  }

  res.json(formatResponse(null, 'Produk berhasil dihapus'));
}));

// Get low stock products
app.get('/api/products/alerts/low-stock', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM products WHERE tenant_id = ? AND stock <= reorder_point ORDER BY stock ASC',
    args: [req.tenantId],
  });

  res.json(formatResponse(result.rows, 'Data stok rendah berhasil diambil'));
}));
</parameter>
</invoke>
</function_calls>

**Second chunk - app.js (lines 301-600, appending):**
<function_calls>
<invoke name="file_append">
<parameter name="file_path">app.js</parameter>
<parameter name="content">
// ===== CUSTOMERS ENDPOINTS =====

// Get all customers
app.get('/api/customers', asyncHandler(async (req, res) => {
  const { limit, offset } = getPaginationParams(req);
  const { status, city } = req.query;

  let query = 'SELECT * FROM customers WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (city) {
    query += ' AND city = ?';
    params.push(city);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const customers = await db.execute({
    sql: query,
    args: params,
  });

  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM customers WHERE tenant_id = ?',
    args: [req.tenantId],
  });

  const total = countResult.rows[0].total;

  res.json(formatResponse(
    {
      items: customers.rows,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
    'Pelanggan berhasil diambil'
  ));
}));

// Get customer by ID
app.get('/api/customers/:id', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM customers WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (!result.rows.length) {
    return res.status(404).json(formatResponse(null, 'Pelanggan tidak ditemukan', 404));
  }

  res.json(formatResponse(result.rows[0], 'Pelanggan ditemukan'));
}));

// Create customer
app.post('/api/customers', asyncHandler(async (req, res) => {
  const { company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status } = req.body;

  if (!company_name || !email || !phone || !address || !city || credit_limit === undefined) {
    return res.status(400).json(formatResponse(
      null,
      'Nama perusahaan, email, telepon, alamat, kota, dan batas kredit harus diisi',
      400
    ));
  }

  const result = await db.execute({
    sql: `INSERT INTO customers (tenant_id, company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [req.tenantId, company_name, contact_person || null, email, phone, address, city, credit_limit, payment_terms || null, tax_id || null, status || 'active'],
  });

  res.status(201).json(formatResponse(
    { id: result.lastInsertRowid, ...req.body },
    'Pelanggan berhasil dibuat'
  ));
}));

// Update customer
app.put('/api/customers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status } = req.body;

  const existing = await db.execute({
    sql: 'SELECT * FROM customers WHERE id = ? AND tenant_id = ?',
    args: [id, req.tenantId],
  });

  if (!existing.rows.length) {
    return res.status(404).json(formatResponse(null, 'Pelanggan tidak ditemukan', 404));
  }

  await db.execute({
    sql: `UPDATE customers SET company_name = ?, contact_person = ?, email = ?, phone = ?, address = ?, city = ?, credit_limit = ?, payment_terms = ?, tax_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND tenant_id = ?`,
    args: [company_name, contact_person || null, email, phone, address, city, credit_limit, payment_terms || null, tax_id || null, status || 'active', id, req.tenantId],
  });

  res.json(formatResponse(req.body, 'Pelanggan berhasil diperbarui'));
}));

// Delete customer
app.delete('/api/customers/:id', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'DELETE FROM customers WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (result.rowsAffected === 0) {
    return res.status(404).json(formatResponse(null, 'Pelanggan tidak ditemukan', 404));
  }

  res.json(formatResponse(null, 'Pelanggan berhasil dihapus'));
}));

// Get customers with exceeded credit
app.get('/api/customers/alerts/credit-exceeded', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM customers WHERE tenant_id = ? AND credit_used >= credit_limit ORDER BY credit_used DESC',
    args: [req.tenantId],
  });

  res.json(formatResponse(result.rows, 'Data pelanggan melebihi batas kredit berhasil diambil'));
}));

// ===== SUPPLIERS ENDPOINTS =====

// Get all suppliers
app.get('/api/suppliers', asyncHandler(async (req, res) => {
  const { limit, offset } = getPaginationParams(req);
  const { status } = req.query;

  let query = 'SELECT * FROM suppliers WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY rating DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const suppliers = await db.execute({
    sql: query,
    args: params,
  });

  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM suppliers WHERE tenant_id = ?',
    args: [req.tenantId],
  });

  const total = countResult.rows[0].total;

  res.json(formatResponse(
    {
      items: suppliers.rows,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
    'Supplier berhasil diambil'
  ));
}));

// Get supplier by ID
app.get('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (!result.rows.length) {
    return res.status(404).json(formatResponse(null, 'Supplier tidak ditemukan', 404));
  }

  res.json(formatResponse(result.rows[0], 'Supplier ditemukan'));
}));

// Create supplier
app.post('/api/suppliers', asyncHandler(async (req, res) => {
  const { supplier_name, contact_person, email, phone, address, payment_terms, rating, status } = req.body;

  if (!supplier_name || !email || !phone || !address) {
    return res.status(400).json(formatResponse(
      null,
      'Nama supplier, email, telepon, dan alamat harus diisi',
      400
    ));
  }

  const result = await db.execute({
    sql: `INSERT INTO suppliers (tenant_id, supplier_name, contact_person, email, phone, address, payment_terms, rating, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [req.tenantId, supplier_name, contact_person || null, email, phone, address, payment_terms || null, rating || 0, status || 'active'],
  });

  res.status(201).json(formatResponse(
    { id: result.lastInsertRowid, ...req.body },
    'Supplier berhasil dibuat'
  ));
}));

// Update supplier
app.put('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { supplier_name, contact_person, email, phone, address, payment_terms, rating, status } = req.body;

  const existing = await db.execute({
    sql: 'SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?',
    args: [id, req.tenantId],
  });

  if (!existing.rows.length) {
    return res.status(404).json(formatResponse(null, 'Supplier tidak ditemukan', 404));
  }

  await db.execute({
    sql: `UPDATE suppliers SET supplier_name = ?, contact_person = ?, email = ?, phone = ?, address = ?, payment_terms = ?, rating = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND tenant_id = ?`,
    args: [supplier_name, contact_person || null, email, phone, address, payment_terms || null, rating || 0, status || 'active', id, req.tenantId],
  });

  res.json(formatResponse(req.body, 'Supplier berhasil diperbarui'));
}));

// Delete supplier
app.delete('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'DELETE FROM suppliers WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (result.rowsAffected === 0) {
    return res.status(404).json(formatResponse(null, 'Supplier tidak ditemukan', 404));
  }

  res.json(formatResponse(null, 'Supplier berhasil dihapus'));
}));
</parameter>
</invoke>
</function_calls>

**Third chunk - app.js (lines 601-900, appending):**
<function_calls>
<invoke name="file_append">
<parameter name="file_path">app.js</parameter>
<parameter name="content">
// ===== ORDERS ENDPOINTS =====

// Get all orders
app.get('/api/orders', asyncHandler(async (req, res) => {
  const { limit, offset } = getPaginationParams(req);
  const { status, customer_id } = req.query;

  let query = 'SELECT * FROM orders WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (customer_id) {
    query += ' AND customer_id = ?';
    params.push(customer_id);
  }

  query += ' ORDER BY order_date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const orders = await db.execute({
    sql: query,
    args: params,
  });

  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM orders WHERE tenant_id = ?',
    args: [req.tenantId],
  });

  const total = countResult.rows[0].total;

  res.json(formatResponse(
    {
      items: orders.rows,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    },
    'Pesanan berhasil diambil'
  ));
}));

// Get order by ID with items
app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const orderResult = await db.execute({
    sql: 'SELECT * FROM orders WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (!orderResult.rows.length) {
    return res.status(404).json(formatResponse(null, 'Pesanan tidak ditemukan', 404));
  }

  const itemsResult = await db.execute({
    sql: 'SELECT * FROM order_items WHERE order_id = ?',
    args: [req.params.id],
  });

  const order = orderResult.rows[0];
  order.items = itemsResult.rows;

  res.json(formatResponse(order, 'Pesanan ditemukan'));
}));

// Create order
app.post('/api/orders', asyncHandler(async (req, res) => {
  const { order_number, customer_id, order_date, items, discount = 0, tax = 0, payment_method, delivery_date } = req.body;

  if (!order_number || !customer_id || !order_date || !items || !Array.isArray(items)) {
    return res.status(400).json(formatResponse(
      null,
      'Nomor pesanan, ID pelanggan, tanggal pesanan, dan item harus diisi',
      400
    ));
  }

  // Calculate total
  let totalAmount = 0;
  for (const item of items) {
    totalAmount += (item.quantity * item.unit_price);
  }

  const finalAmount = totalAmount - discount + tax;

  const orderResult = await db.execute({
    sql: `INSERT INTO orders (tenant_id, order_number, customer_id, order_date, total_amount, discount, tax, final_amount, status, payment_method, delivery_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [req.tenantId, order_number, customer_id, order_date, totalAmount, discount, tax, finalAmount, 'pending', payment_method || null, delivery_date || null],
  });

  const orderId = orderResult.lastInsertRowid;

  // Insert order items
  for (const item of items) {
    await db.execute({
      sql: `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
            VALUES (?, ?, ?, ?, ?)`,
      args: [orderId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price],
    });

    // Update product stock
    await db.execute({
      sql: 'UPDATE products SET stock = stock - ? WHERE id = ?',
      args: [item.quantity, item.product_id],
    });
  }

  res.status(201).json(formatResponse(
    { id: orderId, order_number, customer_id, total_amount: totalAmount, discount, tax, final_amount: finalAmount, status: 'pending' },
    'Pesanan berhasil dibuat'
  ));
}));

// Update order
app.put('/api/orders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, payment_method, delivery_date } = req.body;

  const existing = await db.execute({
    sql: 'SELECT * FROM orders WHERE id = ? AND tenant_id = ?',
    args: [id, req.tenantId],
  });

  if (!existing.rows.length) {
    return res.status(404).json(formatResponse(null, 'Pesanan tidak ditemukan', 404));
  }

  await db.execute({
    sql: `UPDATE orders SET status = ?, payment_method = ?, delivery_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND tenant_id = ?`,
    args: [status || existing.rows[0].status, payment_method || existing.rows[0].payment_method, delivery_date || existing.rows[0].delivery_date, id, req.tenantId],
  });

  res.json(formatResponse(req.body, 'Pesanan berhasil diperbarui'));
}));

// Delete order
app.delete('/api/orders/:id', asyncHandler(async (req, res) => {
  const result = await db.execute({
    sql: 'DELETE FROM orders WHERE id = ? AND tenant_id = ?',
    args: [req.params.id, req.tenantId],
  });

  if (result.rowsAffected === 0) {
    return res.status(404).json(formatResponse(null, 'Pesanan tidak ditemukan', 404));
  }

  // Delete related items
  await db.execute({
    sql: 'DELETE FROM order_items WHERE order_id = ?',
    args: [req.params.id],
  });

  res.json(formatResponse(null, 'Pesanan berhasil dihapus'));
}));

// ===== INVOICES ENDPOINTS =====

// Get all invoices
app.get('/api/invoices', asyncHandler(async (req, res) => {
  const { limit, offset } = getPaginationParams(req);
  const { status, order_id } = req.query;

  let query = 'SELECT * FROM invoices WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (status) {
    query