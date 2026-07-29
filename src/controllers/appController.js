const { tursoClient } = require('../config/database');

const getTenant = (req) => req.headers['x-tenant-id'] || 'default_tenant';

exports.getAll = async (req, res) => {
    const { entity } = req.params;
    const tenantId = getTenant(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
        const data = await tursoClient.execute({
            sql: `SELECT * FROM ${entity} WHERE tenant_id = ? LIMIT ? OFFSET ?`,
            args: [tenantId, limit, offset]
        });
        const count = await tursoClient.execute({
            sql: `SELECT COUNT(*) as total FROM ${entity} WHERE tenant_id = ?`,
            args: [tenantId]
        });

        res.json({
            success: true,
            data: data.rows,
            pagination: { page, limit, total: count.rows[0].total }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.create = async (req, res) => {
    const { entity } = req.params;
    const tenantId = getTenant(req);
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    
    const sql = `INSERT INTO ${entity} (tenant_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`;
    
    try {
        const result = await tursoClient.execute({
            sql,
            args: [tenantId, ...values]
        });
        res.status(201).json({ success: true, id: Number(result.lastInsertRowid) });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
};

exports.update = async (req, res) => {
    const { entity, id } = req.params;
    const tenantId = getTenant(req);
    const updates = Object.entries(req.body).map(([k, v]) => `${k} = ?`).join(', ');
    
    try {
        await tursoClient.execute({
            sql: `UPDATE ${entity} SET ${updates} WHERE id = ? AND tenant_id = ?`,
            args: [...Object.values(req.body), id, tenantId]
        });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
};

exports.delete = async (req, res) => {
    const { entity, id } = req.params;
    const tenantId = getTenant(req);
    
    try {
        await tursoClient.execute({
            sql: `DELETE FROM ${entity} WHERE id = ? AND tenant_id = ?`,
            args: [id, tenantId]
        });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
};