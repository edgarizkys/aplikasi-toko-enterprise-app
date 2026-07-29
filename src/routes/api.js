const express = require('express');
const router = express.Router();
const { tursoClient } = require('../config/database');

const getTenant = (req) => req.headers['x-tenant-id'] || 'default_tenant';

const crud = (table, fields) => {
    router.get(`/${table}`, async (req, res) => {
        try {
            const tenant = getTenant(req);
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const data = await tursoClient.execute({
                sql: `SELECT * FROM ${table} WHERE tenant_id = ? LIMIT ? OFFSET ?`,
                args: [tenant, limit, offset]
            });
            const count = await tursoClient.execute({
                sql: `SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = ?`,
                args: [tenant]
            });
            res.json({ success: true, data: data.rows, total: count.rows[0].total });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post(`/${table}`, async (req, res) => {
        try {
            const tenant = getTenant(req);
            const keys = fields.map(f => f.key);
            const values = keys.map(k => req.body[k]);
            const placeholders = ['?', ...keys.map(() => '?')].join(', ');
            const sql = `INSERT INTO ${table} (tenant_id, ${keys.join(', ')}) VALUES (${placeholders})`;
            await tursoClient.execute({ sql, args: [tenant, ...values] });
            res.status(201).json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
};

crud('products', [{key: 'name'}, {key: 'category'}, {key: 'price'}, {key: 'stock'}]);
crud('sales', [{key: 'product_name'}, {key: 'quantity'}, {key: 'total'}, {key: 'date'}]);
crud('customers', [{key: 'name'}, {key: 'phone'}, {key: 'points'}]);

module.exports = router;