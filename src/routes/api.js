const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://your-db.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const getTenant = (req) => req.headers['x-tenant-id'] || 'default_tenant';

// Helper for pagination
const getPagination = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { limit, offset, page } = getPagination(req);
    
    const result = await db.execute({
      sql: 'SELECT * FROM products WHERE tenant_id = ? LIMIT ? OFFSET ?',
      args: [tenantId, limit, offset]
    });
    
    const count = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM products WHERE tenant_id = ?',
      args: [tenantId]
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: count.rows[0].total, page, limit }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { sku, name, category, price, stock } = req.body;
    const result = await db.execute({
      sql: 'INSERT INTO products (tenant_id, sku, name, category, price, stock) VALUES (?, ?, ?, ?, ?, ?)',
      args: [tenantId, sku, name, category, price, stock]
    });
    res.status(201).json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ORDERS ---
app.get('/api/orders', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { limit, offset, page } = getPagination(req);
    const result = await db.execute({
      sql: 'SELECT * FROM orders WHERE tenant_id = ? ORDER BY date DESC LIMIT ? OFFSET ?',
      args: [tenantId, limit, offset]
    });
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { order_no, customer, total, status, date } = req.body;
    const result = await db.execute({
      sql: 'INSERT INTO orders (tenant_id, order_no, customer, total, status, date) VALUES (?, ?, ?, ?, ?, ?)',
      args: [tenantId, order_no, customer, total, status, date]
    });
    res.status(201).json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUPPLIERS ---
app.get('/api/suppliers', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const result = await db.execute({
      sql: 'SELECT * FROM suppliers WHERE tenant_id = ?',
      args: [tenantId]
    });
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EMPLOYEES ---
app.get('/api/employees', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const result = await db.execute({
      sql: 'SELECT * FROM employees WHERE tenant_id = ?',
      args: [tenantId]
    });
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD ANALYTICS ---
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const sales = await db.execute({
      sql: 'SELECT SUM(total) as revenue, COUNT(*) as count FROM orders WHERE tenant_id = ? AND status = "Paid"',
      args: [tenantId]
    });
    const lowStock = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND stock < 10',
      args: [tenantId]
    });
    res.json({
      revenue: sales.rows[0].revenue || 0,
      orderCount: sales.rows[0].count || 0,
      lowStockAlerts: lowStock.rows[0].count || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INITIALIZATION ---
app.post('/api/system/init', async (req, res) => {
  try {
    await db.batch([
      "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT, sku TEXT, name TEXT, category TEXT, price REAL, stock INTEGER)",
      "CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT, order_no TEXT, customer TEXT, total REAL, status TEXT, date TEXT)",
      "CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT, name TEXT, contact TEXT, email TEXT, category TEXT)",
      "CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT, name TEXT, role TEXT, department TEXT, salary REAL)"
    ], "write");
    res.json({ success: true, message: "Database tables initialized" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));