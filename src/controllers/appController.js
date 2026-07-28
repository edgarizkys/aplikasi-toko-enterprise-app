const { tursoClient } = require('../config/database');

// ==================== PRODUCTS ====================

exports.getAllProducts = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const result = await tursoClient.execute({
            sql: `SELECT * FROM products 
                  WHERE tenant_id = ? AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)
                  ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            args: [tenantId, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
        });

        const countResult = await tursoClient.execute({
            sql: `SELECT COUNT(*) as total FROM products 
                  WHERE tenant_id = ? AND (name LIKE ? OR sku LIKE ? OR category LIKE ?)`,
            args: [tenantId, `%${search}%`, `%${search}%`, `%${search}%`]
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
};

exports.getProductById = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { id } = req.params;

        const result = await tursoClient.execute({
            sql: 'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;

        if (!sku || !name || !category || !price || !cost || stock === undefined) {
            return res.status(400).json({ success: false, error: 'Bidang wajib diisi' });
        }

        const result = await tursoClient.execute({
            sql: `INSERT INTO products 
                  (tenant_id, sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [tenantId, sku, name, category, description || '', price, cost, stock, reorder_point || 5, supplier_id || '', status || 'active']
        });

        res.status(201).json({
            success: true,
            data: {
                id: Number(result.lastInsertRowid),
                tenant_id: tenantId,
                sku,
                name,
                category,
                description,
                price,
                cost,
                stock,
                reorder_point,
                supplier_id,
                status: status || 'active'
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { id } = req.params;
        const { sku, name, category, description, price, cost, stock, reorder_point, supplier_id, status } = req.body;

        const checkResult = await tursoClient.execute({
            sql: 'SELECT id FROM products WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
        }

        const updates = [];
        const values = [];

        if (sku !== undefined) {
            updates.push('sku = ?');
            values.push(sku);
        }
        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            values.push(price);
        }
        if (cost !== undefined) {
            updates.push('cost = ?');
            values.push(cost);
        }
        if (stock !== undefined) {
            updates.push('stock = ?');
            values.push(stock);
        }
        if (reorder_point !== undefined) {
            updates.push('reorder_point = ?');
            values.push(reorder_point);
        }
        if (supplier_id !== undefined) {
            updates.push('supplier_id = ?');
            values.push(supplier_id);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'Tidak ada data untuk diperbarui' });
        }

        updates.push('updated_at = datetime(\'now\')');
        values.push(id);
        values.push(tenantId);

        await tursoClient.execute({
            sql: `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
            args: values
        });

        res.json({ success: true, message: 'Produk berhasil diperbarui' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { id } = req.params;

        const checkResult = await tursoClient.execute({
            sql: 'SELECT id FROM products WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produk tidak ditemukan' });
        }

        await tursoClient.execute({
            sql: 'DELETE FROM products WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        res.json({ success: true, message: 'Produk berhasil dihapus' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// ==================== ORDERS ====================

exports.getAllOrders = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || '';

        let sql = `SELECT * FROM orders WHERE tenant_id = ?`;
        const args = [tenantId];

        if (search) {
            sql += ` AND (order_number LIKE ? OR customer_id LIKE ?)`;
            args.push(`%${search}%`, `%${search}%`);
        }

        if (status) {
            sql += ` AND status = ?`;
            args.push(status);
        }

        sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        args.push(limit, offset);

        const result = await tursoClient.execute({
            sql: sql,
            args: args
        });

        let countSql = `SELECT COUNT(*) as total FROM orders WHERE tenant_id = ?`;
        const countArgs = [tenantId];

        if (search) {
            countSql += ` AND (order_number LIKE ? OR customer_id LIKE ?)`;
            countArgs.push(`%${search}%`, `%${search}%`);
        }

        if (status) {
            countSql += ` AND status = ?`;
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
};

exports.getOrderById = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { id } = req.params;

        const result = await tursoClient.execute({
            sql: 'SELECT * FROM orders WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { order_number, customer_id, order_date, total_amount, discount, tax, final_amount, status, payment_method, delivery_date } = req.body;

        if (!order_number || !customer_id || !order_date || total_amount === undefined) {
            return res.status(400).json({ success: false, error: 'Bidang wajib diisi' });
        }

        const result = await tursoClient.execute({
            sql: `INSERT INTO orders 
                  (tenant_id, order_number, customer_id, order_date, total_amount, discount, tax, final_amount, status, payment_method, delivery_date, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            args: [tenantId, order_number, customer_id, order_date, total_amount, discount || 0, tax || 0, final_amount || total_amount, status || 'pending', payment_method || '', delivery_date || '']
        });

        res.status(201).json({
            success: true,
            data: {
                id: Number(result.lastInsertRowid),
                tenant_id: tenantId,
                order_number,
                customer_id,
                order_date,
                total_amount,
                discount,
                tax,
                final_amount,
                status: status || 'pending',
                payment_method,
                delivery_date
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { id } = req.params;
        const { order_number, customer_id, order_date, total_amount, discount, tax, final_amount, status, payment_method, delivery_date } = req.body;

        const checkResult = await tursoClient.execute({
            sql: 'SELECT id FROM orders WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
        }

        const updates = [];
        const values = [];

        if (order_number !== undefined) {
            updates.push('order_number = ?');
            values.push(order_number);
        }
        if (customer_id !== undefined) {
            updates.push('customer_id = ?');
            values.push(customer_id);
        }
        if (order_date !== undefined) {
            updates.push('order_date = ?');
            values.push(order_date);
        }
        if (total_amount !== undefined) {
            updates.push('total_amount = ?');
            values.push(total_amount);
        }
        if (discount !== undefined) {
            updates.push('discount = ?');
            values.push(discount);
        }
        if (tax !== undefined) {
            updates.push('tax = ?');
            values.push(tax);
        }
        if (final_amount !== undefined) {
            updates.push('final_amount = ?');
            values.push(final_amount);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (payment_method !== undefined) {
            updates.push('payment_method = ?');
            values.push(payment_method);
        }
        if (delivery_date !== undefined) {
            updates.push('delivery_date = ?');
            values.push(delivery_date);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'Tidak ada data untuk diperbarui' });
        }

        updates.push('updated_at = datetime(\'now\')');
        values.push(id);
        values.push(tenantId);

        await tursoClient.execute({
            sql: `UPDATE orders SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
            args: values
        });

        res.json({ success: true, message: 'Pesanan berhasil diperbarui' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
        const { id } = req.params;

        const checkResult = await tursoClient.execute({
            sql: 'SELECT id FROM orders WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Pesanan tidak ditemukan' });
        }

        await tursoClient.execute({
            sql: 'DELETE FROM orders WHERE id = ? AND tenant_id = ?',
            args: [id, tenantId]
        });

        res.json({ success: true, message: 'Pesanan berhasil dihapus' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};