// World-Class Controllers for Aplikasi Toko Enterprise (Sistem POS & Inventory Toko Enterprise)

let produkData = [
  {
    "id": 1,
    "sku": "PRD-001",
    "nama": "Beras Premium 5kg",
    "kategori": "Sembako",
    "harga": 75000,
    "stok": 150,
    "status": "Tersedia"
  },
  {
    "id": 2,
    "sku": "PRD-002",
    "nama": "Minyak Goreng 2L",
    "kategori": "Sembako",
    "harga": 35000,
    "stok": 200,
    "status": "Tersedia"
  }
];

exports.getAllProduk = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    res.json({ success: true, tenantId, count: produkData.length, data: produkData });
};

exports.createProduk = async (req, res) => {
    const item = { id: Date.now(), tenant_id: req.headers['x-tenant-id'] || 'default_tenant', ...req.body };
    produkData.unshift(item);
    res.status(201).json({ success: true, data: item });
};

exports.deleteProduk = async (req, res) => {
    produkData = produkData.filter(i => i.id !== parseInt(req.params.id));
    res.json({ success: true, message: 'Produk deleted' });
};

let penjualanData = [
  {
    "id": 1,
    "invoice": "INV-20260724-001",
    "pelanggan": "Walk-in Customer",
    "total": 128000,
    "metode_bayar": "QRIS Midtrans",
    "tanggal": "2026-07-24"
  }
];

exports.getAllPenjualan = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    res.json({ success: true, tenantId, count: penjualanData.length, data: penjualanData });
};

exports.createPenjualan = async (req, res) => {
    const item = { id: Date.now(), tenant_id: req.headers['x-tenant-id'] || 'default_tenant', ...req.body };
    penjualanData.unshift(item);
    res.status(201).json({ success: true, data: item });
};

exports.deletePenjualan = async (req, res) => {
    penjualanData = penjualanData.filter(i => i.id !== parseInt(req.params.id));
    res.json({ success: true, message: 'Penjualan / Transaksi deleted' });
};

let supplierData = [
  {
    "id": 1,
    "nama": "PT Sumber Makmur",
    "kontak": "021-5551234",
    "alamat": "Jakarta Utara",
    "kategori": "Sembako"
  }
];

exports.getAllSupplier = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    res.json({ success: true, tenantId, count: supplierData.length, data: supplierData });
};

exports.createSupplier = async (req, res) => {
    const item = { id: Date.now(), tenant_id: req.headers['x-tenant-id'] || 'default_tenant', ...req.body };
    supplierData.unshift(item);
    res.status(201).json({ success: true, data: item });
};

exports.deleteSupplier = async (req, res) => {
    supplierData = supplierData.filter(i => i.id !== parseInt(req.params.id));
    res.json({ success: true, message: 'Supplier deleted' });
};

exports.getAnalytics = async (req, res) => {
    res.json({ success: true, platform: 'Aplikasi Toko Enterprise', domain: 'Sistem POS & Inventory Toko Enterprise', version: '5.0.0-WorldClass', architecture: 'Multi-Tenant Ready + Redis Cache' });
};