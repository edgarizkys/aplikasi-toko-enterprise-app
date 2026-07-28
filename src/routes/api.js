// api.js - API Routes and Controllers for Aplikasi Toko Enterprise
const express = require('express');
const { tursoClient } = require('../config/database');

const router = express.Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

const getTenantId = (req) => req.headers['x-tenant-id'] || 'default_tenant';

const validatePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// ============================================================================
// PRODUCTS ENDPOINTS
// ============================================================================

// GET all products with pagination
router.get('/products', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { page, limit, offset } = validatePagination(req);
    const search = req.query.search || '';
    const status = req.query.status || '';

    let sql = 'SELECT * FROM products WHERE tenant_id = ?';
    const args = [tenantId];

    if (search) {
      sql += ' AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)';
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      sql += ' AND status = ?';
      args.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    const result = await tursoClient.execute({
      sql,
      args
    });

    const countSql = `SELECT COUNT(*) as total FROM products WHERE tenant_id = ?${search ? ' AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)' : ''}${status ? ' AND status = ?' : ''}`;
    const countArgs = [tenantId];
    if (search) {
      const searchTerm = `%${search}%`;
      countArgs.push(searchTerm, searchTerm, searchTerm);
    }
    if (status) {
      countArgs.push(status);
    }

    const countResult = await tursoClient.execute({
      sql: countSql,
      args: countArgs
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET single product
router.get('/products/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await tursoClient.execute({
      sql: 'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// CREATE product
router.post('/products', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;

    if (!sku || !name || !price || price < 0 || stock < 0) {
      return res.status(400).json({ success: false, error: 'Data tidak valid' });
    }

    const result = await tursoClient.execute({
      sql: `INSERT INTO products (tenant_id, sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [tenantId, sku, name, category || '', description || '', price, cost || 0, stock, reorder_point || 0, supplier_id || '', status || 'active']
    });

    res.status(201).json({
      success: true,
      data: { id: Number(result.lastInsertRowid), ...req.body, created_at: new Date().toISOString() }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// UPDATE product
router.put('/products/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;

    if (price !== undefined && price < 0) {
      return res.status(400).json({ success: false, error: 'Harga tidak valid' });
    }

    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM products WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }

    await tursoClient.execute({
      sql: `UPDATE products SET sku = COALESCE(?, sku), name = COALESCE(?, name), category = COALESCE(?, category),
            description = COALESCE(?, description), price = COALESCE(?, price), cost = COALESCE(?, cost),
            stock = COALESCE(?, stock), reorder_point = COALESCE(?, reorder_point), supplier_id = COALESCE(?, supplier_id),
            status = COALESCE(?, status), updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?`,
      args: [sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status, req.params.id, tenantId]
    });

    res.json({ success: true, message: 'Produk berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await tursoClient.execute({
      sql: 'DELETE FROM products WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
    }

    res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================================
// CUSTOMERS ENDPOINTS
// ============================================================================

// GET all customers
router.get('/customers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { page, limit, offset } = validatePagination(req);
    const search = req.query.search || '';

    let sql = 'SELECT * FROM customers WHERE tenant_id = ?';
    const args = [tenantId];

    if (search) {
      sql += ' AND (company_name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    const result = await tursoClient.execute({ sql, args });

    const countSql = `SELECT COUNT(*) as total FROM customers WHERE tenant_id = ?${search ? ' AND (company_name LIKE ? OR contact_person LIKE ? OR email LIKE ?)' : ''}`;
    const countArgs = [tenantId];
    if (search) {
      const searchTerm = `%${search}%`;
      countArgs.push(searchTerm, searchTerm, searchTerm);
    }

    const countResult = await tursoClient.execute({ sql: countSql, args: countArgs });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET single customer
router.get('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await tursoClient.execute({
      sql: 'SELECT * FROM customers WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// CREATE customer
router.post('/customers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status } = req.body;

    if (!company_name || !contact_person || !email) {
      return res.status(400).json({ success: false, error: 'Data tidak valid' });
    }

    const result = await tursoClient.execute({
      sql: `INSERT INTO customers (tenant_id, company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [tenantId, company_name, contact_person, email, phone || '', address || '', city || '', credit_limit || 0, payment_terms || '', tax_id || '', status || 'active']
    });

    res.status(201).json({
      success: true,
      data: { id: Number(result.lastInsertRowid), ...req.body, created_at: new Date().toISOString() }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// UPDATE customer
router.put('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status } = req.body;

    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM customers WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan' });
    }

    await tursoClient.execute({
      sql: `UPDATE customers SET company_name = COALESCE(?, company_name), contact_person = COALESCE(?, contact_person),
            email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address), city = COALESCE(?, city),
            credit_limit = COALESCE(?, credit_limit), payment_terms = COALESCE(?, payment_terms), tax_id = COALESCE(?, tax_id),
            status = COALESCE(?, status), updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?`,
      args: [company_name, contact_person, email, phone, address, city, credit_limit, payment_terms, tax_id, status, req.params.id, tenantId]
    });

    res.json({ success: true, message: 'Pelanggan berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE customer
router.delete('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await tursoClient.execute({
      sql: 'DELETE FROM customers WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan' });
    }

    res.json({ success: true, message: 'Pelanggan berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================================
// SUPPLIERS ENDPOINTS
// ============================================================================

// GET all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { page, limit, offset } = validatePagination(req);
    const search = req.query.search || '';

    let sql = 'SELECT * FROM suppliers WHERE tenant_id = ?';
    const args = [tenantId];

    if (search) {
      sql += ' AND (supplier_name LIKE ? OR contact_person LIKE ?)';
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    const result = await tursoClient.execute({ sql, args });

    const countSql = `SELECT COUNT(*) as total FROM suppliers WHERE tenant_id = ?${search ? ' AND (supplier_name LIKE ? OR contact_person LIKE ?)' : ''}`;
    const countArgs = [tenantId];
    if (search) {
      const searchTerm = `%${search}%`;
      countArgs.push(searchTerm, searchTerm);
    }

    const countResult = await tursoClient.execute({ sql: countSql, args: countArgs });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET single supplier
router.get('/suppliers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await tursoClient.execute({
      sql: 'SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier tidak ditemukan' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// CREATE supplier
router.post('/suppliers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { supplier_name, contact_person, email, phone, address, payment_terms, rating, status } = req.body;

    if (!supplier_name || !contact_person) {
      return res.status(400).json({ success: false, error: 'Data tidak valid' });
    }

    const result = await tursoClient.execute({
      sql: `INSERT INTO suppliers (tenant_id, supplier_name, contact_person, email, phone, address, payment_terms, rating, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [tenantId, supplier_name, contact_person, email || '', phone || '', address || '', payment_terms || '', rating || 0, status || 'active']
    });

    res.status(201).json({
      success: true,
      data: { id: Number(result.lastInsertRowid), ...req.body, created_at: new Date().toISOString() }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// UPDATE supplier
router.put('/suppliers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { supplier_name, contact_person, email, phone, address, payment_terms, rating, status } = req.body;

    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM suppliers WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier tidak ditemukan' });
    }

    await tursoClient.execute({
      sql: `UPDATE suppliers SET supplier_name = COALESCE(?, supplier_name), contact_person = COALESCE(?, contact_person),
            email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address),
            payment_terms = COALESCE(?, payment_terms), rating = COALESCE(?, rating), status = COALESCE(?, status),
            updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`,
      args: [supplier_name, contact_person, email, phone, address, payment_terms, rating, status, req.params.id, tenantId]
    });

    res.json({ success: true, message: 'Supplier berhasil diperbarui' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE supplier
router.delete('/suppliers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await tursoClient.execute({
      sql: 'DELETE FROM suppliers WHERE id = ? AND tenant_id = ?',
      args: [req.params.id, tenantId]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: 'Supplier tidak ditemukan' });
    }

    res.json({ success: true, message: 'Supplier berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;