# Aplikasi Toko Enterprise 🛒

Retail management system. Track stock, sales, and customer loyalty.

## 🚀 Tech Stack
- **Backend**: Express.js
- **Database**: Turso (LibSQL/SQLite)
- **Frontend**: Tailwind CSS
- **Colors**: `#0EA5E9` → `#6366F1`

## ✨ Features
- **Produk Management**: CRUD produk, kategori, harga.
- **Stok Control**: Pantau stok real-time, alert stok rendah.
- **Sales Tracking**: Catat transaksi, hitung total otomatis.
- **Customer Points**: Sistem loyalitas poin pelanggan.
- **Laporan Penjualan**: Rekap pendapatan per periode.
- **Barcode**: Integrasi scan barcode produk.

## 🛠️ Installation

1. **Clone repo**
   ```bash
   git clone <repo-url>
   cd aplikasi-toko-enterprise
   ```

2. **Install deps**
   ```bash
   npm install
   ```

3. **Env setup**
   Create `.env` file:
   ```env
   TURSO_DATABASE_URL=libsql://your-db-url.turso.io
   TURSO_AUTH_TOKEN=your-auth-token
   PORT=3000
   ```

4. **Run app**
   ```bash
   npm start
   ```

## 📊 Database Schema

### `products`
| Field | Type | Desc |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `name` | TEXT | Nama Produk |
| `category` | TEXT | Kategori |
| `price` | NUMBER | Harga Jual |
| `stock` | NUMBER | Jumlah Stok |

### `sales`
| Field | Type | Desc |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `product_name` | TEXT | Nama Produk |
| `quantity` | NUMBER | Jumlah Beli |
| `total` | NUMBER | Total Harga |
| `date` | DATE | Tanggal Transaksi |

### `customers`
| Field | Type | Desc |
| :--- | :--- | :--- |
| `id` | INTEGER | PK |
| `name` | TEXT | Nama Pelanggan |
| `phone` | TEXT | No Telepon |
| `points` | NUMBER | Poin Loyalitas |

## 🛡️ Security & Patterns
- **Multi-tenant**: Data isolated by `tenant_id`.
- **Pagination**: API use `limit` and `offset`.
- **Error Handling**: Global middleware for 404/500.
- **Validation**: Input sanitization on all endpoints.