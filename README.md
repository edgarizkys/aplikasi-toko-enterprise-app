# Aplikasi Toko Enterprise

Sistem manajemen toko skala enterprise. Fitur: inventaris, analitik penjualan, manajemen pemasok, penggajian karyawan, faktur otomatis.

## Stack
- Backend: Express.js
- Database: Turso SQLite
- Frontend: Tailwind CSS
- Pattern: Enterprise Domain Analysis (EDGAR v6.0)

## Fitur Utama
- **Kontrol Inventaris**: Lacak SKU, stok, kategori produk.
- **Analitik Penjualan**: Dashboard real-time untuk data pesanan.
- **Manajemen Pemasok**: Database kontak dan kategori suplai.
- **Payroll**: Sistem gaji karyawan per departemen.
- **Faktur**: Generate nomor pesanan otomatis.

## Instalasi
1. Clone repo.
2. `npm install`.
3. Set `TURSO_DB_URL` dan `TURSO_AUTH_TOKEN` di `.env`.
4. `npm run dev`.

## Struktur Data
- `products`: sku, name, category, price, stock
- `orders`: order_no, customer, total, status, date
- `suppliers`: name, contact, email, category
- `employees`: name, role, department, salary

## Lisensi
Proprietary - Enterprise Use Only.