import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Aplikasi Toko Enterprise - Unit Tests', () => {
  beforeEach(async () => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        sku TEXT UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        reorder_point INTEGER DEFAULT 0,
        supplier_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        order_number TEXT UNIQUE,
        customer_id TEXT NOT NULL,
        order_date DATE,
        total_amount REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        delivery_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY,
        company_name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        credit_limit REAL DEFAULT 0,
        payment_terms TEXT,
        tax_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY,
        supplier_name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        payment_terms TEXT,
        rating REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY,
        invoice_number TEXT UNIQUE,
        order_id TEXT NOT NULL,
        invoice_date DATE,
        due_date DATE,
        amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterEach(async () => {
    await db.exec(`
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS orders;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS suppliers;
      DROP TABLE IF EXISTS invoices;
    `);
  });

  describe('Product Management', () => {
    it('should create a new product', async () => {
      const productData = {
        sku: 'PROD-001',
        name: 'Laptop Dell XPS 13',
        category: 'Elektronik',
        description: 'Laptop enterprise high performance',
        price: 15000000,
        cost: 12000000,
        stock: 25,
        reorder_point: 5,
        supplier_id: 'SUP-001',
        status: 'active'
      };

      const response = await request(app)
        .post('/api/v1/products')
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        sku: 'PROD-001',
        name: 'Laptop Dell XPS 13',
        price: 15000000
      });
    });

    it('should retrieve all products with pagination', async () => {
      const productsToInsert = [
        { sku: 'PROD-001', name: 'Laptop', category: 'Elektronik', price: 15000000, cost: 12000000, stock: 25, status: 'active' },
        { sku: 'PROD-002', name: 'Monitor', category: 'Aksesori', price: 3500000, cost: 2800000, stock: 50, status: 'active' }
      ];

      for (const prod of productsToInsert) {
        await db.execute(
          `INSERT INTO products (sku, name, category, price, cost, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [prod.sku, prod.name, prod.category, prod.price, prod.cost, prod.stock, prod.status]
        );
      }

      const response = await request(app)
        .get('/api/v1/products?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should get product by ID', async () => {
      const result = await db.execute(
        `INSERT INTO products (sku, name, category, price, cost, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        ['PROD-001', 'Laptop', 'Elektronik', 15000000, 12000000, 25, 'active']
      );

      const productId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/v1/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('sku', 'PROD-001');
    });

    it('should update product', async () => {
      const result = await db.execute(
        `INSERT INTO products (sku, name, category, price, cost, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        ['PROD-001', 'Laptop', 'Elektronik', 15000000, 12000000, 25, 'active']
      );

      const productId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/v1/products/${productId}`)
        .send({ price: 16000000, stock: 20 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('price', 16000000);
      expect(response.body.data).toHaveProperty('stock', 20);
    });

    it('should delete product', async () => {
      const result = await db.execute(
        `INSERT INTO products (sku, name, category, price, cost, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        ['PROD-001', 'Laptop', 'Elektronik', 15000000, 12000000, 25, 'active']
      );

      const productId = result.rows[0].id;

      const response = await request(app)
        .delete(`/api/v1/products/${productId}`);

      expect(response.status).toBe(200);
    });

    it('should check low stock products', async () => {
      await db.execute(
        `INSERT INTO products (sku, name, category, price, cost, stock, reorder_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['PROD-001', 'Laptop', 'Elektronik', 15000000, 12000000, 3, 5, 'active']
      );

      const response = await request(app)
        .get('/api/v1/products/alerts/low-stock');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should calculate product margin', async () => {
      const productData = {
        sku: 'PROD-001',
        name: 'Laptop',
        category: 'Elektronik',
        price: 15000000,
        cost: 12000000,
        stock: 25,
        status: 'active'
      };

      const response = await request(app)
        .post('/api/v1/products/calculate-margin')
        .send(productData);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('margin');
      expect(response.body.data.margin).toBe(20);
    });
  });

  describe('Order Management', () => {
    beforeEach(async () => {
      await db.execute(
        `INSERT INTO customers (company_name, email, phone, city, status) VALUES (?, ?, ?, ?, ?)`,
        ['PT Maju Jaya', 'budi@majujaya.com', '021-5555-0001', 'Jakarta', 'active']
      );
    });

    it('should create a new order', async () => {
      const orderData = {
        order_number: 'ORD-2026-001',
        customer_id: 1,
        order_date: '2026-07-28',
        total_amount: 45000000,
        discount: 2250000,
        tax: 6825000,
        final_amount: 49575000,
        status: 'processing',
        payment_method: 'transfer',
        delivery_date: '2026-08-05'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        order_number: 'ORD-2026-001',
        status: 'processing'
      });
    });

    it('should retrieve all orders with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/orders?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.pagination).toHaveProperty('page', 1);
    });

    it('should update order status', async () => {
      const result = await db.execute(
        `INSERT INTO orders (order_number, customer_id, order_date, total_amount, final_amount, status) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        ['ORD-2026-001', 1, '2026-07-28', 45000000, 49575000, 'processing']
      );

      const orderId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/v1/orders/${orderId}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('status', 'completed');
    });

    it('should calculate order total with tax and discount', async () => {
      const orderData = {
        total_amount: 45000000,
        discount_percentage: 5,
        tax_percentage: 15
      };

      const response = await request(app)
        .post('/api/v1/orders/calculate-total')
        .send(orderData);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('discount');
      expect(response.body.data).toHaveProperty('tax');
      expect(response.body.data).toHaveProperty('final_amount');
    });
  });

  describe('Customer Management', () => {
    it('should create a new customer', async () => {
      const customerData = {
        company_name: 'PT Maju Jaya Indonesia',
        contact_person: 'Budi Santoso',
        email: 'budi@majujaya.com',
        phone: '021-5555-0001',
        address: 'Jl. Gatot Subroto No. 123',
        city: 'Jakarta',
        credit_limit: 100000000,
        payment_terms: 'Net 30',
        tax_id: '01.123.456.789-000.000',
        status: 'active'
      };

      const response = await request(app)
        .post('/api/v1/customers')
        .send(customerData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        company_name: 'PT Maju Jaya Indonesia',
        city: 'Jakarta'
      });
    });

    it('should retrieve all customers', async () => {
      const response = await request(app)
        .get('/api/v1/customers?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get customer by ID', async () => {
      const result = await db.execute(
        `INSERT INTO customers (company_name, email, phone, city, status) VALUES (?, ?, ?, ?, ?) RETURNING id`,
        ['PT Maju Jaya', 'budi@majujaya.com', '021-5555-0001', 'Jakarta', 'active']
      );

      const customerId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/v1/customers/${customerId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('company_name', 'PT Maju Jaya');
    });

    it('should update customer credit limit', async () => {
      const result = await db.execute(
        `INSERT INTO customers (company_name, email, phone, city, credit_limit, status) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        ['PT Maju Jaya', 'budi@majujaya.com', '021-5555-0001', 'Jakarta', 100000000, 'active']
      );

      const customerId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/v1/customers/${customerId}`)
        .send({ credit_limit: 150000000 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('credit_limit', 150000000);
    });

    it('should check customer credit availability', async () => {
      const response = await request(app)
        .post('/api/v1/customers/check-credit')
        .send({ customer_id: 1, order_amount: 50000000 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('available');
    });
  });

  describe('Supplier Management', () => {
    it('should create a new supplier', async () => {
      const supplierData = {
        supplier_name: 'PT Global Electronics',
        contact_person: 'Ahmad Wijaya',
        email: 'ahmad@globalelec.com',
        phone: '021-8888-0001',
        address: 'Jl. Hayam Wuruk No. 789',
        payment_terms: 'Net 60',
        rating: 4.5,
        status: 'active'
      };

      const response = await request(app)
        .post('/api/v1/suppliers')
        .send(supplierData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        supplier_name: 'PT Global Electronics',
        rating: 4.5
      });
    });

    it('should retrieve all suppliers', async () => {
      const response = await request(app)
        .get('/api/v1/suppliers?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should update supplier rating', async () => {
      const result = await db.execute(
        `INSERT INTO suppliers (supplier_name, email, phone, rating, status) VALUES (?, ?, ?, ?, ?) RETURNING id`,
        ['PT Global Electronics', 'ahmad@globalelec.com', '021-8888-0001', 4.5, 'active']
      );

      const supplierId = result.rows[0].id;

      const response = await request(app)
        .put(`/api/v1/suppliers/${supplierId}`)
        .send({ rating: 4.8 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('rating', 4.8);
    });
  });

  describe('Invoice & Payment Management', () => {
    beforeEach(async () => {
      await db.execute(
        `INSERT INTO customers (company_name, email, phone, city, status) VALUES (?, ?, ?, ?, ?)`,
        ['PT Maju Jaya', 'budi@majujaya.com', '021-5555-0001', 'Jakarta', 'active']
      );

      await db.execute(
        `INSERT INTO orders (order_number, customer_id, total_amount, final_amount, status) VALUES (?, ?, ?, ?, ?) RETURNING id`,
        ['ORD-2026-001', 1, 45000000, 49575000, 'completed']
      );
    });

    it('should create invoice from order', async () => {
      const invoiceData = {
        invoice_number: 'INV-2026-001',
        order_id: 1,
        invoice_date: '2026-07-28',
        due_date: '2026-08-27',
        amount: 49575000,
        status: 'pending',
        notes: 'Pelunasan maksimal 30 hari'
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        invoice_number: 'INV-2026-001',
        status: 'pending'
      });
    });

    it('should retrieve invoices by customer', async () => {
      const response = await request(app)
        .get('/api/v1/invoices?customer_id=1&page=1&limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should record payment for invoice', async () => {
      const result = await db.execute(
        `INSERT INTO invoices (invoice_number, order_id, amount, status) VALUES (?, ?, ?, ?) RETURNING id`,
        ['INV-2026-001', 1, 49575000, 'pending']
      );

      const invoiceId = result.rows[0].id;

      const response = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payment`)
        .send({ paid_amount: 49575000 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('status', 'paid');
    });

    it('should get overdue invoices', async () => {
      const response = await request(app)
        .get('/api/v1/invoices/status/overdue');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Inventory Management', () => {
    beforeEach(async () => {
      await db.execute(
        `INSERT INTO products (sku, name, category, price, cost, stock, reorder_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['PROD-001', 'Laptop', 'Elektronik', 15000000, 12000000, 25, 5, 'active']
      );
    });

    it('should update stock for product', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/adjust-stock')
        .send({ product_id: 1, quantity: -5, reason: 'sold' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('stock', 20);
    });

    it('should get stock movement history', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/history?product_id=1');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should generate stock report', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/report?status=active');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_items');
      expect(response.body.data).toHaveProperty('total_value');
    });
  });

  describe('Sales Reporting', () => {
    it('should get sales by date range', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales?start_date=2026-07-01&end_date=2026-08-31');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_sales');
      expect(response.body.data).toHaveProperty('order_count');
    });

    it('should get sales by category', async () => {
      const response = await request(app)
        .get('/api/v1/reports/sales-by-category');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get top products', async () => {
      const response = await request(app)
        .get('/api/v1/reports/top-products?limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get dashboard summary', async () => {
      const response = await request(app)
        .get('/api/v1/reports/dashboard-summary');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_products');
      expect(response.body.data).toHaveProperty('total_customers');
      expect(response.body.data).toHaveProperty('total_orders');
      expect(response.body.data).toHaveProperty('pending_invoices');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid product data', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .send({ sku: 'PROD-001' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/v1/products/9999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate SKU', async () => {
      const productData = {
        sku: 'PROD-001',
        name: 'Laptop',
        category: 'Elektronik',
        price: 15000000,
        cost: 12000000,
        stock: 25,
        status: 'active'
      };

      await request(app).post('/api/v1/products').send(productData);

      const response = await request(app)
        .post('/api/v1/products')
        .send(productData);

      expect(response.status).toBe(409);
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/products/invalid-id');

      expect(response.status).toBe(400);
    });
  });

  describe('Validation', () => {
    it('should validate required fields for product', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .send({ sku: 'PROD-001' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate email format for customer', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({
          company_name: 'Test Company',
          email: 'invalid-email',
          phone: '021-1234-5678',
          city: 'Jakarta'
        });

      expect(response.status).toBe(400);
    });

    it('should validate numeric fields', async () => {
      const response = await request(app)
        .post('/api/v1/products')
        .send({
          sku: 'PROD-001',
          name: 'Laptop',
          price: 'invalid',
          cost: 12000000,
          stock: 25
        });

      expect(response.status).toBe(400);
    });
  });
});