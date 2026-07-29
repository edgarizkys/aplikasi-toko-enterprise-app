const express = require('express');
const { createClient } = require('@libsql/client');
const app = express();

app.use(express.json());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const entities = ['products', 'orders', 'suppliers', 'employees'];

entities.forEach(entity => {
  app.get(`/api/${entity}`, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    try {
      const rs = await db.execute({
        sql: `SELECT * FROM ${entity} LIMIT ? OFFSET ?`,
        args: [Number(limit), Number(offset)]
      });
      res.json({ data: rs.rows, page, limit });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post(`/api/${entity}`, async (req, res) => {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    const placeholders = keys.map(() => '?').join(',');
    try {
      await db.execute({
        sql: `INSERT INTO ${entity} (${keys.join(',')}) VALUES (${placeholders})`,
        args: values
      });
      res.status(201).json({ message: 'Success' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [sales, stock] = await Promise.all([
      db.execute('SELECT SUM(total) as revenue FROM orders'),
      db.execute('SELECT SUM(stock) as total_stock FROM products')
    ]);
    res.json({ revenue: sales.rows[0].revenue, stock: stock.rows[0].total_stock });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('Server running port 3000'));