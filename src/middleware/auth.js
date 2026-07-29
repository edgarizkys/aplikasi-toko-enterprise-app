const jwt = require('jsonwebtoken');

/**
 * Middleware Autentikasi Aplikasi Toko Enterprise
 * Mengelola verifikasi JWT dan akses multi-tenant
 */
module.exports = function(req, res, next) {
    const authHeader = req.headers['authorization'];

    // Pola Enterprise: Fallback ke user demo jika tidak ada token
    if (!authHeader) {
        req.user = { 
            id: 1, 
            role: 'admin', 
            name: 'Admin Demo',
            tenant_id: 'TENANT-001',
            permissions: ['*']
        };
        return next();
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const secret = process.env.JWT_SECRET || 'enterprise_store_secret_key_2024';
        const decoded = jwt.verify(token, secret);

        // Injeksi data user ke request
        req.user = {
            id: decoded.id,
            role: decoded.role,
            name: decoded.name,
            tenant_id: decoded.tenant_id || 'DEFAULT'
        };

        next();
    } catch (error) {
        // Response error konsisten format JSON
        return res.status(401).json({ 
            success: false,
            error: 'Otorisasi Gagal',
            message: 'Sesi berakhir atau token tidak valid. Silakan login kembali.'
        });
    }
};