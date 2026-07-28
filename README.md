# Aplikasi Toko Enterprise

Platform manajemen toko enterprise dengan fitur lengkap untuk mengelola produk, pesanan, pelanggan, supplier, dan faktur dengan sistem inventory terintegrasi.

## 🎯 Fitur Utama

- **Manajemen Produk** - CRUD lengkap dengan tracking SKU, harga, biaya, dan stok
- **Pemrosesan Pesanan** - Order management dengan status tracking dan delivery schedule
- **Manajemen Pelanggan** - Database pelanggan dengan limit kredit dan terms pembayaran
- **Manajemen Supplier** - Supplier database dengan rating dan payment terms
- **Pelacakan Faktur & Pembayaran** - Invoice generation dan payment tracking
- **Manajemen Inventory** - Real-time stock monitoring dengan reorder points
- **Laporan Penjualan** - Analytics dashboard dengan insights bisnis
- **Manajemen Limit Kredit** - Credit limit per customer dengan monitoring
- **Dukungan Multi-Currency** - Formatting dan konversi mata uang
- **Kalkulasi Pajak** - Automatic tax calculation pada orders
- **Generasi Purchase Order** - Automated PO generation dari reorder points
- **Sistem Alert Stok** - Notifikasi otomatis saat stok di bawah reorder point

## 🛠️ Tech Stack

### Backend
- **Node.js + Express.js** - REST API server
- **Turso SQLite** - Database dengan sync capability
- **libSQL** - Client untuk Turso
- **Zod** - Schema validation
- **JWT** - Authentication & Authorization
- **Cors** - Cross-origin resource sharing

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling utility
- **React Router** - Client-side routing
- **TanStack React Query** - Server state management
- **Zustand** - Client state management
- **Axios** - HTTP client
- **date-fns** - Date manipulation
- **Recharts** - Data visualization

### DevTools
- **Vite** - Build tool & dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## 📋 Struktur Database

### Tables
- **products** - Master data produk (SKU, harga, stok, supplier)
- **orders** - Pesanan pelanggan dengan calculation fields
- **customers** - Data pelanggan dengan limit kredit
- **suppliers** - Data supplier dengan rating
- **invoices** - Faktur dengan payment tracking
- **order_items** - Detail item per pesanan (junction table)
- **users** - User accounts dengan role-based access
- **audit_logs** - Activity logging untuk compliance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn
- Turso account (create at https://turso.tech)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd toko-enterprise

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Configure Turso
# Set TURSO_CONNECTION_URL dan TURSO_AUTH_TOKEN in .env

# Run migrations
npm run migrate

# Seed sample data
npm run seed

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
TURSO_CONNECTION_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_auth_token

# API
API_PORT=3000
API_HOST=localhost
NODE_ENV=development

# Auth
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Multi-tenancy
ENABLE_MULTI_TENANT=true
TENANT_DB_STRATEGY=separate
```

## 📁 Project Structure

```
toko-enterprise/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   ├── customers.ts
│   │   │   ├── suppliers.ts
│   │   │   └── invoices.ts
│   │   ├── services/
│   │   │   ├── productService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── invoiceService.ts
│   │   │   └── inventoryService.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── database/
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── routes/
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   ├── customers.ts
│   │   │   ├── suppliers.ts
│   │   │   └── invoices.ts
│   │   ├── utils/
│   │   │   ├── validators.ts
│   │   │   ├── formatters.ts
│   │   │   └── calculations.ts
│   │   └── index.ts
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── forms/
│   │   │   └── tables/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Products/
│   │   │   ├── Orders/
│   │   │   ├── Customers/
│   │   │   ├── Suppliers/
│   │   │   └── Invoices/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── types/
│   │   ├── services/
│   │   └── App.tsx
│   ├── index.html
│   └── package.json
└── README.md
```

## 🔐 Authentication & Authorization

Aplikasi menggunakan JWT-based authentication dengan role-based access control (RBAC).

### Roles
- **Admin** - Full access ke semua fitur
- **Manager** - Akses manajemen order, customer, supplier
- **Operator** - Akses CRUD terbatas
- **Viewer** - Read-only access

## 💾 API Endpoints

### Products
- `GET /api/products` - List products dengan pagination
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product detail
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/low-stock` - Get products di bawah reorder point

### Orders
- `GET /api/orders` - List orders dengan filter
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order detail
- `PUT /api/orders/:id` - Update order status
- `DELETE /api/orders/:id` - Cancel order
- `POST /api/orders/:id/generate-invoice` - Generate invoice

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer detail
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier detail
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice detail
- `PUT /api/invoices/:id/mark-paid` - Mark invoice as paid
- `GET /api/invoices/:id/pdf` - Generate PDF invoice

## 📊 Dashboard Features

- **Sales Overview** - Total penjualan, order count, revenue trend
- **Inventory Status** - Stock levels, low stock alerts, reorder recommendations
- **Financial Summary** - Revenue, profit, outstanding invoices
- **Top Products** - Best selling products by revenue
- **Customer Performance** - Top customers, credit usage
- **Order Status** - Processing, completed, pending orders

## 🔄 Multi-Tenant Support

Aplikasi mendukung multi-tenant architecture dengan isolation per tenant:

- Separate database strategy untuk data isolation
- Tenant context di setiap request
- Automatic filtering berdasarkan tenant_id
- Tenant-specific API keys dan webhooks

## 📱 Responsive Design

Frontend didesain mobile-first dengan Tailwind CSS:
- Responsive tables dengan horizontal scroll
- Mobile-friendly navigation
- Touch-optimized forms
- Adaptive layout untuk semua ukuran layar

## 🧮 Kalkulasi Bisnis

### Profit Margin
```
Profit = Price - Cost
Margin % = (Profit / Price) × 100
```

### Tax Calculation
```
Tax Amount = (Total × Tax Rate) / 100
Final Amount = Total - Discount + Tax
```

### Inventory Value
```
Inventory Value = Sum(Stock × Cost) per product
```

## 🚨 Validasi & Error Handling

- Input validation menggunakan Zod schemas
- Comprehensive error responses dengan status codes
- Logging untuk audit trail
- Database transaction rollback untuk data integrity

## 📝 Sample Data

Aplikasi menyediakan seed data berisi:
- 3 produk dari berbagai kategori
- 2 pesanan dengan status berbeda
- 2 pelanggan enterprise
- 2 supplier dengan rating
- 2 faktur dengan payment status berbeda

## 🔄 Changelog

### v1.0.0 (2026-07-28)
- Initial release
- Core CRUD operations
- Order processing workflow
- Invoice management
- Inventory tracking
- Basic dashboard

## 📞 Support

Untuk issues atau pertanyaan:
1. Check documentation di `/docs`
2. Review API error responses
3. Check application logs
4. Contact development team

## 📄 License

Proprietary - Toko Enterprise

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-28  
**Maintainer**: Enterprise Development Team