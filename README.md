# Aplikasi Toko Enterprise

Sistem manajemen toko retail modern dengan fitur produk, stok, penjualan, dan loyalitas pelanggan.

## Teknologi

- **Backend**: Node.js + Express.js + Prisma ORM + PostgreSQL
- **Frontend**: Next.js 14 + React Server Components + Tailwind CSS
- **Auth**: JWT (access + refresh tokens) + bcryptjs + RBAC
- **Validation**: Zod schemas
- **Database**: PostgreSQL dengan soft delete dan multi-tenancy

## Fitur Utama

- ✅ Manajemen Produk (CRUD, kategori, harga, stok)
- ✅ Kontrol Stok (tracking real-time, penyesuaian)
- ✅ Pencatatan Penjualan (invoice, receipt, laporan)
- ✅ Sistem Poin Pelanggan (loyalty program)
- ✅ Laporan Penjualan (daily, monthly, analytics)
- ✅ Barcode Support (generate, scan)
- ✅ Multi-tenant (support multiple toko)
- ✅ RBAC (admin, kasir, stok, manajer)

## Struktur Direktori

```
aplikasi-toko-enterprise/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── schemas/
│   │   ├── utils/
│   │   ├── errors/
│   │   ├── types/
│   │   ├── config/
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── middleware.ts
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Instalasi

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm atau yarn

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env dengan konfigurasi database
npm install
npx prisma migrate dev
npm run dev
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local dengan API URL
npm install
npm run dev
```

Buka http://localhost:3000

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/toko_enterprise
JWT_ACCESS_SECRET=your_access_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_here_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=10
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Aplikasi Toko Enterprise
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrasi tenant
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Produk
- `GET /api/products` - List produk
- `POST /api/products` - Buat produk
- `GET /api/products/:id` - Detail produk
- `PUT /api/products/:id` - Update produk
- `DELETE /api/products/:id` - Hapus produk

### Penjualan
- `GET /api/sales` - List penjualan
- `POST /api/sales` - Buat penjualan
- `GET /api/sales/:id` - Detail penjualan
- `GET /api/sales/report/daily` - Laporan harian
- `GET /api/sales/report/monthly` - Laporan bulanan

### Pelanggan
- `GET /api/customers` - List pelanggan
- `POST /api/customers` - Buat pelanggan
- `GET /api/customers/:id` - Detail pelanggan
- `PUT /api/customers/:id/points` - Update poin

### Stok
- `GET /api/stock/summary` - Ringkasan stok
- `POST /api/stock/adjust` - Penyesuaian stok
- `GET /api/stock/history` - Riwayat perubahan

## Skema Database

### Entities

**Products** (Produk)
- id, tenantId, name, category, price, stock, barcode, createdAt, updatedAt, deletedAt

**Sales** (Penjualan)
- id, tenantId, productId, customerId, quantity, total, date, notes, createdAt, updatedAt, deletedAt

**Customers** (Pelanggan)
- id, tenantId, name, phone, points, createdAt, updatedAt, deletedAt

**Users** (Pengguna)
- id, tenantId, email, password, role, name, status, createdAt, updatedAt, deletedAt

**StockAdjustments**
- id, tenantId, productId, quantity, type (in/out), reason, createdAt

## Authentication & Authorization

### Roles
- `admin` - Full akses
- `manager` - Manajemen produk, laporan
- `cashier` - Input penjualan, pelanggan
- `stock` - Manajemen stok

### Token Flow
1. Login → access token (15m) + refresh token (7d)
2. Request → Include `Authorization: Bearer <access_token>`
3. Expired → Use refresh token untuk akses token baru
4. Logout → Clear refresh token

## Response Format

### Success
```json
{
  "success": true,
  "data": {...},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validasi gagal"
  }
}
```

## Development

### Running Tests
```bash
npm run test
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

## Production Deployment

### Backend
```bash
npm run build
npm start
# atau gunakan PM2: pm2 start dist/index.js
```

### Frontend
```bash
npm run build
npm start
```

## Data Sample

### Produk
```json
{
  "name": "Sabun Mandi",
  "category": "Kebersihan",
  "price": 8500,
  "stock": 100,
  "barcode": "8501001"
}
```

### Penjualan
```json
{
  "productName": "Sabun Mandi",
  "quantity": 3,
  "total": 25500,
  "date": "2026-07-28"
}
```

### Pelanggan
```json
{
  "name": "Ibu Ani",
  "phone": "081234567890",
  "points": 50
}
```

## Warna & Branding

- Primary: `#0EA5E9` (Sky Blue)
- Secondary: `#6366F1` (Indigo)
- Success: `#10B981`
- Warning: `#F59E0B`
- Danger: `#EF4444`

## Support & Dokumentasi

Dokumentasi lengkap tersedia di folder `/docs`

## Lisensi

Proprietary - Hak cipta 2026