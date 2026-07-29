const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const handleError = (res, err) => {
  console.error(err);
  res.status(500).json({ error: 'Database operation failed' });
};

app.get('/api/:entity', async (req, res) => {
  const { entity } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const result = await db.execute({
      sql: `SELECT * FROM ?? LIMIT ? OFFSET ?`,
      args: [entity, parseInt(limit), parseInt(offset)]
    });
    res.json(result.rows);
  } catch (e) { handleError(res, e); }
});

app.post('/api/:entity', async (req, res) => {
  const { entity } = req.params;
  const data = req.body;
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  try {
    await db.execute({
      sql: `INSERT INTO ?? (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      args: [entity, ...values]
    });
    res.status(201).json({ message: 'Success' });
  } catch (e) { handleError(res, e); }
});

app.put('/api/:entity/:id', async (req, res) => {
  const { entity, id } = req.params;
  const data = req.body;
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  
  try {
    await db.execute({
      sql: `UPDATE ?? SET ${sets} WHERE id = ?`,
      args: [entity, ...Object.values(data), id]
    });
    res.json({ message: 'Updated' });
  } catch (e) { handleError(res, e); }
});

app.delete('/api/:entity/:id', async (req, res) => {
  const { entity, id } = req.params;
  try {
    await db.execute({
      sql: `DELETE FROM ?? WHERE id = ?`,
      args: [entity, id]
    });
    res.json({ message: 'Deleted' });
  } catch (e) { handleError(res, e); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));