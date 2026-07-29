const express = require('express');
const { createClient } = require('@libsql/client');
const app = express();

app.use(express.json());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const initDb = async () => {
  await db.execute(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY, product_name TEXT, quantity INTEGER, total REAL, date TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, points INTEGER)`);
};

initDb();

app.get('/api/:entity', async (req, res) => {
  const { entity } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    const result = await db.execute(`SELECT * FROM ${entity} LIMIT ? OFFSET ?`, [Number(limit), Number(offset)]);
    res.json({ data: result.rows, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/:entity', async (req, res) => {
  const { entity } = req.params;
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  const placeholders = keys.map(() => '?').join(',');
  
  try {
    await db.execute(`INSERT INTO ${entity} (${keys.join(',')}) VALUES (${placeholders})`, values);
    res.status(201).json({ message: 'Success' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running port 3000'));