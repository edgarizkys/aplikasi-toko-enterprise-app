I'll generate the production-ready Express.js backend for the Toko Enterprise application. Given the comprehensive feature set, I'll create a well-structured app.js with chunked writes.

Let me start with the initial chunk (imports, middleware, and database setup):
<function_calls>
<invoke name="write_to_file">
<parameter name="file_path">app.js</parameter>
<parameter name="content">const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const { createClient } = require('@libsql/client');
const path = require('path');

dotenv.config();

const app = express();

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL || 'file:./enterprise_store.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  req.tenantId = req.headers['x-tenant-id'] || 'default';
  next();
});

// ============================================================================
// DATABASE SCHEMA INITIALIZATION
// ============================================================================

async function initializeDatabase() {
  try {
    // Products table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        reorder_point INTEGER NOT NULL DEFAULT 0,
        supplier_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, sku)
      )
    `);

    // Orders table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        order_number TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL,
        order_date DATE NOT NULL,
        total_amount REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        delivery_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, order_number)
      )
    `);

    // Order items (line items)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
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
        credit_limit REAL NOT NULL DEFAULT 0,
        payment_terms TEXT,
        tax_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email)
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email)
      )
    `);

    // Invoices table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        invoice_number TEXT NOT NULL UNIQUE,
        order_id INTEGER NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        UNIQUE(tenant_id, invoice_number)
      )
    `);

    // Invoice payments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        invoice_id INTEGER NOT NULL,
        payment_date DATE NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT,
        reference_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
      )
    `);

    // Stock movements (audit trail)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference_id TEXT,
        reference_type TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Purchase orders
    await db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        po_number TEXT NOT NULL UNIQUE,
        supplier_id INTEGER NOT NULL,
        po_date DATE NOT NULL,
        delivery_date DATE,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        UNIQUE(tenant_id, po_number)
      )
    `);

    // Purchase order items
    await db.execute(`
      CREATE TABLE IF NOT EXISTS po_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        po_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Create indexes
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id)`);

    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatResponse = (success, data = null, message = null, error = null) => ({
  success,
  data,
  message,
  error,
  timestamp: new Date().toISOString(),
});

const handleError = (res, statusCode, message, error = null) => {
  console.error(`[Error] ${message}:`, error);
  return res.status(statusCode).json(formatResponse(false, null, message, error?.message));
};

const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// ============================================================================
// PRODUCTS ENDPOINTS
// ============================================================================

// Get all products with pagination
app.get('/api/products', async (req, res) => {
  try {
    const { limit, offset } = getPaginationParams(req.query);
    const { search, category, status } = req.query;

    let query = 'SELECT * FROM products WHERE tenant_id = ?1';
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE tenant_id = ?1';
    const params = [req.tenantId];

    if (search) {
      query += ' AND (name LIKE ?2 OR sku LIKE ?2)';
      countQuery += ' AND (name LIKE ?2 OR sku LIKE ?2)';
      params.push(`%${search}%`);
    }

    if (category) {
      query += ' AND category = ?' + (params.length + 1);
      countQuery += ' AND category = ?' + (params.length + 1);
      params.push(category);
    }

    if (status) {
      query += ' AND status = ?' + (params.length + 1);
      countQuery += ' AND status = ?' + (params.length + 1);
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    query += ' OFFSET ?';

    const result = await db.execute({
      sql: query,
      args: [...params, limit, offset],
    });

    const countResult = await db.execute({
      sql: countQuery,
      args: params,
    });

    const total = countResult.rows[0]?.total || 0;

    return res.json(formatResponse(true, {
      data: result.rows,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, 'Produk berhasil diambil'));
  } catch (error) {
    return handleError(res, 500, 'Gagal mengambil produk', error);
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ?1 AND tenant_id = ?2',
      args: [parseInt(req.params.id), req.tenantId],
    });

    if (!result.rows.length) {
      return res.status(404).json(formatResponse(false, null, 'Produk tidak ditemukan'));
    }

    return res.json(formatResponse(true, result.rows[0], 'Produk berhasil diambil'));
  } catch (error) {
    return handleError(res, 500, 'Gagal mengambil produk', error);
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;

    if (!sku || !name || !price || cost === undefined || stock === undefined) {
      return res.status(400).json(formatResponse(false, null, 'Field wajib diisi: sku, name, price, cost, stock'));
    }

    const result = await db.execute({
      sql: `INSERT INTO products 
        (tenant_id, sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      args: [req.tenantId, sku, name, category, description || '', price, cost, stock, reorder_point || 0, supplier_id || '', status || 'active'],
    });

    return res.status(201).json(formatResponse(true, { id: result.lastInsertRowid }, 'Produk berhasil dibuat'));
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json(formatResponse(false, null, 'SKU sudah terdaftar'));
    }
    return handleError(res, 500, 'Gagal membuat produk', error);
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;
    const productId = parseInt(req.params.id);

    // Verify product exists
    const checkResult = await db.execute({
      sql: 'SELECT id FROM products WHERE id = ?1 AND tenant_id = ?2',
      args: [productId, req.tenantId],
    });

    if (!checkResult.rows.length) {
      return res.status(404).json(formatResponse(false, null, 'Produk tidak ditemukan'));
    }

    const updates = [];
    const args = [];
    const fields = { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        args.push(value);
      }
    });

    if (!updates.length) {
      return res.status(400).json(formatResponse(false, null, 'Tidak ada data yang diupdate'));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(productId, req.tenantId);

    await db.execute({
      sql: `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      args,
    });

    return res.json(formatResponse(true, null, 'Produk berhasil diperbarui'));
  } catch (error) {
    return handleError(res, 500, 'Gagal memperbarui produk', error);
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    const result = await db.execute({
      sql: 'DELETE FROM products WHERE id = ?1 AND tenant_id = ?2',
      args: [productId, req.tenantId],
    });

    if (!result.changes) {
      return res.status(404).json(formatResponse(false, null, 'Produk tidak ditemukan'));
    }

    return res.json(formatResponse(true, null, 'Produk berhasil dihapus'));
  } catch (error) {
    return handleError(res, 500, 'Gagal menghapus produk', error);
  }
});
</parameter>
</invoke>
</function_calls>

Now I'll append the customers endpoints:
<function_calls>
<invoke name="write_to_file">
<parameter name="file_path">app.js</parameter>
<parameter name="content">
// ============================================================================
// CUSTOMERS ENDPOINTS
// ============================================================================

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const { limit, offset } = getPaginationParams(req.query);
    const { search, status, city } = req.query;

    let query = 'SELECT * FROM customers WHERE tenant_id = ?1';
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE tenant_id = ?1';
    const params = [req.tenantId];

    if (search) {
      query += ' AND (company_name LIKE ?2 OR contact_person LIKE ?2 OR email LIKE ?2)';
      countQuery += ' AND (company_name LIKE ?2 OR contact_person LIKE ?2 OR email LIKE ?2)';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND status = ?' + (params.length + 1);
      countQuery += ' AND status = ?' + (params.length + 1);
      params.push(status);
    }

    if (city) {
      query += ' AND city = ?' + (params.length + 1);
      countQuery += ' AND city = ?' + (params.length + 1);
      params.push(city);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const result = await db.execute({
      sql: query,
      args: [...params, limit, offset],
    });

    const countResult = await db.execute({
      sql: countQuery,
      args: params,
    });

    const total = countResult.rows[0]?.total || 0;

    return res.json(formatResponse(true, {
      data: result.rows,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, 'Pelanggan berhasil diambil'));
  } catch (error) {
    return handleError(res, 500, 'Gagal mengambil pelanggan', error);
  }
});

// Get single customer
app.get('/api/customers/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM customers WHERE id = ?1 AND tenant_id = ?2',
      args: [parseInt(req.params.id), req.tenantId],
    });

    if (!result.rows.length) {
      return res.status(404).json(formatResponse(false, null, 'Pelanggan tidak ditemukan'));
    }

    return res.json(formatResponse(true, result.rows[0], 'Pelanggan berhasil diambil'));
  } catch (error) {
    return handleError(res, 500, 'Gagal mengambil pelanggan', error);
  }
});

// Create customer
app.post('/api/customers', async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status } = req.body;

    if (!company_name || !contact_person || !email || !phone || !address || !city) {
      return res.status(400).json(formatResponse(false, null, 'Field wajib diisi'));
    }

    const result = await db.execute({
      sql: `INSERT INTO customers 
        (tenant_id, company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      args: [req.tenantId, company_name, contact_person, email, phone, address, city, credit_limit || 0, payment_terms || '', tax_id || '', status || 'active'],
    });

    return res.status(201).json(formatResponse(true, { id: result.lastInsertRowid }, 'Pelanggan berhasil dibuat'));
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json(formatResponse(false, null, 'Email sudah terdaftar'));
    }
    return handleError(res, 500, 'Gagal membuat pelanggan', error);
  }
});

// Update customer
app.put('/api/customers/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);

    const checkResult = await db.execute({
      sql: 'SELECT id FROM customers WHERE id = ?1 AND tenant_id = ?2',
      args: [customerId, req.tenantId],
    });

    if (!checkResult.rows.length) {
      return res.status(404).json(formatResponse(false, null, 'Pelanggan tidak ditemukan'));
    }

    const updates = [];
    const args = [];
    const fields = req.body;

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        args.push(value);
      }
    });

    if (!updates.length) {
      return res.status(400).json(formatResponse(false, null, 'Tidak ada data yang diupdate'));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(customerId, req.tenantId);

    await db.execute({
      sql: `UPDATE customers SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      args,
    });

    return res.json(formatResponse(true, null, 'Pelanggan berhasil diperbarui'));
  } catch (error) {
    return handleError(res, 500, 'Gagal memperbarui pelanggan', error);
  }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);

    const result = await db.execute({
      sql: 'DELETE FROM customers WHERE id = ?1 AND tenant_id = ?2',
      args: [customerId, req.tenantId],
    });

    if (!result.changes) {
      return res.status(404).json(formatResponse(false, null, 'Pelanggan tidak ditemukan'));
    }

    return res.json(formatResponse(true, null, 'Pelanggan berhasil dihapus'));
  } catch (error) {
    return handleError(res, 500, 'Gagal menghapus pelanggan', error);
  }
});

// ============================================================================
// SUPPLIERS ENDPOINTS
// ============================================================================

// Get all suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const { limit, offset } = getPaginationParams(req.query);
    const { search, status, minRating } = req.query;

    let query = 'SELECT * FROM suppliers WHERE tenant_id = ?1';
    let countQuery = 'SELECT COUNT(*) as total FROM suppliers WHERE tenant_id = ?1';
    const params = [req.tenantId];

    if (search) {
      query += ' AND (supplier_name LIKE ?2 OR contact_person LIKE ?2 OR email LIKE ?2)';
      countQuery += ' AND (supplier_name LIKE ?2 OR contact_person LIKE ?2 OR email LIKE ?2)';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND status = ?' + (params.length + 1);
      countQuery += ' AND status = ?' + (params.length + 1);
      params.push(status);
    }

    if (minRating) {
      query += ' AND rating >= ?' + (params.length + 1);
      countQuery += ' AND rating >= ?' + (params.length + 1);
      params.push(parseFloat(minRating));
    }

    query += ' ORDER BY rating DESC, created_at DESC LIMIT ? OFFSET ?';

    const result = await db.execute({
      sql: query,
      args: [...params, limit, offset],
    });

    const countResult = await db.execute({
      sql: countQuery,
      args: params,
    });

    const total = countResult.rows[0]?.total || 0;

    return res.json(formatResponse(true, {
      data: result.rows,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, 'Supplier berhasil diambil'));
  } catch (error) {
    return handleError(res, 500, 'Gagal mengambil supplier', error);
  }
});

// Get single supplier
app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM suppliers WHERE id = ?1 AND tenant_id = ?2',
      args: [parseInt(req.params.id), req.tenantId],
    });

    if (!result.rows.length) {
      return res.status(404).json(formatResponse(false, null, 'Supplier tidak ditemukan'));
    }

    return res.json(formatResponse(true, result.rows[0], 'Supplier berhasil diambil'));
  } catch (error) {
    return handleError(res, 500, 'Gagal mengambil supplier', error);
  }
});

// Create supplier
app.post('/api/suppliers', async (req, res) => {
  try {
    const { supplier_name, contact_person, email, phone, address, payment_terms, rating, status } = req.body;

    if (!supplier_name || !contact_person || !email || !phone || !address) {
      return res.status(400).json(formatResponse(false, null, 'Field wajib diisi'));
    }

    const result = await db.execute({
      sql: `INSERT INTO suppliers 
        (tenant_id, supplier_name, contact_person, email, phone, address, payment_terms, rating, status)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      args: [req.tenantId, supplier_name, contact_person, email, phone, address, payment_terms || '', rating || 0, status || 'active'],
    });

    return res.status(201).json(formatResponse(true, { id: result.lastInsertRowid }, 'Supplier berhasil dibuat'));
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json(formatResponse(false, null, 'Email supplier sudah terdaftar'));
    }
    return handleError(res, 500, 'Gagal membuat supplier', error);
  }
});

// Update supplier
app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);

    const checkResult = await db.execute({
      sql: 'SELECT id FROM suppliers WHERE id = ?1 AND tenant_id = ?2',
      args: [supplierId, req.tenantId],
    });

    if (!checkResult.rows.length) {
      return res.status(404).json(formatResponse(false, null, 'Supplier tidak ditemukan'));
    }

    const updates = [];
    const args = [];

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        args.push(value);
      }
    });

    if (!updates.length) {
      return res.status(400).json(formatResponse(false, null, 'Tidak ada data yang diupdate'));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    args.push(supplierId, req.tenantId);

    await db.execute({
      sql: `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      args,
    });

    return res.json(formatResponse(true, null, 'Supplier berhasil diperbarui'));
  } catch (error) {
    return handleError(res, 500, 'Gagal memperbarui supplier', error);
  }
});

// Delete supplier
app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);

    const result = await db.execute({
      sql: 'DELETE FROM suppliers WHERE id = ?1 AND tenant_id = ?2',
      args: [supplierId, req.tenantId],
    });

    if (!result.changes) {
      return res.status(404).json(formatResponse(false, null, 'Supplier tidak ditemukan'));
    }

    return res.json(formatResponse(true, null, 'Supplier berhasil dihapus'));
  } catch (error) {
    return handleError(res, 500, 'Gagal menghapus supplier', error);
  }
});
</parameter>
<parameter name="append">true</parameter>
</invoke>
</function_calls>

Now I'll append the orders endpoints:
<function_calls>
<invoke name="write_to_file">
<parameter name="file_path">app.js</parameter>
<parameter name="content">
// ============================================================================
// ORDERS ENDPOINTS
// ============================================================================

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const { limit, offset } = getPaginationParams(req.query);
    const { search, status, customer_id, from_date, to_date } = req.query;

    let query = 'SELECT * FROM orders WHERE tenant_