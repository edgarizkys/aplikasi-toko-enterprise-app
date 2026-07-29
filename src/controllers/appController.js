const { tursoClient } = require('../config/database');

const getTenantId = (req) => req.headers['x-tenant-id'] || 'default_tenant';

const paginate = async (table, tenantId, page, limit) => {
    const offset = (page - 1) * limit;
    const data = await tursoClient.execute({
        sql: `SELECT * FROM ${table} WHERE tenant_id = ? LIMIT ? OFFSET ?`,
        args: [tenantId, limit, offset]
    });
    const count = await tursoClient.execute({
        sql: `SELECT COUNT(*) as total FROM ${table} WHERE tenant_id = ?`,
        args: [tenantId]
    });
    const total = count.rows[0].total;
    return {
        rows: data.rows,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// PRODUCTS
exports.getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await paginate('products', getTenantId(req), page, limit);
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { sku, name, category, price, stock } = req.body;
        const result = await tursoClient.execute({
            sql: 'INSERT INTO products (tenant_id, sku, name, category, price, stock) VALUES (?, ?, ?, ?, ?, ?)',
            args: [getTenantId(req), sku, name, category, price, stock]
        });
        res.status(201).json({ success: true, id: Number(result.lastInsertRowid) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { sku, name, category, price, stock } = req.body;
        await tursoClient.execute({
            sql: 'UPDATE products SET sku = ?, name = ?, category = ?, price = ?, stock = ? WHERE id = ? AND tenant_id = ?',
            args: [sku, name, category, price, stock, id, getTenantId(req)]
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await tursoClient.execute({
            sql: 'DELETE FROM products WHERE id = ? AND tenant_id = ?',
            args: [req.params.id, getTenantId(req)]
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// ORDERS
exports.getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await paginate('orders', getTenantId(req), page, limit);
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { order_no, customer, total, status, date } = req.body;
        const result = await tursoClient.execute({
            sql: 'INSERT INTO orders (tenant_id, order_no, customer, total, status, date) VALUES (?, ?, ?, ?, ?, ?)',
            args: [getTenantId(req), order_no, customer, total, status, date]
        });
        res.status(201).json({ success: true, id: Number(result.lastInsertRowid) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// SUPPLIERS
exports.getAllSuppliers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await paginate('suppliers', getTenantId(req), page, limit);
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.createSupplier = async (req, res) => {
    try {
        const { name, contact, email, category } = req.body;
        const result = await tursoClient.execute({
            sql: 'INSERT INTO suppliers (tenant_id, name, contact, email, category) VALUES (?, ?, ?, ?, ?)',
            args: [getTenantId(req), name, contact, email, category]
        });
        res.status(201).json({ success: true, id: Number(result.lastInsertRowid) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// EMPLOYEES
exports.getAllEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await paginate('employees', getTenantId(req), page, limit);
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.createEmployee = async (req, res) => {
    try {
        const { name, role, department, salary } = req.body;
        const result = await tursoClient.execute({
            sql: 'INSERT INTO employees (tenant_id, name, role, department, salary) VALUES (?, ?, ?, ?, ?)',
            args: [getTenantId(req), name, role, department, salary]
        });
        res.status(201).json({ success: true, id: Number(result.lastInsertRowid) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// DASHBOARD ANALYTICS
exports.getDashboardStats = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const sales = await tursoClient.execute({
            sql: 'SELECT SUM(total) as revenue, COUNT(*) as count FROM orders WHERE tenant_id = ? AND status = "Paid"',
            args: [tenantId]
        });
        const stock = await tursoClient.execute({
            sql: 'SELECT COUNT(*) as low_stock FROM products WHERE tenant_id = ? AND stock < 10',
            args: [tenantId]
        });
        const employees = await tursoClient.execute({
            sql: 'SELECT SUM(salary) as payroll FROM employees WHERE tenant_id = ?',
            args: [tenantId]
        });

        res.json({
            success: true,
            stats: {
                revenue: sales.rows[0].revenue || 0,
                orderCount: sales.rows[0].count || 0,
                lowStockAlerts: stock.rows[0].low_stock || 0,
                monthlyPayroll: employees.rows[0].payroll || 0
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};