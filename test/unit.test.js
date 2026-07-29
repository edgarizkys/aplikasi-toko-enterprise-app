// unit.test.js
const request = require('supertest');
const app = require('./app');

describe('Enterprise Store Management API Tests', () => {
  
  describe('GET /api/products', () => {
    it('fetch all products with pagination', async () => {
      const res = await request(app).get('/api/products?page=1&limit=10');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/orders', () => {
    it('create order validation', async () => {
      const newOrder = {
        order_no: 'INV-TEST-001',
        customer: 'Test Corp',
        total: 100000,
        status: 'Pending',
        date: '2023-12-01'
      };
      const res = await request(app).post('/api/orders').send(newOrder);
      expect(res.statusCode).toBe(201);
      expect(res.body.order_no).toBe('INV-TEST-001');
    });
  });

  describe('GET /api/analytics', () => {
    it('return sales summary', async () => {
      const res = await request(app).get('/api/analytics/sales');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('total_revenue');
    });
  });

  describe('Error Handling', () => {
    it('handle invalid entity request', async () => {
      const res = await request(app).get('/api/invalid-entity');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('enforce tenant_id header', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('x-tenant-id', 'tenant-123');
      expect(res.statusCode).toBe(200);
    });
  });
});