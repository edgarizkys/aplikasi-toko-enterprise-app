const { createClient } = require('@libsql/client');

const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://your-db.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || ''
});

async function initializeDatabase() {
    try {
        // Products table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                sku TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                cost REAL NOT NULL,
                stock INTEGER DEFAULT 0,
                reorder_point INTEGER DEFAULT 0,
                supplier_id TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Customers table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                company_name TEXT NOT NULL,
                contact_person TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                credit_limit REAL DEFAULT 0,
                payment_terms TEXT DEFAULT 'Net 30',
                tax_id TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Suppliers table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                supplier_name TEXT NOT NULL,
                contact_person TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                address TEXT NOT NULL,
                payment_terms TEXT DEFAULT 'Net 45',
                rating REAL DEFAULT 0,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Orders table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                order_number TEXT NOT NULL UNIQUE,
                customer_id INTEGER NOT NULL,
                order_date DATE NOT NULL,
                total_amount REAL NOT NULL,
                discount REAL DEFAULT 0,
                tax REAL DEFAULT 0,
                final_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                payment_method TEXT,
                delivery_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        `);

        // Order Items table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                subtotal REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        // Invoices table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                invoice_number TEXT NOT NULL UNIQUE,
                order_id INTEGER NOT NULL,
                invoice_date DATE NOT NULL,
                due_date DATE NOT NULL,
                amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )
        `);

        // Payments table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                invoice_id INTEGER NOT NULL,
                payment_date DATE NOT NULL,
                amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                reference_number TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id)
            )
        `);

        // Stock History table
        await tursoClient.execute(`
            CREATE TABLE IF NOT EXISTS stock_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT DEFAULT 'default',
                product_id INTEGER NOT NULL,
                transaction_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                reference_id TEXT,
                reference_type TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        // Create indexes for better query performance
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id)`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_id)`);

        console.log('[DB] Aplikasi Toko Enterprise - Tables initialized successfully');
    } catch(e) {
        console.log('[DB] Notice:', e.message);
    }
}

module.exports = { tursoClient, initializeDatabase };