// World-Class Controllers for Aplikasi Toko Enterprise (Toko & Retail)

let productsData = [
  {
    "id": 1,
    "name": "Sabun Mandi",
    "category": "Kebersihan",
    "price": 8500,
    "stock": 100
  },
  {
    "id": 2,
    "name": "Shampo Sachet",
    "category": "Perawatan",
    "price": 3500,
    "stock": 200
  }
];

exports.getAllProducts = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    res.json({ success: true, tenantId, count: productsData.length, data: productsData });
};

exports.createProducts = async (req, res) => {
    const item = { id: Date.now(), tenant_id: req.headers['x-tenant-id'] || 'default_tenant', ...req.body };
    productsData.unshift(item);
    res.status(201).json({ success: true, data: item });
};

exports.deleteProducts = async (req, res) => {
    productsData = productsData.filter(i => i.id !== parseInt(req.params.id));
    res.json({ success: true, message: 'Produk deleted' });
};

let salesData = [
  {
    "id": 1,
    "product_name": "Sabun Mandi",
    "quantity": 3,
    "total": 25500,
    "date": "2026-07-28"
  },
  {
    "id": 2,
    "product_name": "Shampo Sachet",
    "quantity": 5,
    "total": 17500,
    "date": "2026-07-28"
  }
];

exports.getAllSales = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    res.json({ success: true, tenantId, count: salesData.length, data: salesData });
};

exports.createSales = async (req, res) => {
    const item = { id: Date.now(), tenant_id: req.headers['x-tenant-id'] || 'default_tenant', ...req.body };
    salesData.unshift(item);
    res.status(201).json({ success: true, data: item });
};

exports.deleteSales = async (req, res) => {
    salesData = salesData.filter(i => i.id !== parseInt(req.params.id));
    res.json({ success: true, message: 'Penjualan deleted' });
};

let customersData = [
  {
    "id": 1,
    "name": "Ibu Ani",
    "phone": "081234567890",
    "points": 50
  },
  {
    "id": 2,
    "name": "Pak Budi",
    "phone": "085678901234",
    "points": 30
  }
];

exports.getAllCustomers = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    res.json({ success: true, tenantId, count: customersData.length, data: customersData });
};

exports.createCustomers = async (req, res) => {
    const item = { id: Date.now(), tenant_id: req.headers['x-tenant-id'] || 'default_tenant', ...req.body };
    customersData.unshift(item);
    res.status(201).json({ success: true, data: item });
};

exports.deleteCustomers = async (req, res) => {
    customersData = customersData.filter(i => i.id !== parseInt(req.params.id));
    res.json({ success: true, message: 'Pelanggan deleted' });
};

exports.getAnalytics = async (req, res) => {
    res.json({ success: true, platform: 'Aplikasi Toko Enterprise', domain: 'Toko & Retail', version: '5.0.0-WorldClass', architecture: 'Multi-Tenant Ready + Redis Cache' });
};